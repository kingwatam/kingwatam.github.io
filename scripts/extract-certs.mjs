import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const dir = process.argv[2];
const out = {};
for (const f of readdirSync(dir)) {
  if (!f.toLowerCase().endsWith('.pdf')) continue;
  try {
    const d = await pdf(readFileSync(`${dir}/${f}`));
    out[f] = d.text.replace(/\s+/g, ' ').slice(0, 600);
  } catch (e) {
    out[f] = 'ERROR: ' + e.message;
  }
}
writeFileSync(new URL('./cert-text.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('Extracted', Object.keys(out).length, 'PDFs');
