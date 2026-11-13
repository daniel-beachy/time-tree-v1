# Human Story: build plan

A new area inside Deep Roots that teaches human history, from the first *Homo sapiens* about 300,000
years ago to today, through a world map that changes as you move through time.

Written 2026-11-12 in a Fable planning session with Dan. An Opus session should be able to build from
this without re-deciding anything. Where this plan says "verify", the fact came from memory and the
building or curating session must confirm it against a source before it ships.

"Human Story" is a working title. Dan can rename it; the route and folder names below stay.

## 1. What Dan asked for

- Learn human history in the most accessible way possible: all the history we never think about, and
  how scattered hunter-gatherers became one globally connected civilisation.
- Very visual: maps first, charts second, text third.
- Deep content that is not overwhelming at first glance.
- One global story. Regions can be explored separately later.
- Start at about 300,000 years ago as a short opening. The bulk is the last 12,000 years.
- The last 200 years get a factual overview that is mostly charts, but the World Wars and similar
  events are still covered properly.
- Scale is a supporting idea, not the organising one. Show how crammed recent history is, but lay the
  content out so it teaches well.
- It lives inside Deep Roots but should feel like its own area, more than another tab.
- Research and content curation are Opus work, not Fable work.

## 2. Decisions

| Topic | Decision | Reason |
|---|---|---|
| Home | Inside Deep Roots, in a self-contained `src/human/` folder with its own data under `public/data/human/` | Shares the shell and deploy; can be lifted into its own app later without untangling |
| Feel | Same layout and type as the rest of the app, but a warm earth palette and no starfield, switched on by `data-area="human"` on `<html>` | Dan wants it to feel separate without redesigning the app |
| Structure | Nine chapters, each a scroll of "stops". Not a ruler | Dan chose teaching over strict scale |
| Scale | A thin to-scale strip always on screen, plus one full-width version on the landing page | Keeps the "crammed at the end" point without letting it drive layout |
| Hero visual | A world map that changes with the active stop | Agreed with Dan |
| Units | Every date shows a calendar date or "years ago", plus generations. One setting switches which is primary | Dan wanted both |
| Start | About 300,000 years ago (earliest *Homo sapiens*). Not fire, not the chimp split | Fire is older than our species; the chimp split felt wrong to Dan |
| End | Today, with a lighter final chapter that is mostly charts | Agreed with Dan |
| Depth | Three levels: chapter intro, stop card, deep dive | "Deep but not overwhelming" |
| Content source | Hand-curated JSON and Markdown in the repo, written by Opus from cited sources, compiled and validated by a script | No API covers this; validation keeps unattended curation honest |
| Hosting | Unchanged: static on GitHub Pages. No new Worker endpoints | Everything is bundled or fetched from CORS-friendly APIs |
| Branch | Build on `human-story`. Merge to `main` (which deploys) only at a checkpoint Dan approves | The live site is on the portfolio; a half-built area should not appear there |
| Later, not in the core | Threads, region lens, "meanwhile" view, quiz hooks | Agreed cut for the first build; the data model carries their tags from day one |

## 3. Experience

### Routes

Hash routes, like the rest of the app (`src/lib/router.ts`).

- `#/human`: landing page.
- `#/human/<chapterId>`: a chapter.
- `#/human/<chapterId>/<stopId>`: the same chapter, scrolled to that stop.
- `?d=1` on a stop route opens its deep dive.

`App.tsx` currently waits for the species tree before rendering any view. The human area must render
without it.

### Landing page

- Short hero: what this is, in two sentences.
- The whole story to scale: one full-width horizontal bar of 300,000 years with the nine chapters as
  coloured bands. Chapters 3 to 9 together are the last 4% of it. A caption says so in years and in
  generations.
- Chapter grid: nine cards, each with number, title, date range, one line, and a small static map
  thumbnail.
- Sources and method link.

### Chapter page

- **Desktop (720 px and wider):** the map is sticky on the left, about 58% of the width and the full
  height under the top bar. Stop cards scroll in a column on the right.
- **Phone:** the map is sticky at the top at about 42svh. Stop cards scroll underneath.
- The stop nearest the middle of the card column is the active stop (IntersectionObserver). The map
  moves to that stop's map state with a 600 ms transition. With `prefers-reduced-motion`, it cuts.
- A year readout sits on the map: the active stop's date, the generations figure, and the estimated
  world population at that time.
