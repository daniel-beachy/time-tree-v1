// The Human Story map: a world map drawn on canvas that filters its layers by year and animates between stops.
//
// How it works:
// - One base projection (Equal Earth, fitted to the canvas). Every feature is projected once into a Path2D.
// - The view is a 2D transform {k, x, y} applied on top, so panning, zooming and animating never re-project.
// - A layer is a set of features plus a draw function. Features carry `from`/`to` (or `date`) years and a layer
//   draws only what exists at the current year. The year itself is animated, so things appear in sequence.
// Adding a layer: add its id to LayerId, load it in `loadLayer`, and draw it in `draw` at the right depth.
import { geoArea, geoCentroid, geoEqualEarth, geoPath, interpolateZoom, select, zoom as d3zoom, zoomIdentity, type GeoPermissibleObjects, type GeoProjection, type ZoomBehavior } from 'd3';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import { feature } from 'topojson-client';
import { loadJson } from '../lib/content';
import type { LayerId, MapState, RegionId } from '../lib/types';

type Props = Record<string, unknown> & { id?: string; name?: string; from?: number; to?: number; date?: number; kind?: string; label?: string };
type Feat = Feature<Geometry, Props>;
interface Drawn { f: Feat; path: Path2D | null; xy: [number, number] | null; pts?: [number, number][] }
interface View { k: number; x: number; y: number }

/** Region views as [west, south, east, north]. */
export const REGION_BOX: Record<Exclude<RegionId, 'global'>, [number, number, number, number]> = {
  africa: [-20, -36, 54, 38],
  'sw-asia': [24, 10, 66, 44],
  europe: [-12, 34, 46, 71],
  's-asia': [60, 4, 98, 38],
  'e-asia': [95, 18, 148, 54],
  'se-asia-pacific': [92, -46, 180, 24],
  'n-america': [-168, 12, -52, 74],
  'c-s-america': [-96, -56, -32, 24],
};

const COLORS = {
  water: '#0b1418', land: '#5a4a33', coast: '#8c7755', shelf: '#473c2b', ice: 'rgba(223,233,238,0.78)',
  accent: '#f0b35a', accent2: '#d9694a', text: '#f3ead9', muted: '#a89a84', halo: 'rgba(11,20,24,0.85)',
};
// Muted fills for states and empires; a polity's colour is picked from its name so it stays the same across slices.
const POLITY_COLORS = ['#c98f4a', '#b5654c', '#8f9a5b', '#6f93a0', '#a07fb0', '#c2a24a', '#7d8fc0', '#b0747f'];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/** A polities slice is only shown within this many years after its date, so a stale slice never stands in for a missing one. */
const POLITY_TOLERANCE = 600;
const DURATION = 750;

export class MapEngine {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private projection: GeoProjection = geoEqualEarth();
  private sphere: Path2D | null = null;
  private layers = new Map<string, Drawn[]>();
  private raw = new Map<string, Feat[]>();
  private loading = new Set<string>();
  private view: View = { k: 1, x: 0, y: 0 };
  private year = 0;
  private alpha = new Map<LayerId, number>();
  private state: MapState | null = null;
  private anim: { t0: number; from: View; to: View; y0: number; y1: number; a0: Map<LayerId, number> } | null = null;
  private raf = 0;
  private zoom: ZoomBehavior<HTMLCanvasElement, unknown>;
  private userMoved = false;
  private destroyed = false;
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Called after each draw with the screen position of the active place (or null), so the page can position a marker. */
  onDraw?: (place: [number, number] | null, userMoved: boolean) => void;
  place: { lat: number; lon: number } | null = null;

  private canvas: HTMLCanvasElement;
  private polityYears: number[];

