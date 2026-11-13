// Cuts Seshat Cliopatria (CC BY 4.0) into dated slices of states and empires for the `polities` map layer.
// Usage: node scripts/human/fetch-polities.mjs
// Downloads once to scripts/human/.cache (git-ignored); writes public/data/human/map/polities-<year>.json (TopoJSON).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = join(ROOT, 'scripts/human/.cache');
const OUT = join(ROOT, 'public/data/human/map');
const ZIP_URL = 'https://github.com/Seshat-Global-History-Databank/cliopatria/raw/main/cliopatria.geojson.zip';

// Years to slice at. Milestone 1 ships the slices chapter 4 needs; milestone 2 extends this list
// (about every 500 years before 1 CE, every 100 years to 1800, then the years stops need).
export const YEARS = [
  // Before 1 CE: about every 500 years, denser across the first-millennium-BCE empires chapter 5 covers.
  -3000, -2500, -2000, -1750, -1500, -1300, -1200, -1000, -750, -500, -400, -300, -200, -100,
  // 1 CE to 1800: every 100 years (there is no year 0, so the first slice is 1 CE).
  1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800,
  // After 1800: the years chapters 8 and 9 turn on.
  1850, 1900, 1914, 1950, 2000,
];

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

let src = readdirSync(CACHE).find((f) => /^cliopatria.*\.geojson$/.test(f));
if (!src) {
  console.log('Downloading Cliopatria…');
  execFileSync('curl', ['-sL', '-o', join(CACHE, 'cliopatria.zip'), ZIP_URL]);
  execFileSync('unzip', ['-o', '-q', join(CACHE, 'cliopatria.zip'), '-d', CACHE]);
  src = readdirSync(CACHE).find((f) => /^cliopatria.*\.geojson$/.test(f));
}
const all = JSON.parse(readFileSync(join(CACHE, src), 'utf8')).features;
const mapshaper = join(ROOT, 'node_modules/.bin/mapshaper');

for (const year of YEARS) {
  // Leaf polities only: a record with Components is a union of others (an alliance or personal union).
  const feats = all
    .filter((f) => f.properties.FromYear <= year && f.properties.ToYear >= year && !f.properties.Components)
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: { name: f.properties.Name, wiki: f.properties.Wikipedia || undefined, area: Math.round(f.properties.Area) },
    }));
  const tmp = join(CACHE, `slice-${year}.geojson`);
  writeFileSync(tmp, JSON.stringify({ type: 'FeatureCollection', features: feats }));
  const out = join(OUT, `polities-${year}.json`);
  execFileSync(mapshaper, [tmp, '-simplify', 'dp', '45%', 'keep-shapes', '-clean', '-rename-layers', 'polities',
    '-o', 'format=topojson', 'quantization=20000', out], { stdio: 'pipe' });
  console.log(`${year}: ${feats.length} polities, ${(statSync(out).size / 1024).toFixed(0)} KB`);
}
if (!existsSync(join(OUT, `polities-${YEARS[0]}.json`))) process.exit(1);
