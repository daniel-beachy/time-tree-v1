// Builds the static data snapshot in public/data from the TimeTree API (+ iNaturalist for photos).
//
//   node scripts/build-data.mjs            # uses cached API responses in scripts/.cache
//   node scripts/build-data.mjs --refresh  # re-downloads everything
//
// Output:
//   public/data/tree.json     merged dated tree of all curated species (compact arrays)
//   public/data/species.json  curated species with ids, photo, group
//   public/data/studies.json  studies behind each internal node (lazy-loaded by the app)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECIES, GROUPS } from './species.mjs';
import { mergeTimelines } from '../src/lib/merge.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, 'scripts/.cache');
const OUT = path.join(ROOT, 'public/data');
const REFRESH = process.argv.includes('--refresh');
const TT = 'https://api.timetree.org';

await fs.mkdir(CACHE, { recursive: true });
await fs.mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_');

async function cachedJson(kind, key, url) {
  const file = path.join(CACHE, `${kind}-${slug(key)}.json`);
  if (!REFRESH) {
    try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'DeepRoots/1.0 (educational; github.com/daniel-beachy)' } });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { error: 'non-json', status: res.status }; }
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      await fs.writeFile(file, JSON.stringify(json));
      return json;
    } catch (e) {
      await sleep(1500 * (attempt + 1));
      if (attempt === 3) return { error: String(e) };
    }
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      if (++done % 25 === 0) process.stdout.write(`  ${done}/${items.length}\n`);
    }
  }));
  return out;
}

console.log(`Fetching TimeTree data for ${SPECIES.length} species…`);
const fetched = await pool(SPECIES, 4, async ([sci]) => {
  const enc = encodeURIComponent(sci);
  const [taxon, timeline] = [
    await cachedJson('taxon', sci, `${TT}/taxon/${enc}`),
    await cachedJson('timeline', sci, `${TT}/timeline/${enc}/json`),
  ];
  return { taxon, timeline };
});

console.log('Fetching iNaturalist photos…');
const inat = await pool(SPECIES, 3, async ([sci]) => {
  const j = await cachedJson('inat', sci, `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&per_page=5`);
  const results = j.results || [];
  const t = results.find((r) => r.name.toLowerCase() === sci.toLowerCase()) || results[0];
  if (!t) return null;
  const p = t.default_photo;
  return {
    inatId: t.id,
    commonName: t.preferred_common_name || null,
    wiki: t.wikipedia_url || null,
    photo: p ? { url: p.medium_url, square: p.square_url, credit: p.attribution } : null,
    extinct: !!t.extinct,
  };
});

const failures = [];
const entries = [];
SPECIES.forEach(([sci, common, group, famous, note], i) => {
  const { taxon, timeline } = fetched[i];
  if (!Array.isArray(timeline) || !timeline.length || !taxon?.taxon_id) {
    failures.push(sci);
    return;
  }
  entries.push({ sci, common, group, famous: !!famous, note, ncbi: taxon.taxon_id, ttName: taxon.scientific_name, timeline, inat: inat[i] });
});

if (failures.length) console.warn(`\n⚠ ${failures.length} species not found in TimeTree:\n  ${failures.join('\n  ')}\n`);

// Drop duplicates (two names resolving to the same TimeTree taxon)
const seen = new Map();
const uniq = entries.filter((e) => {
  if (seen.has(e.ncbi)) { console.warn(`⚠ duplicate taxon ${e.sci} = ${seen.get(e.ncbi)}`); return false; }
  seen.set(e.ncbi, e.sci);
  return true;
});

const { nodes, leafOf, studies } = mergeTimelines(uniq.map((e) => ({ id: e.ncbi, timeline: e.timeline })), { withStudies: true });

const species = uniq.map((e) => ({
  id: e.ncbi,
  sci: e.ttName || e.sci,
  name: e.common,
  group: e.group,
  famous: e.famous,
  node: leafOf.get(e.ncbi),
  inat: e.inat?.inatId ?? null,
  wiki: e.inat?.wiki ?? null,
  photo: e.inat?.photo?.url ?? null,
  photoCredit: e.inat?.photo?.credit ?? null,
  extinct: e.inat?.extinct || undefined,
  note: e.note || undefined,
}));

const meta = {
  built: new Date().toISOString(),
  ttVersion: uniq[0]?.timeline[0]?.version ?? null,
  groups: GROUPS,
};

await fs.writeFile(path.join(OUT, 'tree.json'), JSON.stringify({ meta, nodes }));
await fs.writeFile(path.join(OUT, 'species.json'), JSON.stringify(species));
await fs.writeFile(path.join(OUT, 'studies.json'), JSON.stringify(studies));

const size = async (f) => ((await fs.stat(path.join(OUT, f))).size / 1024).toFixed(0) + ' KB';
console.log(`\n✔ ${species.length} species, ${nodes.length} tree nodes`);
console.log(`  tree.json ${await size('tree.json')}, species.json ${await size('species.json')}, studies.json ${await size('studies.json')}`);
