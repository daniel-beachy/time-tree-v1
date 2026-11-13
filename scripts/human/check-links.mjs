// Re-tests every source: does the link still open, and does each DOI lead to the paper the citation names?
//   node scripts/human/check-links.mjs            all sources, image pages and "learn more" links
//   node scripts/human/check-links.mjs --dois     DOIs only (fast, and never blocked)
// Prints a summary, writes the full result to scripts/human/.cache/link-check.json, and exits 1 if anything is dead or mismatched.
// "blocked" means the site refuses automated visits (many museums and encyclopedias do): a person or a browser must look.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'content/human');
const CACHE = join(ROOT, 'scripts/human/.cache');
const DOIS_ONLY = process.argv.includes('--dois');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; source-link-check)' };
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").toLowerCase();

async function get(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  try { return await fetch(url, { headers: UA, signal: ctl.signal, ...opts }); } finally { clearTimeout(t); }
}

/** Crossref knows most journal DOIs: compare its record with our citation. */
async function checkDoi(src, doi) {
  let res;
  try { res = await get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`); } catch (e) { return { state: 'error', detail: String(e.cause?.code ?? e.name) }; }
  if (res.status === 404) {
    // Not a Crossref DOI (a dataset or a book from another registry): it is enough that doi.org knows where to send it.
    try { const r = await get(`https://doi.org/${doi}`, { redirect: 'manual' }); return r.status >= 300 && r.status < 400 ? { state: 'ok', detail: 'resolves (not in Crossref)' } : { state: 'dead', detail: `doi.org ${r.status}` }; }
    catch (e) { return { state: 'error', detail: String(e.cause?.code ?? e.name) }; }
  }
  if (!res.ok) return { state: 'error', detail: `Crossref ${res.status}` };
  const m = (await res.json()).message;
  const cite = fold(src.citation), problems = [];
  const family = m.author?.[0]?.family;
  if (family && !cite.includes(fold(family))) problems.push(`first author is ${family}`);
  const years = [m.issued, m.published, m['published-print'], m['published-online']].map((d) => d?.['date-parts']?.[0]?.[0]).filter(Boolean);
  if (years.length && !years.some((y) => cite.includes(String(y)))) problems.push(`year is ${[...new Set(years)].join(' or ')}`);
  const title = fold(m.title?.[0] ?? '').replace(/<[^>]+>/g, '');
  const tw = title.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  if (tw.length && tw.filter((w) => cite.includes(w)).length / tw.length < 0.6) problems.push(`title is "${m.title[0]}"`);
  return problems.length ? { state: 'mismatch', detail: problems.join('; ') } : { state: 'ok', detail: 'matches Crossref' };
}

async function checkUrl(url) {
  try {
    const res = await get(url);
    if (res.ok) return { state: 'ok', detail: String(res.status) };
    if ([401, 403, 405, 406, 429].includes(res.status)) return { state: 'blocked', detail: String(res.status) };
    if ([404, 410].includes(res.status)) return { state: 'dead', detail: String(res.status) };
    return { state: 'error', detail: String(res.status) };
  } catch (e) {
    const code = String(e.cause?.code ?? e.name);
    return { state: code === 'ENOTFOUND' ? 'dead' : 'error', detail: code };
  }
}

// What to test: every source, and (unless --dois) the pages images came from and the "learn more" links.
const jobs = [];
for (const s of readJson(join(SRC, 'sources.json'))) {
  const doi = /^https:\/\/doi\.org\/(.+)$/.exec(s.url)?.[1];
  if (doi) jobs.push({ what: `source ${s.id}`, url: s.url, run: () => checkDoi(s, decodeURIComponent(doi)) });
  else if (!DOIS_ONLY) jobs.push({ what: `source ${s.id}`, url: s.url, run: () => checkUrl(s.url) });
}
if (!DOIS_ONLY) {
  for (const f of readdirSync(join(SRC, 'stops'))) for (const st of readJson(join(SRC, 'stops', f))) {
    if (st.image?.sourceUrl) jobs.push({ what: `image page of ${st.id}`, url: st.image.sourceUrl, run: () => checkUrl(st.image.sourceUrl) });
    for (const l of st.links ?? []) jobs.push({ what: `link in ${st.id}`, url: l.url, run: () => checkUrl(l.url) });
  }
}

// A few at a time, and never two at once to the same site.
const results = [];
const busy = new Set();
let next = 0;
async function worker() {
  for (;;) {
    const i = jobs.findIndex((j, k) => k >= next && !j.taken && !busy.has(new URL(j.url).host));
    if (i < 0) { if (jobs.every((j) => j.taken)) return; await new Promise((r) => setTimeout(r, 150)); continue; }
    const j = jobs[i]; j.taken = true; while (jobs[next]?.taken) next++;
    const host = new URL(j.url).host;
    busy.add(host);
    results.push({ what: j.what, url: j.url, ...(await j.run()) });
    if (results.length % 40 === 0) console.error(`  ${results.length} of ${jobs.length}…`);
    await new Promise((r) => setTimeout(r, 120));
    busy.delete(host);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

const by = (state) => results.filter((r) => r.state === state);
console.log(`Checked ${results.length} links: ${by('ok').length} fine, ${by('blocked').length} blocked to scripts, ${by('mismatch').length} mismatched, ${by('dead').length} dead, ${by('error').length} errors`);
for (const state of ['mismatch', 'dead', 'error', 'blocked']) {
  if (!by(state).length) continue;
  console.log(`\n${state.toUpperCase()}`);
  for (const r of by(state).sort((a, b) => a.what.localeCompare(b.what))) console.log(`  ${r.what}: ${r.detail}\n    ${r.url}`);
}
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'link-check.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), results }, null, 1));
process.exit(by('mismatch').length || by('dead').length ? 1 : 0);