- The chapter opens with an intro card (level 1) and ends with a "next chapter" card.
- A chapter rail (nine numbered chips) allows jumping between chapters.
- The to-scale strip is fixed at the right edge on desktop (vertical) and under the top bar on phone
  (horizontal, 6 px tall). It shows chapter bands, a marker for the active stop, and ticks for stops
  flagged `major`. Tapping it opens a small popover that lists the chapters with their true share of
  the 300,000 years.

### Stop card (level 2)

Title, date line, place, a 40 to 70 word blurb, an optional image with credit, a confidence badge when
the stop is `debated` or `uncertain`, and a "Go deeper" button when a deep dive exists.

### Deep dive (level 3)

A drawer (right side on desktop, full-screen sheet on phone) with 250 to 600 words under fixed
subheads: What happened, How we know, What's debated, Why it matters. Then numbered sources and
further reading links. Closing it returns to the same scroll position.

### Entrances from the existing app

- A seventh nav item, "Human Story", styled with the warm accent.
- A wide card on Home below the existing mode grid.
- A card at the "today" end of Deep Time: on that view's linear scale all 300,000 years is under half
  a pixel, and the card says so and links in.

## 4. Architecture

### Folders

```
content/human/            authored content (source of truth)
  chapters.json           the nine chapters
  stops/<nn>-<id>.json    one file per chapter: its stops, in order
  deep/<stopId>.md        deep dives
  sources.json            every cited source
  series/*.json           chart series
  map/*.geojson           hand-authored map layers (dispersal, routes, hominins, farming)
scripts/human/
  build-human.mjs         validates content, compiles to public/data/human/
  fetch-*.mjs             one script per external dataset (download, simplify, convert)
public/data/human/        generated; committed, like public/data today
public/img/human/         images copied into the repo
src/human/
  HumanArea.tsx           route switch for the area; sets data-area
  Landing.tsx, Chapter.tsx, StopCard.tsx, DeepDive.tsx, ScaleStrip.tsx, ChapterRail.tsx
  map/HumanMap.tsx        canvas + SVG overlay + zoom
  map/layers.ts           layer registry
  map/transition.ts       tweening between map states
  charts/SeriesChart.tsx  line and area charts
  lib/time.ts             date formatting and generations
  lib/content.ts          typed loaders for public/data/human/
  human.css               the area's theme and layout
```

`package.json` changes: add `topojson-client` (runtime), `topojson-server` and `topojson-simplify`
(dev). `build` becomes `node scripts/human/build-human.mjs && tsc -b && vite build`. Add
`check:human` to run only the validator.

### Time

- `Year` is a number. Positive is CE, negative is BCE (3200 BCE is `-3200`). There is no correction for
  the missing year zero; nothing here needs that precision.
- Display rule: older than 10,000 BCE shows as "about N years ago", rounded to two significant
  figures. Otherwise "3200 BCE" or "1450 CE".
- Generations: `(2026 - year) / GEN_YEARS`, rounded to two significant figures and prefixed "about".
  `GEN_YEARS = 27` (average human generation time over the last 250,000 years was about 26.9 years:
  Wang et al. 2023, *Science Advances*; verify).
- A preference `human:unit` (`date` or `generations`) picks which is shown large. Use `usePref` from
  `src/lib/store.ts`.

### Data model

```ts
type RegionId = 'africa' | 'sw-asia' | 'europe' | 's-asia' | 'e-asia' | 'se-asia-pacific'
              | 'n-america' | 'c-s-america' | 'global';
type ThemeId  = 'food' | 'settlement' | 'knowledge' | 'exchange' | 'technology' | 'power'
              | 'belief' | 'health' | 'art' | 'environment' | 'movement';

interface Chapter {
  id: string; n: number; title: string; subtitle: string;
  from: Year; to: Year;
  intro: string;              // level 1, at most 80 words
  color: string;              // band colour on the scale strip
  map: MapState;              // state shown for the intro card
  keyNumbers: { label: string; value: string; sources: string[] }[];   // 2 to 4
}

interface Stop {
  id: string; chapter: string;
  kind: 'event' | 'map' | 'chart' | 'artifact';
  title: string;
  year: Year; yearEnd?: Year;
  precision: 'exact' | 'circa' | 'range';
  dateNote?: string;          // e.g. "dates from 23,000 to 21,000 years ago are disputed"
  place?: { name: string; lat: number; lon: number };
  regions: RegionId[]; themes: ThemeId[];
  blurb: string;              // level 2, 40 to 70 words
  image?: { src: string; alt: string; credit: string; licence: string; sourceUrl: string };
  map?: MapState;             // omitted: keep the previous stop's state
  chart?: { series: string[]; from?: Year; to?: Year; log?: boolean; note?: string };
  deep?: boolean;             // content/human/deep/<id>.md exists
  confidence: 'established' | 'debated' | 'uncertain';
  sources: string[];          // ids in sources.json, at least one
  links: { label: string; url: string }[];
  major?: boolean;            // tick on the scale strip
  checked?: string;           // date a separate verifier pass confirmed it; see section 7
}

interface MapState {
  year: Year;
  view: 'world' | RegionId | { center: [number, number]; zoom: number };
  layers: LayerId[];
  highlight?: { places?: string[]; routes?: string[]; polities?: string[] };
  labels?: { lat: number; lon: number; text: string }[];
}

interface Source {
  id: string; type: 'paper' | 'book' | 'dataset' | 'museum' | 'reference' | 'web';
  citation: string; url: string; accessed: string;
}

interface Series {
  id: string; title: string; unit: string;
  points: [Year, number][];
  sources: string[]; note?: string;   // e.g. "estimates before 1800 are rough"
}
```

