import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicFiles = new Set(['index.html', 'styles.css', 'theme.css', 'app.js', 'domain.js', 'seed.js', 'scanner.js', 'scan-fields.js']);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.gz': 'application/gzip' };
const vendorRoots = {
  tesseract: resolve(root, 'node_modules', 'tesseract.js', 'dist'),
  'tesseract-core': resolve(root, 'node_modules', 'tesseract.js-core'),
  'tesseract-eng': resolve(root, 'node_modules', '@tesseract.js-data', 'eng'),
  pdfjs: resolve(root, 'node_modules', 'pdfjs-dist'),
};
const port = Number(process.env.PORT || 3000);
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    let path = resolve(root, name);
    let allowed = publicFiles.has(name) && path.startsWith(root + sep);
    const vendor = /^vendor\/([^/]+)\/(.+)$/.exec(name);
    if (vendor && vendorRoots[vendor[1]]) {
      const vendorRoot = vendorRoots[vendor[1]];
      path = resolve(vendorRoot, vendor[2]);
      allowed = path.startsWith(vendorRoot + sep) && /^[\w/.-]+$/.test(vendor[2]) &&
        ['.js', '.mjs', '.wasm', '.gz', '.bcmap'].includes(extname(path));
    }
    if (!allowed) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const content = await readFile(path);
    res.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': vendor ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(content);
  } catch (error) {
    console.error('Request failed:', error.message);
    res.writeHead(500); res.end('Unable to serve this request.');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT to an available port and try again.` : `Server failed: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Great Northwest Gutters: http://localhost:${port}`));
