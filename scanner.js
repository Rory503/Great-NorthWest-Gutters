export { parseEstimateText } from './scan-fields.js';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 5;
const aborted = signal => {
  if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
};
export function validateScanFile(file) {
  if (!file || file.size === 0) throw new Error('Choose a nonempty image or PDF.');
  if (file.size > MAX_BYTES) throw new Error('The scan is too large. Choose a file smaller than 20 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) throw new Error('Supported formats: PNG, JPEG, WebP, and PDF.');
}
async function imageCanvas(file) {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 60_000_000) throw new Error('The image resolution is too large. Resize it below 60 megapixels.');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { bitmap.close(); }
}
const asBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to prepare a preview.')), 'image/png'));
export async function scanDocument(file, onProgress, signal) {
  validateScanFile(file); aborted(signal);
  const canvases = [];
  const embeddedText = [];
  let pdf;
  let loadingTask;
  let worker;
  let workerTerminated = false;
  const cancel = () => {
    if (worker) { workerTerminated = true; worker.terminate(); }
    if (loadingTask) loadingTask.destroy();
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    onProgress('Preparing document', 0);
    if (file.type === 'application/pdf') {
      const pdfjs = await import('/vendor/pdfjs/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.mjs';
      aborted(signal);
      loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true });
      pdf = await loadingTask.promise;
      if (pdf.numPages > MAX_PAGES) throw new Error(`This PDF has ${pdf.numPages} pages. Split it into documents of ${MAX_PAGES} pages or fewer.`);
      for (let i = 1; i <= pdf.numPages; i++) {
        aborted(signal); onProgress(`Preparing PDF page ${i} of ${pdf.numPages}`, i / pdf.numPages * .1);
        const page = await pdf.getPage(i);
        const raw = await page.getTextContent();
        const text = raw.items.map(item => `${item.str}${item.hasEOL ? '\n' : ' '}`).join('');
        embeddedText.push(text.trim().length > 80 ? text : '');
        const initial = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2.5, 2400 / Math.max(initial.width, initial.height)) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        canvases.push(canvas);
      }
    } else {
      canvases.push(await imageCanvas(file)); embeddedText.push('');
    }
    aborted(signal);
    const textParts = []; const confidenceValues = [];
    if (embeddedText.some(text => !text)) {
      onProgress('Starting local text recognition', .12);
      const { default: Tesseract } = await import('/vendor/tesseract/tesseract.esm.min.js');
      aborted(signal);
      worker = await Tesseract.createWorker('eng', 1, {
        workerPath: '/vendor/tesseract/worker.min.js',
        corePath: '/vendor/tesseract-core',
        langPath: '/vendor/tesseract-eng/4.0.0',
        workerBlobURL: false,
        logger: message => {
          if (!signal.aborted) onProgress(message.status === 'recognizing text' ? 'Reading the sheet on your device' : 'Loading local OCR engine', .12 + (message.progress || 0) * .7);
        },
      });
      aborted(signal);
    }
    for (let i = 0; i < canvases.length; i++) {
      aborted(signal);
      if (embeddedText[i]) textParts.push(embeddedText[i]);
      else {
        onProgress(`Reading page ${i + 1} of ${canvases.length}`, .15 + i / canvases.length * .7);
        const result = await worker.recognize(canvases[i]);
        aborted(signal);
        textParts.push(result.data.text); confidenceValues.push(result.data.confidence);
      }
    }
    const previews = await Promise.all(canvases.map(asBlob));
    aborted(signal); onProgress('Ready for your review', 1);
    return {
      text: textParts.join('\n\n--- NEXT PAGE ---\n\n'),
      confidence: confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : null,
      previews, pages: canvases.length,
    };
  } catch (error) {
    if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
    if (worker && !workerTerminated) await worker.terminate();
    if (loadingTask && !signal.aborted) await loadingTask.destroy();
  }
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gnw-scan-sources', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sources', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Scan storage is unavailable: ${request.error?.message}`));
    request.onblocked = () => reject(new Error('Scan storage is blocked by another open tab. Close other dashboard tabs and retry.'));
  });
}
async function sourceTransaction(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('sources', mode);
      const request = operation(transaction.objectStore('sources'));
      let result;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(new Error(`Unable to save or read the scan: ${transaction.error?.message || request.error?.message}`));
      transaction.onabort = () => reject(new Error('Scan storage transaction was cancelled.'));
    });
  } finally { db.close(); }
}
export const saveScanSource = source => sourceTransaction('readwrite', store => store.add(source));
export const getScanSource = id => sourceTransaction('readonly', store => store.get(id));
export const deleteScanSource = id => sourceTransaction('readwrite', store => store.delete(id));
export const clearScanSources = () => sourceTransaction('readwrite', store => store.clear());