### Map engine

- Projection: `d3.geoEqualEarth()`. Region views are presets of centre and zoom.
- Rendering: one `<canvas>` for filled and stroked geometry, redrawn on `requestAnimationFrame`, with
  an SVG overlay for labels, place markers and anything tappable. Device pixel ratio capped at 2.
- Interaction: `d3-zoom` for pan and pinch. A "reset view" button returns to the stop's view. A user
  pan or zoom is kept until the active stop changes.
- Layers are registered in `map/layers.ts`. Each has an id, a loader for its file, and a
  `draw(ctx, path, state)` function. Features carry `from` and `to` years; a layer draws only the
  features alive at `state.year`. Snapshot layers pick the latest snapshot at or before `state.year`.
- Transitions tween the view (centre and zoom) and cross-fade layers. The year readout counts between
  values.

| Layer id | Shows | Used in chapters |
|---|---|---|
| `land` | Modern land | all |
| `paleo` | Ice-age coastline and ice sheets at a few snapshots | 1, 2, 3 |
| `hominins` | Rough ranges of other human species, drawn as soft shapes and labelled approximate | 1, 2 |
| `dispersal` | Routes of *Homo sapiens* across the world with arrival dates; a route appears once `state.year` passes its date | 1, 2, 3 |
| `farming` | Independent centres of plant and animal domestication, with crops | 3 |
| `cities` | Cities as dots sized by estimated population | 4 to 9 |
| `polities` | States and empires at dated snapshots | 4 to 9 |
| `routes` | Trade and travel routes, each with a date range | 4 to 8 |
| `borders` | Modern country borders | 9 |

Section 6 says where each layer's data comes from.

### Look

Scoped under `[data-area="human"]`, overriding the variables in `src/index.css`:

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#100c08` | page |
| `--bg2` | `#1a130c` | panels |
| `--text` | `#f3ead9` | text |
| `--muted` | `#a89a84` | secondary text |
| `--glow` | `#f0b35a` | primary accent (ochre) |
| `--glow2` | `#d9694a` | second accent (terracotta) |
| `--water` | `#0b1418` | map ocean |
| `--land` | `#2e261b` | map land |
| `--ice` | `#dfe9ee` | ice sheets, 70% opacity |

- The body gradient becomes a warm one and the starfield (`body::before`) is hidden.
- Chapter titles use a display serif, Fraunces, added to the existing Google Fonts link. Everything
  else stays Space Grotesk and JetBrains Mono.
- The app is dark only today. The human area stays dark only.
- The existing footer credits TimeTree. In the human area it is replaced with the area's own data and
  image credits.

### Performance and accessibility

- The area is lazy-loaded like the other views. Each chapter's stops and layers load when the chapter
  opens. Budget: under 400 KB gzipped to first render of a chapter, under 4 MB for all human data.
- The map is decorative to assistive technology; every stop's blurb must make sense without it.
  Images have real alt text. Stops are reachable by keyboard, and the deep dive traps focus while open.

## 5. Chapters and stops

Dan asked for the curation to follow one arc: from scattered hunter-gatherers to a connected world.
The list below is the starting curation. The curating session verifies every date, may replace up to
a fifth of the stops in a chapter if the evidence or balance calls for it, and records why in the
commit message. Aim for 10 to 14 stops per chapter and a deep dive on about a third of them.

### 1. Becoming human (300,000 to 70,000 years ago)

