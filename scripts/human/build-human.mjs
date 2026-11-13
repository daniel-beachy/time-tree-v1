// Validates content/human/ and compiles it to public/data/human/. Runs as part of `npm run build`.
//   node scripts/human/build-human.mjs            validate and write
//   node scripts/human/build-human.mjs --check    validate only
//   --allow-missing-layers                        let stops name map layers whose files do not exist yet
// The rules enforced here are the "(v)" rules in docs/PLAN.md section 7. Keep the two in step.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepText, recordProblems, VERDICTS } from './lib-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'content/human');
const OUT = join(ROOT, 'public/data/human');
const CHECK = process.argv.includes('--check');
const ALLOW_MISSING_LAYERS = process.argv.includes('--allow-missing-layers');

const REGIONS = ['africa', 'sw-asia', 'europe', 's-asia', 'e-asia', 'se-asia-pacific', 'n-america', 'c-s-america', 'global'];
const THEMES = ['food', 'settlement', 'knowledge', 'exchange', 'technology', 'power', 'belief', 'health', 'art', 'environment', 'movement'];
const KINDS = ['event', 'map', 'chart', 'artifact'];
// Layer id -> how its data is found. `file`: one file. `slices`: polities-<year>.json files. `builtin`: from world-atlas.
const LAYERS = {
  land: { builtin: true }, borders: { builtin: true },
  paleo: { file: 'paleo.json' }, hominins: { file: 'hominins.json' }, dispersal: { file: 'dispersal.json' },
  farming: { file: 'farming.json' }, cities: { file: 'cities.json' }, routes: { file: 'routes.json' },
  polities: { slices: /^polities-(-?\d+)\.json$/ },
};
const IMAGE_LICENCES = /^(public domain|cc0|cc by [\d.]+)$/i;
const DEEP_HEADS = ['What happened', 'How we know', "What's debated", 'Why it matters'];

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

// ── load ─────────────────────────────────────────────────────────────────────────────────────────
const chapters = readJson(join(SRC, 'chapters.json'));
const sources = readJson(join(SRC, 'sources.json'));
const sourceIds = new Set(sources.map((s) => s.id));
const series = existsSync(join(SRC, 'series')) ? readdirSync(join(SRC, 'series')).filter((f) => f.endsWith('.json')).map((f) => readJson(join(SRC, 'series', f))) : [];
const seriesIds = new Set(series.map((s) => s.id));
const handLayers = existsSync(join(SRC, 'map')) ? readdirSync(join(SRC, 'map')).filter((f) => f.endsWith('.geojson')) : [];
const builtLayers = existsSync(join(OUT, 'map')) ? readdirSync(join(OUT, 'map')) : [];
const haveLayer = (id) => {
  const def = LAYERS[id];
  if (!def) return false;
  if (def.builtin) return true;
  if (def.slices) return builtLayers.some((f) => def.slices.test(f));
  return handLayers.includes(def.file.replace('.json', '.geojson')) || builtLayers.includes(def.file);
};

// Named things a stop may highlight: features in hand-authored layers carry properties.id.
const featureIds = { places: new Set(), routes: new Set() };
for (const f of handLayers) {
  const g = readJson(join(SRC, 'map', f));
  const kind = f === 'cities.geojson' ? 'places' : 'routes';
  for (const feat of g.features) {
    const where = `map/${f} ${feat.properties?.id ?? '(no id)'}`;
    if (!feat.properties?.id) err(where, 'every feature needs properties.id');
    if (f !== 'cities.geojson' && !Array.isArray(feat.properties?.sources)) err(where, 'needs properties.sources');
    for (const s of feat.properties?.sources ?? []) if (!sourceIds.has(s)) err(where, `unknown source "${s}"`);
    featureIds[kind].add(feat.properties?.id);
  }
}

