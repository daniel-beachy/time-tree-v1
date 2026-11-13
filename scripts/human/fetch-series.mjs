// Fetches chart series from Our World in Data grapher CSVs and writes content/human/series/<id>.json.
// Usage: node scripts/human/fetch-series.mjs
// OWID's own processing is CC BY 4.0; each series keeps its underlying sources' terms (see docs/PLAN.md section 6).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../content/human/series');
mkdirSync(OUT, { recursive: true });

// One entry per series. `column` is the CSV value column; `source` is an id in content/human/sources.json.
const SERIES = [
  {
    id: 'world-population', slug: 'population', column: 'Population', title: 'World population', unit: 'people',
    source: 'owid-population', note: 'Figures before 1800 are rough estimates built from archaeological and historical evidence.',
  },
];

for (const s of SERIES) {
  const url = `https://ourworldindata.org/grapher/${s.slug}.csv?csvType=filtered&country=~OWID_WRL`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (data build script)' } });
  if (!res.ok) throw new Error(`${s.slug}: HTTP ${res.status}`);
  const [head, ...rows] = (await res.text()).trim().split('\n');
  const cols = head.split(',');
  const yi = cols.indexOf('Year'), vi = cols.indexOf(s.column);
  if (yi < 0 || vi < 0) throw new Error(`${s.slug}: columns are ${cols}`);
  const points = rows.map((r) => r.split(',')).map((c) => [Number(c[yi]), Number(c[vi])]).filter(([y, v]) => Number.isFinite(y) && Number.isFinite(v) && y <= new Date().getFullYear());
  writeFileSync(join(OUT, `${s.id}.json`), JSON.stringify({ id: s.id, title: s.title, unit: s.unit, points, sources: [s.source], note: s.note }) + '\n');
  console.log(`${s.id}: ${points.length} points, ${points[0][0]} to ${points.at(-1)[0]}`);
}
