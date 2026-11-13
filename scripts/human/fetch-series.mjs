// Fetches chart series from Our World in Data grapher CSVs and writes content/human/series/<id>.json.
// Usage: node scripts/human/fetch-series.mjs
// OWID's own processing is CC BY 4.0; each series keeps its underlying sources' terms (see docs/PLAN.md section 6).
//
// One entry is one line on a chart: one grapher slug, one entity (World, or a region as OWID names it), one column.
//   label   short name used in legends and at the end of the line ("Africa")
//   format  how values are written: people | years | percent | tonnes | number
//   from/to keep only these years (use `from` to start where openly licensed sources start)
//   source  an id in content/human/sources.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../content/human/series');
mkdirSync(OUT, { recursive: true });

const lifeNote = 'Life expectancy at birth: the average age at death if death rates stayed as they were that year. Shown from 1950, where the United Nations estimates begin.';
const SERIES = [
  {
    id: 'world-population', slug: 'population', column: 'Population', title: 'World population', label: 'World', unit: 'people', format: 'people',
    source: 'owid-population', note: 'Figures before 1800 are rough estimates built from archaeological and historical evidence.',
  },
  ...[['World', 'world'], ['Africa', 'africa'], ['Asia', 'asia'], ['Europe', 'europe']].map(([entity, key]) => ({
    id: `life-expectancy-${key}`, slug: 'life-expectancy', entity, column: 'Life expectancy', title: `Life expectancy, ${entity}`, label: entity,
    unit: 'years', format: 'years', from: 1950, source: 'owid-life-expectancy', note: lifeNote,
  })),
  {
    id: 'co2-world', slug: 'annual-co2-emissions', column: 'Annual CO₂ emissions', title: 'Carbon dioxide emissions, world', label: 'World', unit: 'tonnes of CO₂ a year', format: 'tonnes',
    to: 2024, source: 'owid-co2', note: 'Carbon dioxide from burning fossil fuels and from industry. Land-use change is not included.',
  },
];

const cache = new Map();
async function csv(slug) {
  if (!cache.has(slug)) {
    const res = await fetch(`https://ourworldindata.org/grapher/${slug}.csv?csvType=full`, { headers: { 'User-Agent': 'Mozilla/5.0 (data build script)' } });
    if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
    cache.set(slug, (await res.text()).trim().split('\n').map((r) => r.split(',')));
  }
  return cache.get(slug);
}

const thisYear = new Date().getFullYear();
for (const s of SERIES) {
  const [cols, ...rows] = await csv(s.slug);
  const ei = cols.indexOf('Entity'), yi = cols.indexOf('Year'), vi = cols.indexOf(s.column);
  if (ei < 0 || yi < 0 || vi < 0) throw new Error(`${s.slug}: columns are ${cols}`);
  const entity = s.entity ?? 'World';
  const points = rows.filter((c) => c[ei] === entity && c[vi] !== '').map((c) => [Number(c[yi]), Number(c[vi])])
    .filter(([y, v]) => Number.isFinite(y) && Number.isFinite(v) && y >= (s.from ?? -Infinity) && y <= (s.to ?? thisYear));
  if (points.length < 2) throw new Error(`${s.id}: no rows for "${entity}"`);
  const out = { id: s.id, title: s.title, label: s.label, unit: s.unit, format: s.format, points, sources: [s.source], note: s.note };
  writeFileSync(join(OUT, `${s.id}.json`), JSON.stringify(out) + '\n');
  console.log(`${s.id}: ${points.length} points, ${points[0][0]} to ${points.at(-1)[0]} (${points[0][1]} → ${points.at(-1)[1]})`);
}
