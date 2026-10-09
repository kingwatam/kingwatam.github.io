import { readdirSync, renameSync } from 'fs';

const dir = process.argv[2];

function slugify(name) {
  return name
    .replace(/#/g, 'sharp')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[']/g, '')
    .replace(/&/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

for (const f of readdirSync(dir)) {
  if (!f.toLowerCase().endsWith('.pdf')) continue;
  const target = `${slugify(f.replace(/\.pdf$/i, ''))}.pdf`;
  if (f !== target) {
    renameSync(`${dir}/${f}`, `${dir}/${target}`);
  }
  console.log(target);
}