  constructor(canvas: HTMLCanvasElement, polityYears: number[]) {
    this.canvas = canvas;
    this.polityYears = polityYears;
    this.ctx = canvas.getContext('2d')!;
    this.zoom = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, 14])
      .on('zoom', (e) => {
        if (!e.sourceEvent) return; // programmatic syncs are ours
        this.anim = null;
        this.userMoved = true;
        this.view = { k: e.transform.k, x: e.transform.x, y: e.transform.y };
        this.requestDraw();
      });
    select(canvas).call(this.zoom).on('dblclick.zoom', null);
  }

  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); select(this.canvas).on('.zoom', null); }

  /** Call when the canvas's CSS size changes. */
  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    const first = this.w === 0;
    this.w = w; this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.projection = geoEqualEarth().fitExtent([[8, 8], [w - 8, h - 8]], { type: 'Sphere' });
    this.zoom.translateExtent([[0, 0], [w, h]]).extent([[0, 0], [w, h]]);
    this.sphere = new Path2D(geoPath(this.projection)({ type: 'Sphere' }) ?? '');
    for (const [key, feats] of this.raw) this.layers.set(key, this.project(feats));
    if (this.state) { this.view = this.viewFor(this.state); this.anim = null; this.syncZoom(); }
    if (first && this.state) this.setState(this.state, true);
    this.requestDraw();
  }

  /** Move to a stop's map state. */
  setState(state: MapState, instant = false) {
    this.state = state;
    this.userMoved = false;
    for (const id of state.layers) this.ensure(id, state.year);
    if (!this.w) return;
    const to = this.viewFor(state);
    if (instant || this.reduceMotion) {
      this.view = to; this.year = state.year; this.anim = null;
      this.alpha = new Map(state.layers.map((l) => [l, 1]));
      this.syncZoom();
    } else {
      this.anim = { t0: performance.now(), from: { ...this.view }, to, y0: this.year || state.year, y1: state.year, a0: new Map(this.alpha) };
    }
    this.requestDraw();
  }

  resetView() { if (this.state) this.setState(this.state); }

  // ── views ──────────────────────────────────────────────────────────────────────────────────────
  private viewFor(s: MapState): View {
    const { w, h } = this;
    if (s.view === 'world' || s.view === 'global') return { k: 1, x: 0, y: 0 };
    if (typeof s.view === 'string') {
      const [west, south, east, north] = REGION_BOX[s.view];
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) {
        const lon = west + ((east - west) * i) / 8, lat = south + ((north - south) * i) / 8;
        for (const p of [[lon, south], [lon, north], [west, lat], [east, lat]] as [number, number][]) { const q = this.projection(p); if (q) pts.push(q); }
      }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const k = Math.max(1, Math.min(14, 0.92 * Math.min(w / (x1 - x0), h / (y1 - y0))));
      return this.clamp({ k, x: w / 2 - ((x0 + x1) / 2) * k, y: h / 2 - ((y0 + y1) / 2) * k });
    }
    const p = this.projection(s.view.center) ?? [w / 2, h / 2];
    // Zoom levels are authored for a wide map; a narrow (phone) map shows the same area by scaling with its shape.
    const k = Math.max(1, s.view.zoom * Math.min(1, (h / w) * 1.9));
    return this.clamp({ k, x: w / 2 - p[0] * k, y: h / 2 - p[1] * k });
  }
  private clamp(v: View): View {
    const { w, h } = this;
    return { k: v.k, x: Math.min(0, Math.max(w - w * v.k, v.x)), y: Math.min(0, Math.max(h - h * v.k, v.y)) };
  }
  private syncZoom() {
    select(this.canvas).call(this.zoom.transform, zoomIdentity.translate(this.view.x, this.view.y).scale(this.view.k));
  }

  // ── data ───────────────────────────────────────────────────────────────────────────────────────
  private polityKey(year: number): string | null {
    const y = [...this.polityYears].reverse().find((v) => v <= year);
    return y != null && year - y <= POLITY_TOLERANCE ? `polities-${y}` : null;
  }
  private ensure(id: LayerId, year: number) {
    const keys = id === 'land' ? ['land-110m', 'land-50m'] : id === 'polities' ? [this.polityKey(year)].filter((k): k is string => !!k) : [id];
    for (const key of keys) {
      if (this.raw.has(key) || this.loading.has(key)) continue;
      this.loading.add(key);
      loadJson<unknown>(`map/${key}.json`).then((data) => {
        if (this.destroyed) return;
        const feats = toFeatures(data, key).map(rewind);
        this.raw.set(key, feats);
        if (this.w) this.layers.set(key, this.project(feats));
        this.requestDraw();
      }).catch(() => { /* a missing layer just does not draw */ }).finally(() => this.loading.delete(key));
    }
  }
  private project(feats: Feat[]): Drawn[] {
    const path = geoPath(this.projection);
    return feats.map((f) => {
      if (f.geometry.type === 'Point') return { f, path: null, xy: this.projection(f.geometry.coordinates as [number, number]) };
      const d = path(f as GeoPermissibleObjects);
      const c = f.geometry.type === 'LineString' ? null : this.projection(geoCentroid(f as GeoPermissibleObjects));
      const pts = f.geometry.type === 'LineString'
        ? (f.geometry.coordinates as Position[]).map((p) => this.projection(p as [number, number])).filter((p): p is [number, number] => !!p)
        : undefined;
      return { f, path: d ? new Path2D(d) : null, xy: c, pts };
    });
  }

  // ── drawing ────────────────────────────────────────────────────────────────────────────────────
  private requestDraw() {
    if (this.raf || this.destroyed) return;
    this.raf = requestAnimationFrame((now) => { this.raf = 0; this.frame(now); });
  }
  private frame(now: number) {
    const a = this.anim;
    if (a && this.state) {
      const t = Math.min(1, (now - a.t0) / DURATION);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // interpolateZoom works on [centre x, centre y, visible width] and gives the smooth "zoom out, pan, zoom in" path.
      const { w, h } = this;
      const v0: [number, number, number] = [(w / 2 - a.from.x) / a.from.k, (h / 2 - a.from.y) / a.from.k, w / a.from.k];
      const v1: [number, number, number] = [(w / 2 - a.to.x) / a.to.k, (h / 2 - a.to.y) / a.to.k, w / a.to.k];
      const [cx, cy, vw] = interpolateZoom(v0, v1)(e);
      const k = w / vw;
      this.view = { k, x: w / 2 - cx * k, y: h / 2 - cy * k };
      this.year = a.y0 + (a.y1 - a.y0) * e;
      const want = new Set(this.state.layers);
      for (const id of new Set<LayerId>([...a.a0.keys(), ...want])) {
        const from = a.a0.get(id) ?? 0, to = want.has(id) ? 1 : 0;
        this.alpha.set(id, from + (to - from) * e);
      }
      if (t >= 1) {
        this.anim = null;
        this.view = a.to; this.year = a.y1;
        for (const [id, v] of this.alpha) if (v <= 0) this.alpha.delete(id);
        this.syncZoom();
      } else this.requestDraw();
    }
    this.draw();
  }

  private alive(p: Props): boolean {
    const y = this.year;
    return (p.from == null || y >= p.from) && (p.to == null || y <= p.to);
  }

  private draw() {
    const { ctx, dpr, view: { k, x, y }, w, h } = this;
    if (!w || !this.state) return;
    const s = this.state;
    const px = 1 / k; // one screen pixel in map units
    const a = (id: LayerId) => this.alpha.get(id) ?? 0;
    const moving = !!this.anim;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (this.sphere) { ctx.fillStyle = COLORS.water; ctx.fill(this.sphere); }

    // Land exposed by low seas goes under the modern land so the two read as one landmass.
    const paleo = this.layers.get('paleo') ?? [];
    if (a('paleo') > 0) {
      ctx.globalAlpha = a('paleo'); ctx.fillStyle = COLORS.shelf;
      for (const d of paleo) if (d.path && d.f.properties.kind === 'shelf' && this.alive(d.f.properties)) ctx.fill(d.path);
    }
    ctx.globalAlpha = 1;
    const land = (!moving && this.layers.get('land-50m')) || this.layers.get('land-110m') || this.layers.get('land-50m');
    if (land) {
      ctx.fillStyle = COLORS.land; ctx.strokeStyle = COLORS.coast; ctx.lineWidth = 0.6 * px;
      for (const d of land) if (d.path) { ctx.fill(d.path); ctx.stroke(d.path); }
    }
    if (a('paleo') > 0) {
      ctx.globalAlpha = a('paleo'); ctx.fillStyle = COLORS.ice;
      for (const d of paleo) if (d.path && d.f.properties.kind === 'ice' && this.alive(d.f.properties)) ctx.fill(d.path);
    }

    if (a('hominins') > 0) {
      for (const d of this.layers.get('hominins') ?? []) {
        if (!this.alive(d.f.properties)) continue;
        ctx.globalAlpha = a('hominins') * 0.22; ctx.fillStyle = COLORS.accent2;
        const blob = d.path ?? circle(d.xy, 16 * px);
        if (!blob) continue;
        ctx.fill(blob);
        ctx.globalAlpha = a('hominins') * 0.7; ctx.strokeStyle = COLORS.accent2; ctx.lineWidth = 1 * px; ctx.setLineDash([4 * px, 4 * px]);
        ctx.stroke(blob); ctx.setLineDash([]);
      }
    }

    const polKey = this.polityKey(this.year);
    const polities = (polKey && this.layers.get(polKey)) || [];
    if (a('polities') > 0) {
      for (const d of polities) {
        if (!d.path) continue;
        const c = POLITY_COLORS[hash(String(d.f.properties.name)) % POLITY_COLORS.length];
        ctx.globalAlpha = a('polities') * 0.42; ctx.fillStyle = c; ctx.fill(d.path);
        ctx.globalAlpha = a('polities') * 0.9; ctx.strokeStyle = c; ctx.lineWidth = 1 * px; ctx.stroke(d.path);
      }
    }

    if (a('borders') > 0) {
      ctx.globalAlpha = a('borders') * 0.5; ctx.strokeStyle = COLORS.muted; ctx.lineWidth = 0.5 * px;
      for (const d of this.layers.get('borders') ?? []) if (d.path) ctx.stroke(d.path);
    }

    if (a('routes') > 0) {
      const hi = new Set(s.highlight?.routes ?? []);
      for (const d of this.layers.get('routes') ?? []) {
        if (!d.path || !this.alive(d.f.properties)) continue;
        const on = hi.has(String(d.f.properties.id));
        ctx.globalAlpha = a('routes') * (on ? 1 : 0.55); ctx.strokeStyle = COLORS.accent; ctx.lineWidth = (on ? 2.2 : 1.3) * px;
        ctx.setLineDash([6 * px, 5 * px]); ctx.stroke(d.path); ctx.setLineDash([]);
      }
    }

    // Dispersal routes fade in over the few thousand years after their date, so an animated year draws them in order.
    const routesShown: { d: Drawn; o: number }[] = [];
    if (a('dispersal') > 0) {
      for (const d of this.layers.get('dispersal') ?? []) {
        const date = d.f.properties.date ?? -Infinity;
        const o = Math.max(0, Math.min(1, (this.year - date) / 3000 + 0.15));
        if (!d.path || this.year < date) continue;
        routesShown.push({ d, o });
        ctx.globalAlpha = a('dispersal') * o; ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2 * px; ctx.stroke(d.path);
        const p = d.pts;
        if (p && p.length > 1) arrow(ctx, p[p.length - 2], p[p.length - 1], 7 * px, COLORS.accent);
      }
    }

    const cities = a('cities') > 0 ? (this.layers.get('cities') ?? []).filter((d) => d.xy && this.alive(d.f.properties)) : [];
    const hiPlaces = new Set(s.highlight?.places ?? []);
    for (const d of cities) {
      const on = hiPlaces.has(String(d.f.properties.id));
      ctx.globalAlpha = a('cities'); ctx.fillStyle = on ? COLORS.accent : COLORS.text;
      ctx.beginPath(); ctx.arc(d.xy![0], d.xy![1], (on ? 4 : 2.6) * px, 0, Math.PI * 2); ctx.fill();
      if (on) { ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 1.2 * px; ctx.beginPath(); ctx.arc(d.xy![0], d.xy![1], 8 * px, 0, Math.PI * 2); ctx.stroke(); }
    }

    // ── text, in screen space so it stays crisp and the same size at any zoom ──
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scr = (p: [number, number]): [number, number] => [p[0] * k + x, p[1] * k + y];
    const boxes: [number, number, number, number][] = [];
    const text = (label: string, at: [number, number], opt: { size?: number; color?: string; alpha?: number; dy?: number; italic?: boolean; force?: boolean } = {}) => {
      const size = opt.size ?? 12;
      ctx.font = `${opt.italic ? 'italic ' : ''}500 ${size}px "Space Grotesk", system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      const bx = at[0] - tw / 2, by = at[1] + (opt.dy ?? 0) - size / 2;
      if (bx < 2 || bx + tw > w - 2 || by < 2 || by + size > h - 2) return;
      // Skip a label that would sit on top of one already drawn.
      if (!opt.force && boxes.some(([x0, y0, x1, y1]) => bx < x1 + 4 && bx + tw > x0 - 4 && by < y1 + 2 && by + size > y0 - 2)) return;
      boxes.push([bx, by, bx + tw, by + size]);
      ctx.globalAlpha = opt.alpha ?? 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = COLORS.halo; ctx.strokeText(label, at[0], at[1] + (opt.dy ?? 0));
      ctx.fillStyle = opt.color ?? COLORS.text; ctx.fillText(label, at[0], at[1] + (opt.dy ?? 0));
    };

    for (const l of s.labels ?? []) { const p = this.projection([l.lon, l.lat]); if (p) text(l.text, scr(p), { size: 12, color: COLORS.muted, alpha: this.anim ? 0.5 : 1, italic: true, force: true }); }
    for (const d of cities) {
      const on = hiPlaces.has(String(d.f.properties.id));
      if (on || k >= 2.5) text(String(d.f.properties.name), scr(d.xy!), { dy: -13, size: on ? 13 : 11, color: on ? COLORS.accent : COLORS.text, alpha: a('cities'), force: on });
    }
    if (a('polities') > 0) {
      for (const d of polities) {
        // Label a polity once it is big enough on screen to carry its name.
        const areaPx = Math.sqrt(geoArea(d.f as GeoPermissibleObjects)) * 180 * k;
        if (d.xy && areaPx > 26) text(String(d.f.properties.name), scr(d.xy), { size: 11, alpha: a('polities') * 0.95 });
      }
    }
    if (a('hominins') > 0) for (const d of this.layers.get('hominins') ?? []) if (d.xy && this.alive(d.f.properties)) text(String(d.f.properties.name), scr(d.xy), { size: 11, color: '#e8a48f', alpha: a('hominins'), italic: true, dy: d.path ? 0 : 22 });
    for (const { d, o } of routesShown) {
      const p = d.pts, label = d.f.properties.label;
      if (label && p && p.length) text(String(label), scr(p[p.length - 1]), { dy: 16, size: 11, color: COLORS.accent, alpha: a('dispersal') * o });
    }
    ctx.globalAlpha = 1;

    const place = this.place && this.projection([this.place.lon, this.place.lat]);
    this.onDraw?.(place ? scr(place) : null, this.userMoved);
  }
}

function circle(xy: [number, number] | null, r: number): Path2D | null {
  if (!xy) return null;
  const p = new Path2D(); p.arc(xy[0], xy[1], r, 0, Math.PI * 2); return p;
}
function arrow(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], size: number, color: string) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(b[0] + Math.cos(ang) * size * 0.6, b[1] + Math.sin(ang) * size * 0.6);
  ctx.lineTo(b[0] + Math.cos(ang + 2.5) * size, b[1] + Math.sin(ang + 2.5) * size);
  ctx.lineTo(b[0] + Math.cos(ang - 2.5) * size, b[1] + Math.sin(ang - 2.5) * size);
  ctx.closePath(); ctx.fill();
}

/** Accepts GeoJSON or TopoJSON and returns plain features. */
function toFeatures(data: unknown, key: string): Feat[] {
  const d = data as { type: string; objects?: Record<string, unknown>; features?: Feat[] };
  if (d.type === 'Topology' && d.objects) {
    // The borders layer is drawn as outlines only; everything else keeps its own features.
    const name = Object.keys(d.objects).find((n) => (key.startsWith('land') ? n === 'land' : true))!;
    const fc = feature(d as never, d.objects[name] as never) as unknown as FeatureCollection<Geometry, Props> | Feat;
    return fc.type === 'FeatureCollection' ? fc.features : [fc];
  }
  return d.features ?? [];
}

/**
 * d3 reads polygon winding on the sphere: a ring wound the other way means "everything except this shape".
 * Hand-drawn and converted files can go either way, so flip any polygon that claims more than half the globe.
 */
function rewind(f: Feat): Feat {
  const fix = (rings: Position[][]) => (geoArea({ type: 'Polygon', coordinates: [rings[0]] }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings);
  const g = f.geometry;
  if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: fix(g.coordinates) } };
  if (g.type === 'MultiPolygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map(fix) } };
  return f;
}
