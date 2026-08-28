import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'dist');
const TMP = join(process.env.TEMP ?? '/tmp', 'kwt-ghp');
const OWNER_REPO = 'kingwatam/kingwatam.github.io';
const LIVE = 'https://kingwatam.github.io/';

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString().trim();
}
function stage(label, fn) {
  const t0 = Date.now();
  const out = fn();
  console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);
  return out;
}

const T0 = Date.now();

stage('astro build', () => sh('npm run build', { cwd: REPO }));

stage('fresh gh-pages clone', () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  sh(`git clone --quiet "${REPO}" "${TMP}"`);
  sh('git checkout --quiet -B gh-pages', { cwd: TMP });
});

stage('sync dist over gh-pages tree', () => {
  for (const e of readdirSync(TMP, { withFileTypes: true })) {
    if (e.name !== '.git') rmSync(join(TMP, e.name), { recursive: true, force: true });
  }
  cpSync(DIST, TMP, { recursive: true });
});

stage('commit', () => {
  sh('git add -A', { cwd: TMP });
  sh('git commit --quiet -m "deploy: site build"', { cwd: TMP });
});

stage('push to github', () => {
  try { sh('git remote add deploy https://github.com/' + OWNER_REPO + '.git', { cwd: TMP }); } catch {}
  sh('git push deploy gh-pages --force', { cwd: TMP });
});

const pushedAt = Date.now();
try { sh(`gh api -X POST repos/${OWNER_REPO}/pages/builds`, { cwd: REPO }); } catch {}

process.stdout.write('waiting for github pages build');
let status = '';
for (let waited = 0; waited <= 240_000; waited += 10_000) {
  await new Promise(r => setTimeout(r, 10_000));
  try {
    const b = JSON.parse(sh(`gh api repos/${OWNER_REPO}/pages/builds/latest`, { cwd: REPO }));
    const isNew = new Date(b.created_at).getTime() >= pushedAt - 5000;
    status = isNew ? b.status : `stale(${b.status})`;
    process.stdout.write(` ${waited / 1000 + 10}s:${status}`);
    if (isNew && b.status === 'built') break;
    if (isNew && ['errored', 'build_failed'].includes(b.status)) {
      throw new Error('pages build failed: ' + (b.error?.message ?? 'unknown'));
    }
  } catch (e) {
    if (String(e).includes('pages build failed')) throw e;
    process.stdout.write(' .');
  }
}
console.log('');

if (status !== 'built') throw new Error(`timed out waiting for pages build (last: ${status})`);

const res = await fetch(LIVE);
if (!res.ok) throw new Error(`live check failed: HTTP ${res.status}`);
const html = await res.text();
if (!html.includes('King Wa Tam')) throw new Error('live page missing expected content');

// Best-effort IndexNow ping (Bing/Yandex/Seznam) for faster re-indexing
try {
  const key = (await fetch(new URL('/8f4a2c91e7d30b56a1c84f92d6e0173b.txt', LIVE).href)).ok
    ? '8f4a2c91e7d30b56a1c84f92d6e0173b'
    : null;
  if (key) {
    const ping = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'kingwatam.github.io',
        key,
        keyLocation: new URL('/8f4a2c91e7d30b56a1c84f92d6e0173b.txt', LIVE).href,
        urlList: [LIVE, `${LIVE}publications/`, `${LIVE}certificates/`],
      }),
    });
    console.log(`[indexnow] HTTP ${ping.status}`);
  }
} catch {}

console.log(`[total ${(Date.now() - T0) / 1000}s] deployed -> ${LIVE} (HTTP ${res.status}, content verified)`);