// ── sources ──────────────────────────────────────────────────────────────────────────────────────
for (const s of sources) {
  for (const k of ['id', 'type', 'citation', 'url', 'accessed']) if (!s[k]) err(`sources ${s.id ?? '?'}`, `missing ${k}`);
  if (s.url && !/^https:\/\//.test(s.url)) err(`sources ${s.id}`, 'url must be https');
}
if (sourceIds.size !== sources.length) err('sources', 'duplicate ids');
for (const s of series) for (const id of s.sources ?? []) if (!sourceIds.has(id)) err(`series ${s.id}`, `unknown source "${id}"`);

// ── map states ───────────────────────────────────────────────────────────────────────────────────
function checkMap(where, m) {
  if (typeof m.year !== 'number') err(where, 'map.year must be a number');
  const v = m.view;
  const okView = v === 'world' || REGIONS.includes(v) || (v && Array.isArray(v.center) && typeof v.zoom === 'number');
  if (!okView) err(where, 'map.view must be "world", a region id, or { center, zoom }');
  if (v?.center && (Math.abs(v.center[0]) > 180 || Math.abs(v.center[1]) > 90)) err(where, 'map.view.center out of range');
  for (const l of m.layers ?? []) {
    if (!LAYERS[l]) err(where, `unknown layer "${l}"`);
    else if (!haveLayer(l) && !ALLOW_MISSING_LAYERS) err(where, `layer "${l}" has no data file yet`);
  }
  for (const p of m.highlight?.places ?? []) if (!featureIds.places.has(p)) err(where, `highlight place "${p}" is not in cities.geojson`);
  for (const r of m.highlight?.routes ?? []) if (!featureIds.routes.has(r)) err(where, `highlight route "${r}" is not in a hand-authored layer`);
  if (m.centerLon != null && (typeof m.centerLon !== 'number' || Math.abs(m.centerLon) > 180)) err(where, 'map.centerLon must be a longitude');
  for (const l of m.labels ?? []) if (Math.abs(l.lat) > 90 || Math.abs(l.lon) > 180 || !l.text) err(where, 'bad label');
}

// ── chapters and stops ───────────────────────────────────────────────────────────────────────────
const stopIds = new Set();
const compiled = [];
chapters.forEach((c, i) => {
  const where = `chapter ${c.id}`;
  for (const k of ['id', 'title', 'subtitle', 'intro', 'color', 'map']) if (!c[k]) err(where, `missing ${k}`);
  if (c.n !== i + 1) err(where, `n should be ${i + 1}`);
  if (!(c.from < c.to)) err(where, 'from must be before to');
  if (!['draft', 'complete'].includes(c.status)) err(where, 'status must be "draft" or "complete"');
  if (c.intro && words(c.intro) > 80) err(where, `intro is ${words(c.intro)} words (max 80)`);
  if (c.map) checkMap(where, c.map);
  for (const k of c.keyNumbers ?? []) for (const s of k.sources ?? []) if (!sourceIds.has(s)) err(where, `key number cites unknown source "${s}"`);

  const file = join(SRC, 'stops', `${String(c.n).padStart(2, '0')}-${c.id}.json`);
  const stops = existsSync(file) ? readJson(file) : [];
  const usedSources = new Set((c.keyNumbers ?? []).flatMap((k) => k.sources ?? []));
  const deep = {};
  // Fact-check records: what a checker found for each stop (docs/PLAN.md, "Fact-check pass").
  const checksFile = join(SRC, 'checks', `${c.id}.json`);
  const records = existsSync(checksFile) ? readJson(checksFile).stops ?? {} : {};
  for (const [id, r] of Object.entries(records)) for (const k of r.claims ?? []) if (!VERDICTS.includes(k.verdict)) err(`checks ${c.id}/${id}`, `verdict must be one of ${VERDICTS.join(', ')}`);
  let prevStop = null;
  for (const s of stops) {
    const w = `stop ${c.id}/${s.id ?? '?'}`;
    // Scrolling never moves time backward: stops run in order of the year they start. A stop that covers a span goes where it starts.
    if (prevStop && typeof s.year === 'number' && s.year < prevStop.year) err(w, `starts in ${s.year}, before the stop above it (${prevStop.id}, ${prevStop.year}); move it up`);
    if (typeof s.year === 'number') prevStop = s;
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) err(w, 'id must be lowercase letters, digits and hyphens');
    if (stopIds.has(s.id)) err(w, 'duplicate stop id');
    stopIds.add(s.id);
    if (!KINDS.includes(s.kind)) err(w, `kind must be one of ${KINDS.join(', ')}`);
    if (!s.title) err(w, 'missing title');
    if (typeof s.year !== 'number') err(w, 'year must be a number');
    else if (s.year < c.from || s.year > c.to) err(w, `year ${s.year} is outside the chapter (${c.from} to ${c.to})`);
    if (s.yearEnd != null && !(s.yearEnd > s.year)) err(w, 'yearEnd must be after year');
    if (!['exact', 'circa', 'range'].includes(s.precision)) err(w, 'precision must be exact, circa or range');
    if (s.precision === 'range' && s.yearEnd == null) err(w, 'precision "range" needs yearEnd');
    if (s.place && (Math.abs(s.place.lat) > 90 || Math.abs(s.place.lon) > 180 || !s.place.name)) err(w, 'bad place');
    if (!s.regions?.length || s.regions.some((r) => !REGIONS.includes(r))) err(w, 'regions must be a non-empty list of region ids');
    if (!s.themes?.length || s.themes.some((t) => !THEMES.includes(t))) err(w, 'themes must be a non-empty list of theme ids');
    const n = words(s.blurb ?? '');
    if (n < 40 || n > 70) err(w, `blurb is ${n} words (40 to 70)`);
    if (!['established', 'debated', 'uncertain'].includes(s.confidence)) err(w, 'confidence must be established, debated or uncertain');
    if (s.confidence !== 'established' && !s.dateNote && !s.debate) err(w, 'a debated or uncertain stop needs dateNote or debate saying what is in question');
    if (!s.sources?.length) err(w, 'needs at least one source');
    for (const id of s.sources ?? []) { if (!sourceIds.has(id)) err(w, `unknown source "${id}"`); usedSources.add(id); }
    if (s.sources?.length && s.sources.every((id) => /wikipedia\.org/.test(sources.find((x) => x.id === id)?.url ?? ''))) err(w, 'Wikipedia cannot be the only source');
    for (const l of s.links ?? []) if (!l.label || !/^https:\/\//.test(l.url ?? '')) err(w, 'links need a label and an https url');
    if (s.map) checkMap(w, s.map);
    if (s.kind === 'chart' && !s.chart) err(w, 'a chart stop needs chart');
    for (const id of s.chart?.series ?? []) if (!seriesIds.has(id)) err(w, `unknown series "${id}"`);
    if (s.chart) {
      const cs = s.chart.series ?? [];
      if (cs.length < 1 || cs.length > 4) err(w, 'a chart has 1 to 4 series; split it into two stops instead of adding a fifth');
      const units = new Set(cs.map((id) => series.find((x) => x.id === id)?.unit));
      if (units.size > 1) err(w, `a chart's series must share one unit (one axis), got: ${[...units].join(' / ')}`);
      for (const k of s.chart.marks ?? []) {
        if (typeof k.year !== 'number' || !k.label || k.label.length > 26) err(w, 'a chart mark needs a year and a label of at most 26 characters');
        if (k.yearEnd != null && k.yearEnd < k.year) err(w, `chart mark "${k.label}" ends before it starts`);
      }
      if ((s.chart.marks ?? []).length > 5) err(w, 'at most 5 marks on a chart');
      // The chart's data is a source too: the stop must cite it.
      for (const id of cs) for (const src of series.find((x) => x.id === id)?.sources ?? []) if (!(s.sources ?? []).includes(src)) err(w, `chart series "${id}" comes from source "${src}", which the stop must list`);
    }
    if (s.image) {
      for (const k of ['src', 'alt', 'credit', 'licence', 'sourceUrl']) if (!s.image[k]) err(w, `image missing ${k}`);
      if (s.image.licence && !IMAGE_LICENCES.test(s.image.licence)) err(w, `image licence "${s.image.licence}" is not public domain, CC0 or CC BY`);
      if (s.image.src && !existsSync(join(ROOT, 'public', s.image.src))) err(w, `image file public/${s.image.src} does not exist`);
    }
    if (s.checked && !/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) err(w, 'checked must be a YYYY-MM-DD date');
    if (s.checked) for (const p of recordProblems(s, deepText(SRC, s), records[s.id])) err(w, p);

    const deepFile = join(SRC, 'deep', `${s.id}.md`);
    if (s.deep && !existsSync(deepFile)) err(w, `deep is true but content/human/deep/${s.id}.md does not exist`);
    if (!s.deep && existsSync(deepFile)) err(w, 'a deep dive file exists but deep is not true');
    if (s.deep && existsSync(deepFile)) {
      const sections = parseDeep(readFileSync(deepFile, 'utf8'));
      const heads = sections.map((x) => x.h);
      if (heads.join('|') !== DEEP_HEADS.join('|')) err(w, `deep dive subheads must be exactly: ${DEEP_HEADS.join(' / ')}`);
      const total = sections.reduce((t, x) => t + x.p.reduce((a, p) => a + words(p), 0), 0);
      if (total < 250 || total > 600) err(w, `deep dive is ${total} words (250 to 600)`);
      if ((s.sources?.length ?? 0) < 2) err(w, 'a deep dive needs at least two sources');
      deep[s.id] = sections;
    }
  }

  if (c.status === 'complete') {
    if (stops.length < 10 || stops.length > 14) err(where, `a complete chapter has 10 to 14 stops (has ${stops.length})`);
    if (c.n >= 3) {
      const regions = new Set(stops.flatMap((s) => s.regions).filter((r) => r !== 'global'));
      if (regions.size < 5) err(where, `a complete chapter from 3 on needs stops in at least 5 regions (has ${regions.size})`);
    }
    const unchecked = stops.filter((s) => !s.checked).length;
    if (unchecked) err(where, `${unchecked} stops have no "checked" date from a verifier pass`);
  }
  compiled.push({ id: c.id, stops, deep, sources: sources.filter((s) => usedSources.has(s.id)) });
});
if (chapters.length !== 9) err('chapters', `expected 9 chapters, found ${chapters.length}`);

/** Deep dives are plain Markdown: "## Subhead" lines and paragraphs. Inline *emphasis* and [links](https://…) are rendered by the app. */
function parseDeep(md) {
  const out = [];
  for (const block of md.trim().split(/\n{2,}/)) {
    const t = block.trim().replace(/\n/g, ' ');
    if (t.startsWith('## ')) out.push({ h: t.slice(3).trim(), p: [] });
    else if (out.length) out.at(-1).p.push(t);
  }
  return out;
}

// ── report and write ─────────────────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`Human Story content: ${errors.length} problem${errors.length > 1 ? 's' : ''}\n` + errors.map((e) => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
const nStops = compiled.reduce((t, c) => t + c.stops.length, 0);
console.log(`Human Story content OK: ${chapters.length} chapters, ${nStops} stops, ${sources.length} sources, ${series.length} series`);
if (CHECK) process.exit(0);

mkdirSync(join(OUT, 'chapters'), { recursive: true });
mkdirSync(join(OUT, 'map'), { recursive: true });
const pop = series.find((s) => s.id === 'world-population');
writeFileSync(join(OUT, 'index.json'), JSON.stringify({
  chapters: chapters.map((c) => ({ ...c, stopCount: compiled.find((x) => x.id === c.id).stops.length })),
  // Ticks for the to-scale strip, and enough to deep-link any stop.
  stops: compiled.flatMap((c) => c.stops.map((s) => ({ id: s.id, chapter: c.id, year: s.year, title: s.title, major: s.major || undefined }))),
  population: pop ? pop.points : [],
  polityYears: builtLayers.map((f) => LAYERS.polities.slices.exec(f)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b),
}));
for (const c of compiled) writeFileSync(join(OUT, 'chapters', `${c.id}.json`), JSON.stringify(c));
writeFileSync(join(OUT, 'series.json'), JSON.stringify(series));
writeFileSync(join(OUT, 'sources.json'), JSON.stringify(sources));
for (const f of handLayers) writeFileSync(join(OUT, 'map', f.replace('.geojson', '.json')), JSON.stringify(readJson(join(SRC, 'map', f))));
// Base map from Natural Earth via world-atlas (public domain): coarse for animation, fine at rest.
for (const [from, to] of [['land-110m.json', 'land-110m.json'], ['land-50m.json', 'land-50m.json'], ['countries-110m.json', 'borders.json']]) {
  copyFileSync(join(ROOT, 'node_modules/world-atlas', from), join(OUT, 'map', to));
}
