# Deep Roots — design spec

An explorable, accurate guide to how all life is related, powered by [TimeTree](https://timetree.org).
Built for curious non-scientists without hiding the real science from experts.

## Decisions (from the design Q&A)

| Topic | Decision |
|---|---|
| Hosting | GitHub Pages (static) |
| Data | **Hybrid**: curated snapshot (≈500 species, full lineages, dated tree, studies) built by a script / GitHub Action → static JSON. Anything outside the snapshot goes live through a small Cloudflare Worker CORS proxy to `api.timetree.org`. |
| Modes | All connected: **Relate** (pairwise), **Explore** (tree of life), **Deep Time** (timeline), **Quiz**, **Tours**, **Build a Tree** |
| Learning | Quizzes, plain-language explainers in context, world-events overlay everywhere, expert panel |
| Look | Style B "cosmic deep-time" visuals (dark, glowing branches) with Style C's card/result presentation — restrained, no gimmicks |
| Rejected | "Earth history as one day" clock (everything interesting is crammed into the last hour) |
| Quiz hooks | Only when they're contextual — e.g. on the Relate page, a question about *those two* species that opens the quiz seeded with them |
| Imagery | Wikipedia summaries + iNaturalist photos/common names (both CORS-friendly, attributed) |
| Devices | Phone and desktop equally (touch pan / pinch zoom) |

## Data sources

* `api.timetree.org/timeline/{name}/json` — a species' full ancestry: every ancestor node with age, CI, rank, name and studies.
  Merging the timelines of N species yields the dated TimeTree subtree for them (nodes keyed by depth + age + CI).
* `api.timetree.org/mrca/id/{a}+{b}/json` — MRCA age, CI, and every individual study estimate (histogram in expert panel).
* `api.timetree.org/pairwise/{a}/{b}/json` — studies behind a pairwise divergence.
* `api.inaturalist.org/v1/taxa/autocomplete` — search any organism by common name; photos.
* `en.wikipedia.org/api/rest_v1/page/summary/{title}` — summary + image.

## Time scale

Deep time is extremely skewed (4,000 Myr of microbes, everything familiar in the last 500).
Timelines use a **log-ish scale** by default (with a linear toggle and an explainer for why).

## Repo layout

```
scripts/        data build pipeline (Node)
  species.mjs   curated species list
  build-data.mjs
worker/         Cloudflare Worker CORS proxy
src/            React + TypeScript + D3 app (Vite)
public/data/    generated JSON snapshot
```
