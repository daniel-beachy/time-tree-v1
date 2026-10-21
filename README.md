# Deep Roots 🌱

**How is all life related?** Deep Roots is an interactive guide to the family tree of life, built on
divergence times from [TimeTree](https://timetree.org). Pick any two species to find when they last
shared an ancestor, then see what the Earth looked like at the time.

**Live site:** https://daniel-beachy.github.io/time-tree-v1/

## What's inside

| Mode | What it does |
| --- | --- |
| **Relate** | Pick two species to see when they split, their common ancestor, what Earth was like then, both lineages step by step, who else descends from that ancestor, and an expert panel with the CI, every source study (PubMed links) and a CSV export. |
| **Tree of Life** | A zoomable radial tree of the whole collection, with world-event rings, search, and clade details. |
| **Deep Time** | Your own family history: every split in a species' lineage, set against 4.5 billion years of world events. |
| **Tours** | Short guided stories, such as why whales aren't fish and why birds are dinosaurs. Every date is pulled live from the data. |
| **Quiz** | Endless questions generated from the data: "who's closer?", "when did they split?" (on a log slider), odd one out, and before or after an event. You can focus it on specific species. |
| **Build a Tree** | Add any species to get a dated tree. Export it as Newick, SVG or PNG, or share the link. |

Every view has a shareable URL (hash routes such as `#/relate/9606/9685`). Plain-language explainers
(❓) are throughout, and a Stretched/Linear time-scale toggle shows true proportions.

## How the data works

- **Snapshot:** `public/data/*.json` holds about 440 curated species. Each one has a full TimeTree
  timeline, photos from iNaturalist, and the per-node source studies. These are merged into one dated
  tree, so the site loads instantly.
- **Live species:** any other species can be searched (iNaturalist autocomplete) and fetched from
  TimeTree on demand. TimeTree's API sends no CORS headers, so these requests go through a tiny
  Cloudflare Worker proxy (`worker/`). The proxy is allowlisted to TimeTree's read-only endpoints and
  edge-cached for 7 days.

## Run locally

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

The local dev server can use the deployed proxy, since `localhost:5173` and `localhost:4173` are
allowed origins. To use your own proxy, set `VITE_TIMETREE_PROXY=https://your-worker.example.dev`.

### Rebuild the data snapshot

```bash
node scripts/build-data.mjs            # uses scripts/.cache for already-fetched responses
node scripts/build-data.mjs --refresh  # re-download everything from TimeTree and iNaturalist
```

The species list lives in `scripts/species.mjs`. Requests are cached and rate-limited. A full
refresh takes a few minutes.

### Deploy the proxy (optional)

```bash
cd worker
npx wrangler deploy
```

## Deployment

Each push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages.

## Credits

Divergence times are from **TimeTree 5**: Kumar S, et al. (2022), *Molecular Biology and Evolution*
39:msac174. Photos are © their iNaturalist and Wikimedia authors. Descriptions are from Wikipedia.
World-event dates follow the ICS chronostratigraphic chart. This project is independent and not
affiliated with TimeTree.