Earliest *Homo sapiens* at Jebel Irhoud · origins across Africa rather than one cradle (Omo Kibish,
Florisbad) · not alone: Neanderthals, Denisovans, *H. naledi*, *H. floresiensis* (map) · fire and
cooking, inherited from earlier humans · Middle Stone Age toolkits and long-distance obsidian · early
ventures beyond Africa (Misliya, Skhul and Qafzeh) · beads and ochre (Blombos, Bizmoune) · the
earliest known burial in Africa (Panga ya Saidi) · when did language begin? (an honest "we don't
know" stop) · the Toba eruption and how few of us there were · green Sahara cycles.

### 2. Across the world (70,000 to 12,000 years ago)

The main dispersal out of Africa · meeting the relatives: Neanderthal and Denisovan DNA in people
today · crossing the sea to Australia and New Guinea · the oldest figurative art (Sulawesi, Chauvet,
the Lion Man) and the oldest instruments (Hohle Fels flutes) · the last other humans disappear ·
needles, clothing and life in the cold · the Sunghir burials · the Last Glacial Maximum: ice, low
seas, Beringia, Doggerland, Sunda and Sahul (map) · dogs, the first domesticated animal · the first
pottery (China, Japan) · into the Americas (White Sands, Monte Verde, Clovis) · the megafauna
extinctions · the Natufians: settling down before farming · the Younger Dryas and the start of the
Holocene.

### 3. Settling down (10,000 to 3500 BCE)

Göbekli Tepe: monuments before farming · the Fertile Crescent package · farming invented
independently around the world (map: China, New Guinea, Mesoamerica, the Andes, Africa, eastern North
America) · Jericho and Çatalhöyük · what farming cost: health, work, disease, inequality · farmers
spread into Europe; milk drinking · rising seas drown Doggerland · the green Sahara ends · pottery,
weaving, beer and bread · copper smelting · the horse and the wheel · megaliths (Newgrange, early
Stonehenge).

### 4. First cities and writing (3500 to 1200 BCE)

Uruk, the first big city · writing invented for accounting, and invented again elsewhere (Egypt,
China, Mesoamerica) · Egypt unified; the Great Pyramid, while mammoths still lived on Wrangel Island ·
the Indus cities · Caral in Peru: cities without writing or pottery · bronze and the tin trade ·
Sargon and the first empire · the first law codes · Enheduanna, Gilgamesh and the first literature ·
Babylonian mathematics and astronomy · steppe migrations and the Indo-European languages · Shang
China · Minoans, Mycenaeans and the Uluburun shipwreck · Kerma and Nubia · the Lapita voyagers · the
Olmec · the alphabet · the Late Bronze Age collapse.

### 5. Empires and big ideas (1200 BCE to 500 CE)

Iron · Phoenicians and the spread of the alphabet · the Bantu expansion · the Persian Empire and its
roads · coinage · a burst of ideas across Eurasia: the Buddha, Confucius, the Hebrew prophets, the
Greek philosophers · Athenian democracy and Greek science · Alexander, Alexandria, and measuring the
Earth · Ashoka · Qin and Han China; paper · Rome: roads, law, concrete · the Silk Roads and the
monsoon trade · Teotihuacan, the Maya, and zero · Kush and Aksum · Christianity and Buddhism spread ·
Gupta India and the decimal system · plagues and the fall of Han and Western Rome.

### 6. A connected Old World (500 to 1450)

The Plague of Justinian · the rise of Islam and the caliphates · Baghdad's House of Wisdom; algebra ·
Tang and Song China: printing, gunpowder, the compass, paper money · Polynesian voyagers reach
Hawaii, Rapa Nui and Aotearoa, the last large lands settled · the Norse reach North America · Ghana
and Mali; Mansa Musa; Timbuktu · the Swahili coast and Great Zimbabwe · the Indian Ocean world:
Chola, Srivijaya, Angkor · the Maya collapse; Cahokia · universities · the Mongol Empire · the Black
Death · Zheng He's fleets · Tenochtitlan and the Inca · movable type in Korea and Gutenberg's press.

### 7. One world (1450 to 1750)

Sailing around Africa and across the Atlantic; the first circumnavigation · the Columbian Exchange ·
the Great Dying in the Americas · the fall of the Aztec and Inca empires · silver, Potosí and the
first global economy · the transatlantic slave trade · the Ottoman, Safavid, Mughal and Qing empires;
Tokugawa Japan · printing and the Reformation · the Scientific Revolution · joint-stock companies and
the first stock exchange · the Little Ice Age · Russia crosses Siberia · the Enlightenment begins.

### 8. The age of industry (1750 to 1914)

Coal and steam: why it started in Britain · the energy revolution (chart) · the American, French and
Haitian revolutions; independence in Latin America · abolition · vaccination, germ theory and
sanitation · railways, steamships and the telegraph · the Opium Wars and the Taiping Rebellion · the
Meiji Restoration · the British Raj and the Scramble for Africa · mass migration · Darwin; electricity;
the telephone; flight · votes for women; mass schooling · the first billion people.

### 9. The modern world (1914 to today)

Mostly charts, with full stops for the events that shaped it: the First World War · the 1918
influenza · the Russian Revolution and the Great Depression · the Second World War and the Holocaust ·
the atomic bomb · the United Nations and decolonisation (map) · the Cold War · revolution and famine
in China; independence and partition in India · fertiliser and the Green Revolution (chart) ·
antibiotics, vaccines and the end of smallpox (charts: life expectancy, child mortality) · from 2 to
8 billion people (chart) · poverty and literacy (charts) · space · computers and the internet
(chart) · a majority-urban world (chart) · energy, carbon dioxide and climate (charts) · a closing
card that returns to the to-scale strip.

## 6. Data sources

Licences were checked on 2026-11-12 against each source's own page or API. Items marked "unverified"
could not be confirmed and must be confirmed before use, or left out.

### Chosen sources

| Need | Source | Licence | Credit line |
|---|---|---|---|
| Base land and modern borders (`land`, `borders`) | `world-atlas` npm package (`land-50m`, `countries-110m`), from Natural Earth | Public domain | "Made with Natural Earth" |
| States and empires (`polities`) | Seshat Cliopatria, 3400 BCE to 2024 CE, about 1,600 polities with from and to years. `cliopatria.geojson.zip` in `github.com/Seshat-Global-History-Databank/cliopatria` (46 MB zip) | CC BY 4.0 | "Borders: Seshat Cliopatria (Bennett et al. 2025), CC BY 4.0, simplified" |
| Ice-age coastlines (`paleo`) | De Groeve et al. 2022 land and shelf rasters, every 500 years back to 26,000 years ago (Figshare collection 10.21942/uva.c.5754779) | CC BY 4.0 | "Coastlines: De Groeve et al. 2022, CC BY 4.0, simplified" |
| Ice sheets (`paleo`) | NADI-1 for North America (Dalton et al., Zenodo 8161764, shapefiles) and DATED-1 for Eurasia (Hughes et al. 2016, PANGAEA.848117) | CC BY 4.0 and CC BY 3.0 | "Ice: Dalton et al. NADI-1; Hughes et al. 2016 DATED-1; CC BY, simplified" |
| Cities (`cities`) | Reba, Reitsma and Seto 2016, city populations 3700 BCE to 2000 CE (Figshare 10.6084/m9.figshare.2059494) | CC BY 4.0 | "City populations: Reba, Reitsma & Seto 2016, CC BY 4.0" |
| Roman roads (part of `routes`) | Itiner-e (Zenodo 17122148) | CC BY 4.0 | "Roman roads: Itiner-e (de Soto et al. 2025), CC BY 4.0" |
| Charts | Our World in Data grapher CSVs: `https://ourworldindata.org/grapher/<slug>.csv`, with `.metadata.json` for the citation | CC BY 4.0, plus each underlying source's terms | Per chart, as its metadata gives it |
| Images | The Met Open Access API first (CC0 where `isPublicDomain` is true), then Wikimedia Commons | CC0, or per file | Creator, licence and link |
| "Read more" links | Wikipedia and Wikidata | Links only | None needed for a link |

### Hand-authored layers

No open dataset exists for these, so they are drawn by hand as small GeoJSON files in
`content/human/map/`, each feature citing its sources. Dates and locations are facts and can be
taken from the literature; shapes must be our own drawing, never traced from a published figure.

- **`dispersal`:** routes and arrival dates. Start from Bergström et al. 2021 (*Nature*,
  10.1038/s41586-021-03244-5), Groucutt et al. 2015, Clarkson et al. 2017 for Sahul, Potter et al.
  2018 and Bennett et al. 2021 for the Americas, and Wilmshurst et al. 2011 for East Polynesia.
- **`hominins`:** rough ranges of other human species, from recent reviews.
- **`farming`:** 10 to 15 centres of domestication with their crops and animals, from Larson et al.
  2014 (*PNAS*). That paper's figure is not openly licensed, so do not copy it.
- **`routes`:** Silk Roads, Indian Ocean monsoon routes, trans-Saharan routes, the Manila galleons,
  the Atlantic system, telegraph cables.

### Chart series

These grapher slugs all returned data on 2026-11-12:

| Series | Slug | Notes |
|---|---|---|
| World population, 10,000 BCE to now | `population` | Add `?csvType=filtered&country=~OWID_WRL` for World only |
| Population by region | `population-regions-with-projections` | |
| World GDP since year 1 | `global-gdp-over-the-long-run` | Maddison Project, CC BY 4.0 |
| Life expectancy | `life-expectancy` | World from 1770. One underlying source (Riley) is under JSTOR terms: unverified, so start the series where the open sources start |
| Urban share since 1950 | `share-of-population-urban` | UN data |
| Energy by source since 1800 | `global-primary-energy-by-source` | The Energy Institute's reuse terms are unverified. Until confirmed, bundle only the Smil portion |

Find and check slugs the same way for child mortality, literacy, extreme poverty, carbon dioxide
emissions, internet use and nuclear warheads.

### Do not use

- **historical-basemaps** (aourednik): GPL-3.0, which would pull derived files under the GPL.
- **HYDE 3.5** and OWID's `long-term-urban-population-region`: non-commercial licence. The older HYDE
  3.3 population data inside OWID's `population` series is CC BY and is fine.
- **Text from Wikipedia:** CC BY-SA, share-alike. Link to it; never paste or paraphrase closely.
- **British Museum images, World History Encyclopedia, OER Project, Seshat Equinox:** non-commercial.
  Link only.
- **Smithsonian Human Origins:** copyrighted. Link only.
- **OWTRAD and Chronas:** no licence.

### Data preparation

- Each external layer has one script in `scripts/human/` that downloads to a git-ignored
  `scripts/human/.cache/`, filters, simplifies and writes TopoJSON to `public/data/human/map/`.
  Outputs are committed, so CI never downloads anything.
- Simplify with `mapshaper` (add as a dev dependency). Targets: each paleo snapshot under 150 KB,
  each polity time slice under 200 KB, cities under 150 KB in total.
- `polities`: cut Cliopatria into time slices, about every 500 years before 1 CE, every 100 years
  to 1800, and at the years stops need afterwards. Keep polity name, from, to and Wikipedia link.
- `paleo`: four snapshots (20,000, 15,000, 12,000 and 8,000 years ago). Polygonise the De Groeve
  raster for each, then add the ice margins for the same time. This needs GDAL, which is not
  installed on Dan's Mac; `brew install gdal` is free. Antarctica and Greenland keep modern ice.
- `cities`: keep city, coordinates, year and population. The authors warn that the older estimates
  (Chandler) are rough; the sources page must say so.
- All credit lines above appear on the area's sources page and in the README.
## 7. Content rules

These rules are what make unattended curation trustworthy. The validator enforces the ones marked (v).

- **Voice:** plain and concrete, like the blurbs in `src/data/events.ts`. Define a term the first time
  it appears. No exclamation marks, no rhetorical questions, no dumbing down.
- **Lengths (v):** chapter intro at most 80 words; stop blurb 40 to 70 words; deep dive 250 to 600
  words under the four fixed subheads.
- **Sources (v):** every stop cites at least one source; every deep dive at least two that are
  independent of each other. Prefer review papers, university and museum pages, and standard
  reference works. Wikipedia may appear under links, never as a stop's only source.
- **Dates:** prehistoric dates are ranges, and `precision` and `dateNote` say so. Use the current
  mainstream estimate and mention a serious rival view under "What's debated".
- **Evidence and inference:** say how we know. Never state what people thought or felt as fact;
  describe the evidence (a burial, a healed injury, a flute) and what it suggests.
- **Balance (v):** from chapter 3 on, each chapter has stops in at least five of the eight regions.
  Avoid framing from one continent's point of view ("discovery", "the known world").
- **Hard subjects:** slavery, conquest, genocide, famine and war are described factually, with sourced
  figures given as ranges. No euphemism and no editorialising. Nothing about present-day party
  politics. Religions are described historically and respectfully. The story ends with data, not
  predictions.
- **Images (v):** only public domain, CC0 or CC BY, each with credit, licence and source URL.
  Copy them into `public/img/human/` as WebP, at most 1600 px wide and 200 KB. No AI-generated images.
- **Verification:** the session that writes a chapter never sets `checked`. A later, fresh session
  re-reads each stop against its sources, fixes or flags what does not hold, and sets `checked` to
  that day's date. A chapter is done when every stop has `checked`.

The validator (`build-human.mjs`) also checks: unique ids, every referenced source, series, layer,
route and place exists, coordinates are in range, years fall inside the chapter's range (with
`yearEnd` allowed to run past it), and every image file exists.

