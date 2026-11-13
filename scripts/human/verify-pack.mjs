// Prints what a fact-checker needs for one chapter, and nothing else: each stop's words, its fingerprint, and its sources.
//   node scripts/human/verify-pack.mjs <chapter-id>            the whole chapter
//   node scripts/human/verify-pack.mjs <chapter-id> <stop-id>  one stop
//   node scripts/human/verify-pack.mjs --status                which stops are checked, stale or open
// The checker writes its findings to content/human/checks/<chapter-id>.json. See docs/PLAN.md, "Fact-check pass".
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepText, recordProblems, stopHash } from './lib-check.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../../content/human');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const chapters = readJson(join(SRC, 'chapters.json'));
const sources = new Map(readJson(join(SRC, 'sources.json')).map((s) => [s.id, s]));
const stopsOf = (c) => { const f = join(SRC, 'stops', `${String(c.n).padStart(2, '0')}-${c.id}.json`); return existsSync(f) ? readJson(f) : []; };
const recordsOf = (c) => { const f = join(SRC, 'checks', `${c.id}.json`); return existsSync(f) ? readJson(f).stops ?? {} : {}; };

const [arg, only] = process.argv.slice(2);
if (arg === '--status') {
  for (const c of chapters) {
    const stops = stopsOf(c), recs = recordsOf(c);
    let ok = 0; const stale = [], flagged = [];
    for (const s of stops) {
      const r = recs[s.id], deep = deepText(SRC, s);
      if (s.checked && !recordProblems(s, deep, r).length) ok++;
      else if (r && r.hash !== stopHash(s, deep)) stale.push(s.id);
      else if (r && (r.claims ?? []).some((x) => x.verdict !== 'supported')) flagged.push(s.id);
    }
    console.log(`${c.n}. ${c.id}: ${ok}/${stops.length} checked` + (stale.length ? `; text changed since check: ${stale.join(', ')}` : '') + (flagged.length ? `; flagged: ${flagged.join(', ')}` : ''));
  }
  process.exit(0);
}
const chapter = chapters.find((c) => c.id === arg);
if (!chapter) { console.error(`Usage: verify-pack.mjs <chapter-id> [stop-id] | --status\nChapters: ${chapters.map((c) => c.id).join(', ')}`); process.exit(1); }

const out = [`# Fact-check packet: chapter ${chapter.n}, ${chapter.title}`, '', `Chapter intro (check it too, against the stops' sources): ${chapter.intro}`, ''];
for (const s of stopsOf(chapter).filter((x) => !only || x.id === only)) {
  const deep = deepText(SRC, s);
  out.push(`## ${s.id}`, '', `- hash: ${stopHash(s, deep)}`, `- title: ${s.title}`, `- dates shown: ${s.year}${s.yearEnd != null ? ` to ${s.yearEnd}` : ''} (${s.precision}; negative is BCE)`, `- confidence: ${s.confidence}`);
  if (s.place) out.push(`- place: ${s.place.name} (${s.place.lat}, ${s.place.lon})`);
  out.push('', '**Blurb.** ' + s.blurb, '');
  if (s.dateNote) out.push('**Date note.** ' + s.dateNote, '');
  if (s.debate) out.push("**What's in question.** " + s.debate, '');
  if (s.chart?.note) out.push('**Chart note.** ' + s.chart.note, '');
  if (deep) out.push('**Deep dive.**', '', deep.replace(/^## /gm, '#### '), '');
  out.push('**Sources.**', '');
  for (const id of s.sources) { const x = sources.get(id); out.push(`- \`${id}\`: ${x?.citation ?? '(missing)'} ${x?.url ?? ''}`); }
  out.push('');
}
console.log(out.join('\n'));
