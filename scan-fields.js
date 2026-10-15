const clean = value => value?.trim().replace(/^[|:;_\s]+|[|_\s]+$/g, '') || '';

function labelValue(text, labels) {
  const pattern = new RegExp(`(?:^|\\n|\\s{2,})(?:${labels})\\s*[:;]\\s*([^\\n]+)`, 'im');
  const found = text.match(pattern)?.[1];
  return clean(found?.split(/\s+(?:Number|Phone|City|Email|Notes|Address|Price|Style|Color)\s*[:;]/i)[0]);
}
function quantity(text, labels) {
  const value = text.match(new RegExp(`(?:${labels})\\s*[:;]?\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'))?.[1];
  return value ? Number(value.replace(/,/g, '')) : '';
}
function parseDate(text) {
  const found = text.match(/(?:Date\s*[:;]?\s*)?(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/i);
  if (!found) return '';
  const year = found[3].length === 2 ? 2000 + Number(found[3]) : Number(found[3]);
  const month = Number(found[1]), day = Number(found[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function parseEstimateText(text) {
  const priceMatches = [...text.matchAll(/(?:Total\s*Price|Total\s*\$|Totals?|Price)\s*[:;$]?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/gi)];
  const price = priceMatches.at(-1)?.[1];
  const style = text.match(/Style\s*[:;]?\s*([56])\s*(?:["'”]?\s*K(?:[- ]?style)?|K\s*gutter)/i)?.[1];
  const downspout = text.match(/(?:D\.?\s*S\.?|downspout)\s*[:;]?\s*(?:corr?\.?\s*)?([23])\s*[x×]\s*([34])/i);
  const roof = text.match(/(?:Roof(?:\s*Pitch)?)\s*[:;]?\s*(\d{1,2}\s*\/\s*12)/i)?.[1];
  const color = labelValue(text, 'Gutter\\s*Color|Color');
  const result = {
    customer: labelValue(text, 'Name|Customer|Project'),
    address: labelValue(text, 'Address'),
    city: labelValue(text, 'City'),
    phone: labelValue(text, 'Number|Phone'),
    email: labelValue(text, 'Email'),
    value: price ? Number(price.replace(/,/g, '')) : '',
    gutterFt: quantity(text, 'Total\\s*Gutters|Gutter\\s*Ft|Gutter\\s*Footage'),
    downspoutFt: quantity(text, 'Total\\s*D\\.?\\s*S\\.?|D\\.?\\s*S\\.?\\s*Ft|Downspout\\s*Ft'),
    cuts: quantity(text, '\\bCuts'),
    elbows: '',
    type: style ? `${style}" K-style` : '',
    color: /white/i.test(color) ? 'White' : '',
    ds: downspout ? `ds-${downspout[1]}${downspout[2]}` : '',
    roofPitch: clean(roof),
    date: parseDate(text),
    tearOff: '',
    notes: labelValue(text, 'Notes'),
  };
  const detected = Object.entries(result).filter(([, value]) => value !== '').map(([key]) => key);
  return { fields: result, detected };
}
