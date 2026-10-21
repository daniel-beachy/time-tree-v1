import type { Tree } from './data';

/** A node of the "display tree": only branching points and leaves (unary chains collapsed). */
export interface DNode {
  i: number; // index into tree.nodes
  parent: DNode | null;
  children: DNode[];
  age: number;
  /** named groups collapsed into the branch leading to this node (youngest first) */
  via: number[];
  leaves: number;
  /** dominant group of descendant species, or 'mixed' */
  group: string;
  // layout
  angle?: number;
  r?: number;
  x?: number;
  y?: number;
  order?: number;
}

/** Collapse unary chains under `rootIdx` into a tree of branching nodes and leaves. */
export function displayTree(tree: Tree, rootIdx: number, keep?: Set<number>): DNode {
  // keep: optional set of species leaf node indices to restrict to (Build-a-tree)
  const include = (i: number): boolean => {
    if (!keep) return true;
    return incl.get(i) ?? false;
  };
  const incl = new Map<number, boolean>();
  if (keep) {
    const mark = (i: number): boolean => {
      let any = keep.has(i);
      for (const c of tree.children[i]) if (mark(c)) any = true;
      incl.set(i, any);
      return any;
    };
    mark(rootIdx);
  }

  const build = (i: number, parent: DNode | null, via: number[]): DNode => {
    const kids = tree.children[i].filter(include);
    if (kids.length === 1 && i !== rootIdx) {
      return build(kids[0], parent, tree.nodes[i].n ? [i, ...via] : via);
    }
    const d: DNode = { i, parent, children: [], age: tree.nodes[i].a, via, leaves: 0, group: 'mixed' };
    if (i === rootIdx && kids.length === 1) {
      // root with a single child: descend so the display root is a real branching point
      return build(kids[0], parent, tree.nodes[i].n ? [i, ...via] : via);
    }
    d.children = kids.map((k) => build(k, d, []));
    if (!d.children.length) {
      d.leaves = 1;
      d.group = tree.byNode.get(i)?.group ?? 'other';
    } else {
      d.leaves = d.children.reduce((s, c) => s + c.leaves, 0);
      const gs = new Set(d.children.map((c) => c.group));
      d.group = gs.size === 1 ? [...gs][0] : 'mixed';
    }
    return d;
  };
  return build(rootIdx, null, []);
}

export function eachNode(d: DNode, f: (d: DNode) => void) {
  f(d);
  for (const c of d.children) eachNode(c, f);
}

export function leavesOf(d: DNode): DNode[] {
  const out: DNode[] = [];
  eachNode(d, (n) => { if (!n.children.length) out.push(n); });
  return out;
}

/** Sort children so bigger clades come last ("ladderize") — gives a tidier tree. */
export function ladderize(d: DNode) {
  d.children.sort((a, b) => a.leaves - b.leaves);
  d.children.forEach(ladderize);
}