## 8. Who builds what

### Fable: the core (milestone 1)

The parts where design judgement decides whether the whole thing works. Everything here is built to a
standard Opus can copy.

1. **The area shell and its look:** `data-area` theming, nav and Home entrances, rendering without the
   species tree, landing page, chapter page layout on phone and desktop.
2. **The map engine:** projection, canvas and overlay rendering, the layer registry, time filtering,
   transitions, zoom and pan, region presets, phone performance.
3. **Scrolling that drives the map:** active-stop detection, deep links to a stop, the year readout.
4. **The to-scale strip** and the time and generations formatting.
5. **The content pipeline:** the types above, `build-human.mjs` with every validator rule, and the
   content folder layout.
6. **Stop card, deep dive drawer and the chart component.**
7. **Two exemplar chapters,** enough to prove every layer type and to set the pattern:
   chapter 2 (paleo, hominins and dispersal layers) and chapter 4 (cities, polities and routes
   layers), each with about five finished stops and one deep dive, written to the content rules.
   These ten stops are the model Opus follows; the rest of both chapters is Opus work.

Acceptance for milestone 1:

- `npm run build` passes, including the validator.
- `#/human`, `#/human/across-the-world` and `#/human/first-cities` work at 375 px and 1440 px wide.
- Scrolling a chapter moves the map to each stop's state, and a deep link lands on the right stop.
- The scale strip shows the right position and its popover lists the chapters.
- The rest of Deep Roots looks and behaves exactly as before.
- It is on the `human-story` branch, pushed, not merged.

