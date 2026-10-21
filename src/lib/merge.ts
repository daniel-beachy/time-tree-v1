// Merges TimeTree "timeline" responses (a species' full ancestry) into one dated tree.
// Shared by the data build script (Node) and the browser (live species / build-a-tree),
// so it must stay dependency-free and use only erasable TypeScript syntax.

export interface TimelineStudy {
  citation_num?: number;
  pubmed_id: number | null;
  ref_id: string | null;
  author: string;
  title: string;
  year: number;
  time: number;
  tree_count?: number;
}

export interface TimelineEntry {
  ncbi_id: number;
  name: { scientific: string; common: string };
  level: number;
  rank: string;
  branch: { ci_high: number; ci_low: number; summary_age: number; adjusted_age: number };
  studies?: TimelineStudy[];
}

/** Compact tree node. Field names are short because tree.json ships to the browser. */
export interface RawNode {
  /** parent index (-1 for root) */
  p: number;
  /** scientific name ('' when unnamed) */
  n: string;
  /** rank ('' when unknown) */
  r: string;
  /** NCBI taxon id (-1 when unnamed) */
  x: number;
  /** age in million years (TimeTree adjusted age; 0 for leaves) */
  a: number;
  /** 95% CI low / high (0 when not available) */
  lo: number;
  hi: number;
  /** precomputed (summary) age before adjustment */
  s: number;
  /** number of studies */
  k: number;
  /** leaf species NCBI id */
  l?: number;
  /** 1 when TimeTree has no time estimate for this node */
  u?: 1;
  /** TimeTree level (depth in the full TimeTree); used to match nodes when grafting */
  v: number;
}

export interface StudyTable {
  /** [author, year, title, pubmedId, refId] */
  refs: [string, number, string, number | null, string | null][];
  /** node index -> [[refIndex, time]] */
  node: Record<number, [number, number][]>;
}

export function mergeTimelines(
  inputs: { id: number; timeline: TimelineEntry[] }[],
  opts: { withStudies?: boolean } = {},
): { nodes: RawNode[]; leafOf: Map<number, number>; studies: StudyTable } {
  const nodes: RawNode[] = [];
  const children = new Map<number, Map<string, number>>();
  const leafOf = new Map<number, number>();
  const studies: StudyTable = { refs: [], node: {} };
  const refIndex = new Map<string, number>();


  const add = (parent: number, key: string, node: RawNode, src?: TimelineEntry) => {
    let kids = children.get(parent);
    if (!kids) children.set(parent, (kids = new Map()));
    const hit = kids.get(key);
    if (hit !== undefined) return hit;
    const idx = nodes.length;
    nodes.push(node);
    kids.set(key, idx);
    if (opts.withStudies && src?.studies?.length) {
      studies.node[idx] = src.studies.map((st) => {
        const rk = st.citation_num != null ? 'c' + st.citation_num : `${st.author}|${st.year}|${st.title}`;
        let ri = refIndex.get(rk);
        if (ri === undefined) {
          ri = studies.refs.length;
          refIndex.set(rk, ri);
          studies.refs.push([st.author, st.year, st.title, st.pubmed_id ?? null, st.ref_id ?? null]);
        }
        return [ri, st.time];
      });
    }
    return idx;
  };

  for (const { id, timeline } of inputs) {
    const path = [...timeline].sort((a, b) => a.level - b.level);
    let parent = -1;
    for (const e of path) {
      const node = entryToNode(e, parent);
      parent = add(parent, nodeKey(node), node, e);
    }
    const leafNode: RawNode = { p: parent, n: '', r: 'species', x: id, a: 0, lo: 0, hi: 0, s: 0, k: 0, l: id, v: 999 };
    const leaf = add(parent, nodeKey(leafNode), leafNode);
    leafOf.set(id, leaf);
  }

  // Ages must never be younger than a descendant's. Children always have larger indices than
  // their parent, so a reverse sweep is a post-order pass.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const p = nodes[i].p;
    if (p >= 0 && nodes[p].a < nodes[i].a) nodes[p].a = nodes[i].a;
  }
  return { nodes, leafOf, studies };
}

function entryToNode(e: TimelineEntry, parent: number): RawNode {
  const b = e.branch;
  const named = e.name?.scientific && e.name.scientific !== 'unnamed';
  const age = b.adjusted_age || b.summary_age || 0;
  return {
    p: parent,
    n: named ? e.name.scientific : '',
    r: e.rank && e.rank !== 'unknown' ? e.rank : '',
    x: e.ncbi_id,
    a: age,
    lo: b.ci_low || 0,
    hi: b.ci_high || 0,
    s: b.summary_age || 0,
    k: e.studies?.length ?? 0,
    v: e.level,
    ...(age ? {} : { u: 1 as const }),
  };
}

/** Identity of a TimeTree node: stable fields only (not `a`, which is adjusted after merging). */
export function nodeKey(n: RawNode): string {
  return n.l != null ? 'leaf|' + n.l : [n.v, n.x, n.n, n.s, n.lo, n.hi].join('|');
}

/**
 * Adds one more species' timeline to an existing merged tree, in place.
 * Returns the new leaf index (or the existing one), plus the indices of nodes that were created.
 */
export function graftTimeline(nodes: RawNode[], id: number, timeline: TimelineEntry[]): { leaf: number; created: number[] } {
  const kids = new Map<number, Map<string, number>>();
  nodes.forEach((n, i) => {
    let m = kids.get(n.p);
    if (!m) kids.set(n.p, (m = new Map()));
    m.set(nodeKey(n), i);
  });
  const created: number[] = [];
  const add = (parent: number, node: RawNode) => {
    const key = nodeKey(node);
    const hit = kids.get(parent)?.get(key);
    if (hit !== undefined) return hit;
    nodes.push(node);
    const idx = nodes.length - 1;
    created.push(idx);
    let m = kids.get(parent);
    if (!m) kids.set(parent, (m = new Map()));
    m.set(key, idx);
    return idx;
  };
  let parent = -1;
  for (const e of [...timeline].sort((a, b) => a.level - b.level)) parent = add(parent, entryToNode(e, parent));
  const leaf = add(parent, { p: parent, n: '', r: 'species', x: id, a: 0, lo: 0, hi: 0, s: 0, k: 0, l: id, v: 999 });
  for (let i = parent; i >= 0; i = nodes[i].p) {
    const p = nodes[i].p;
    if (p >= 0 && nodes[p].a < nodes[i].a) nodes[p].a = nodes[i].a;
  }
  return { leaf, created };
}
