import { graftTimeline, type RawNode, type StudyTable, type TimelineEntry } from './merge';
import { fetchTimeTree } from './live';

export interface Species {
  id: number;
  sci: string;
  name: string;
  group: string;
  famous: boolean;
  node: number;
  inat: number | null;
  wiki: string | null;
  photo: string | null;
  photoCredit: string | null;
  extinct?: boolean;
  /** short caveat shown with the species */
  note?: string;
  /** added at runtime from the live API rather than the snapshot */
  live?: boolean;
}

export interface Meta { built: string; ttVersion: number | null; groups: Record<string, string> }

export interface Study { author: string; year: number; title: string; pubmed: number | null; ref: string | null; time: number }

export const GROUP_COLORS: Record<string, string> = {
  mammal: '#ff9f6b',
  bird: '#7cc7ff',
  reptile: '#a6e36b',
  amphibian: '#5ef0c8',
  fish: '#4d9bff',
  insect: '#ffd166',
  arthropod: '#ffb46b',
  mollusk: '#f78fd0',
  invertebrate: '#c9a7ff',
  plant: '#6bdc8b',
  fungus: '#e0b48a',
  protist: '#9ae6e0',
  bacteria: '#ff6b81',
  archaea: '#ff8fab',
  other: '#b8c2e0',
};

export const GROUP_ICONS: Record<string, string> = {
  mammal: '🐾', bird: '🪶', reptile: '🦎', amphibian: '🐸', fish: '🐟', insect: '🐝', arthropod: '🦀',
  mollusk: '🐙', invertebrate: '🪸', plant: '🌿', fungus: '🍄', protist: '🔬', bacteria: '🦠', archaea: '🧫', other: '✨',
};

/** In-memory tree with parent/child links and fast ancestor queries. */
export class Tree {
  nodes: RawNode[];
  children: number[][] = [];
  depth: number[] = [];
  species = new Map<number, Species>();
  byNode = new Map<number, Species>();
  meta: Meta;
  private studyTable: StudyTable | null = null;
  private listeners = new Set<() => void>();
  version = 0;

  constructor(nodes: RawNode[], species: Species[], meta: Meta) {
    this.nodes = nodes;
    this.meta = meta;
    for (const s of species) this.addSpecies(s);
    this.reindex();
  }

  private addSpecies(s: Species) {
    this.species.set(s.id, s);
    this.byNode.set(s.node, s);
  }

  private reindex() {
    this.children = this.nodes.map(() => []);
    this.depth = new Array(this.nodes.length).fill(0);
    this.nodes.forEach((n, i) => {
      if (n.p >= 0) {
        this.children[n.p].push(i);
        this.depth[i] = this.depth[n.p] + 1;
      }
    });
    this.version++;
    this.listeners.forEach((f) => f());
  }

  subscribe(f: () => void) {
    this.listeners.add(f);
    return () => { this.listeners.delete(f); };
  }

  get root() { return 0; }

  allSpecies(): Species[] { return [...this.species.values()]; }

  /** path from node to root (inclusive) */
  ancestors(i: number): number[] {
    const out: number[] = [];
    for (let n = i; n >= 0; n = this.nodes[n].p) out.push(n);
    return out;
  }

  mrca(a: number, b: number): number {
    const seen = new Set(this.ancestors(a));
    for (let n = b; n >= 0; n = this.nodes[n].p) if (seen.has(n)) return n;
    return 0;
  }

  mrcaOf(ids: number[]): number {
    return ids.reduce((acc, i) => (acc < 0 ? i : this.mrca(acc, i)), -1);
  }

  /** Species leaf ids under a node */
  leavesUnder(i: number): Species[] {
    const out: Species[] = [];
    const stack = [i];
    while (stack.length) {
      const n = stack.pop()!;
      const sp = this.byNode.get(n);
      if (sp) out.push(sp);
      stack.push(...this.children[n]);
    }
    return out;
  }

  /** The nearest ancestor that actually branches within our species set (skips unary chains) */
  branchingAncestor(i: number): number {
    let n = this.nodes[i].p;
    while (n > 0 && this.children[n].length < 2) n = this.nodes[n].p;
    return Math.max(n, 0);
  }

  /** Best label for a node: its own name, else the nearest named ancestor in its unary chain. */
  label(i: number): string {
    const n = this.nodes[i];
    if (n.l != null) return this.byNode.get(i)?.name ?? `Taxon ${n.l}`;
    return n.n || '';
  }

  /** Named groups that a node's lineage passes through between `from` (exclusive) up to `to` (inclusive) */
  namedBetween(from: number, to: number): number[] {
    const out: number[] = [];
    for (let n = this.nodes[from].p; n >= 0; n = this.nodes[n].p) {
      if (this.nodes[n].n) out.push(n);
      if (n === to) break;
    }
    return out;
  }

  /** Full named lineage of a species, oldest first. */
  lineage(speciesId: number): number[] {
    const sp = this.species.get(speciesId);
    if (!sp) return [];
    return this.ancestors(sp.node).filter((n) => this.nodes[n].n || this.children[n].length > 1).reverse();
  }

  async studies(i: number): Promise<Study[]> {
    if (!this.studyTable) this.studyTable = await (await fetch(asset('data/studies.json'))).json();
    const rows = this.studyTable!.node[i] || [];
    return rows.map(([r, time]) => {
      const [author, year, title, pubmed, ref] = this.studyTable!.refs[r];
      return { author, year, title, pubmed, ref, time };
    });
  }

  /** Adds a species from the live TimeTree API. Returns the existing species if already present. */
  async addLive(sci: string, extra: Partial<Species> = {}): Promise<Species> {
    const existing = [...this.species.values()].find((s) => s.sci.toLowerCase() === sci.toLowerCase());
    if (existing) return existing;
    const enc = encodeURIComponent(sci);
    const [taxon, timeline] = await Promise.all([
      fetchTimeTree<{ taxon_id?: number; scientific_name?: string; message?: string }>(`/taxon/${enc}`),
      fetchTimeTree<TimelineEntry[] | { message?: string }>(`/timeline/${enc}/json`),
    ]);
    if (!taxon?.taxon_id || !Array.isArray(timeline) || !timeline.length) {
      throw new Error(`TimeTree doesn't have divergence data for “${sci}” yet.`);
    }
    const byId = this.species.get(taxon.taxon_id);
    if (byId) return byId;
    const { leaf } = graftTimeline(this.nodes, taxon.taxon_id, timeline);
    const sp: Species = {
      id: taxon.taxon_id,
      sci: taxon.scientific_name || sci,
      name: extra.name || taxon.scientific_name || sci,
      group: extra.group || 'other',
      famous: false,
      node: leaf,
      inat: extra.inat ?? null,
      wiki: extra.wiki ?? null,
      photo: extra.photo ?? null,
      photoCredit: extra.photoCredit ?? null,
      live: true,
    };
    this.addSpecies(sp);
    this.reindex();
    return sp;
  }
}

export function asset(path: string) {
  return import.meta.env.BASE_URL + path;
}

let treePromise: Promise<Tree> | null = null;
export function loadTree(): Promise<Tree> {
  treePromise ??= (async () => {
    const [t, s] = await Promise.all([
      fetch(asset('data/tree.json')).then((r) => r.json()),
      fetch(asset('data/species.json')).then((r) => r.json()),
    ]);
    return new Tree(t.nodes, s, t.meta);
  })();
  return treePromise;
}