### Opus: everything else

| Milestone | Work | Done when |
|---|---|---|
| 2. Map data | The `fetch-*.mjs` scripts for every external layer in section 6; hand-authored layers (dispersal, hominins, farming, routes) for all chapters | Every layer in section 4 draws for every chapter that uses it; total human data is under 4 MB |
| 3. Content | Chapters 1 to 9: stops, deep dives, sources, images. One chapter is one unit of work. Then the verifier pass | Validator passes; every stop has `checked`; each chapter has 10 to 14 stops and deep dives on about a third |
| 4. Charts | `fetch-series.mjs` for the series in section 6; chart stops in chapters 8 and 9; the population figure in the year readout | Every chart stop renders with its source line |
| 5. Finish | Sources and method page, README section, a repo `CLAUDE.md` (the repo has none; the playbook requires one, with the project note's path), phone and desktop pass over every chapter, performance budget check | Dan tries it on the branch; on his OK, merge to `main` and update the portfolio card |
| 6. Later | Threads (follow one theme across chapters), region lens, "meanwhile" view, quiz hooks | Separate decision with Dan |

Milestones 2 and 3 can start as soon as milestone 1 is pushed. Content for a chapter does not depend
on its map data: a stop's `map` can name layers before their files exist only if the validator is run
with `--allow-missing-layers`, which milestone 5 must not use.

## 9. Overnight and unattended runs

Dan wants scheduled overnight sessions that use full 5-hour windows, sharing the weekly limit with
his other projects' sessions. The rules live in the vault note "Usage Manager"; this section applies
them here.

- **How a run starts:** a one-time scheduled task fires just after a 5-hour window resets, reads the
  usage tool, and messages the working session to continue. This is the pattern already used for
  Boards on the Bridge. The task does no work itself.
- **Sharing:** the task sends nothing if weekly usage is at or over the stop line (90% through
  Thursday, 95% on Friday, 99% in the last stretch before the reset), or if the 5-hour window is
  already more than half used, which means another session is busy in it.
- **What is safe to run unattended:** milestone 1 after Dan says go; milestones 2 to 4 in full.
  Milestone 5's merge and anything touching the portfolio wait for Dan.
- **Rules for an unattended session:** work only on the `human-story` branch; commit and push after
  each finished unit (a layer, a chapter, a verifier pass) so a cut-off loses little; never merge to
  `main`; run the validator before each commit; if blocked, write the blocker under "Open threads" in
  the project note and move to the next unit.
- **Order of units for content nights:** chapters 3, 5, 6, 7, 1, 8, 9, then the unfinished parts of 2
  and 4, then the verifier pass in chapter order. Chapters 3 to 7 come first because they are the
  heart of what Dan wants to learn.
- **Model:** milestone 1 on Fable. Everything else on Opus.

## 10. What milestone 1 built, and where it differs from the plan above

Built on branch `human-story` (not merged to `main`): the content pipeline and validator, the map engine, the chapter page, the landing page, the deep-dive drawer, the to-scale strip, one chart component, the warm theme and the three entrances (nav item, Home card, Deep Time card). Chapters 2 and 4 each have six example stops and one deep dive; the other seven chapters show as "Being written".

Differences the next builder should know:

- **Years.** Positive is CE, negative is BCE. "N years ago" is stored as `2000 - N` (60,000 years ago is `-58000`). `src/human/lib/time.ts` formats anything before 10,000 BCE as "about N years ago".
- **Chapter `status`.** `chapters.json` has `status: draft | complete`. The validator only enforces 10 to 14 stops, region spread and `checked` sources on `complete` chapters, so set it when a chapter is finished.
- **`debate` field.** A stop may carry a one-sentence `debate` note, shown on the card under "What's in question".
- **Scale strip.** It is a horizontal bar under the map (and a large one on the landing page), not a vertical rail.
- **Labels** are drawn on the canvas in screen space, with overlap skipping. There are no HTML labels.
- **Draft map layers.** `content/human/map/paleo.geojson`, `hominins.geojson`, `dispersal.geojson`, `cities.geojson` and `routes.geojson` are hand-drawn seeds. Milestone 2 replaces `paleo` with the De Groeve and ice-sheet data (needs `brew install gdal`) and extends the others.
- **Polity slices** exist only for 3000 to 1200 BCE. Extend `YEARS` in `scripts/human/fetch-polities.mjs`.
- **Phone layout.** Below 760 px the top bar scrolls away inside Human Story so the map can stick to the top of the screen.
- **Nav.** With seven items, the nav hides its emoji icons between 761 and 1180 px.

Known rough edges left for milestone 2: map labels can still crowd each other near a highlighted place; the Sahul route stops short of Australia; images are not used yet (the card supports them); the chart component has only been used for world population.

### Friday run handoff (2026-11-13)

The scheduled night-1 job (2:15 AM Fri) failed to start: an API authentication error (403) ended it after a few seconds, with no work done. The Friday usage check-in ran the same units instead, on Opus, with up to three agents in separate worktrees, merged into `human-story`. **Committed locally only: not pushed.**

- **Map data:** polity slices now run 3000 BCE to 2000 CE (every 100 years from 1 CE to 1800, plus 1850, 1900, 1914, 1950, 2000). Total `public/data/human` is 2.8 MB, under the 4 MB budget.
- **Chapters drafted:** 1 (12 stops, 4 deep dives), 3 (14, 5), 5 (14, 5), 6 (14, 5), 7 (14, 4). All stay `draft`: `complete` needs every stop `checked`, which only the verifier pass sets. Content now has 80 stops and 235 sources; every DOI was checked against Crossref.
- **src/ change:** about 25 lines in `src/human/map/engine.ts` so the new `farming` layer (`content/human/map/farming.geojson`) draws.
- **Merges:** sources, cities and routes were merged by id. Tikal appeared in chapters 5 and 6 with different spans and now runs 600 BCE to 950 CE.
- **Choices where the plan was unclear:**
  - Chapter 1: Jebel Irhoud and Olorgesailie are older than the chapter's start, so they sit at -298000 and their `dateNote` gives the true ages. Pinnacle Point was added. No early dispersal lines were drawn, since they would show in later chapters too.
  - Chapter 3: millet and rice, maize and Mehrgarh stops were added for regional balance. "Pottery, weaving, beer and bread" is folded in, and Newgrange is left out because no dated source opened. The farming map stop is set at -2500.
  - Chapter 5: coinage is folded into Persia; Athens, Greek science and Alexandria are one stop; Roman law was dropped (no source opened).
  - Chapter 6: universities were dropped, and movable type and Gutenberg are folded into chinese-inventions.
  - Chapter 7: Russia crossing Siberia was dropped (no source opened), and the circumnavigation is folded into atlantic-crossing. The intro wording was changed so it doesn't clash with chapter 6's Norse and Polynesian stops.
- **For the verifier (weaker sourcing):**
  - Chapter 3: the -7000 start of the farming spread lines and the span for domestic forms.
  - Chapter 7: Met essays, the Pitt Tokugawa page and Parker 2008 were read only through search results. The Cajamarca date is given as 1532 to 1533.
  - Chapter 1: Florisbad's age rests on a university news page.
  - Many UNESCO, Met and Britannica pages blocked automated fetching.
- **Map gaps found:** the engine draws no `highlight.polities`, and the projection can't rotate, so the Polynesia stop uses the world view.
- **Not looked at in the browser:** chapters 1, 5, 6 and 7's map states.
- **Still to do (section 9 order):** chapters 8 and 9, finishing chapters 2 and 4, then the verifier pass.
- **Usage at handoff:** weekly 54%, 5-hour window 86%.
