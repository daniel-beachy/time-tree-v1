import type { Species, Tree } from './data';

export function splitAge(tree: Tree, a: Species, b: Species) {
  const m = tree.mrca(a.node, b.node);
  return { node: m, age: tree.nodes[m].a, n: tree.nodes[m] };
}

/** Nearest named group at or above node i */
export function namedGroup(tree: Tree, i: number): number {
  for (let n = i; n >= 0; n = tree.nodes[n].p) if (tree.nodes[n].n) return n;
  return 0;
}

export function pick<T>(arr: T[], rnd = Math.random): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ages are "clearly different" when one is at least 25% older (avoids trick questions inside CIs). */
export const clearlyDifferent = (x: number, y: number) => Math.max(x, y) / Math.max(0.001, Math.min(x, y)) > 1.25;

export interface CloserQ {
  type: 'closer';
  target: Species;
  options: [Species, Species];
  answer: number; // index into options
  ages: [number, number];
}

export interface WhenQ { type: 'when'; a: Species; b: Species; age: number; lo: number; hi: number }
export interface OddQ { type: 'odd'; options: Species[]; answer: number; pairAge: number; outAge: number }
export interface EventQ { type: 'event'; a: Species; b: Species; age: number; event: { title: string; age: number; icon: string }; answer: 'before' | 'after' }
export type Question = CloserQ | WhenQ | OddQ | EventQ;

function famous(tree: Tree) {
  return tree.allSpecies().filter((s) => s.famous && !tree.nodes[tree.nodes[s.node].p]?.u);
}

/** "Is <target> more closely related to X or Y?" — optionally forcing target / one option. */
export function makeCloser(tree: Tree, rnd = Math.random, target?: Species, include?: Species): CloserQ | null {
  const pool = famous(tree);
  for (let tries = 0; tries < 200; tries++) {
    const t = target ?? pick(pool, rnd);
    const x = include && include.id !== t.id ? include : pick(pool, rnd);
    const y = pick(pool, rnd);
    if (new Set([t.id, x.id, y.id]).size < 3) continue;
    const ax = splitAge(tree, t, x).age, ay = splitAge(tree, t, y).age;
    if (!clearlyDifferent(ax, ay)) continue;
    // Prefer surprising / interesting questions: the closer one is not the same broad group as target
    if (tries < 120 && x.group === y.group && rnd() < 0.6) continue;
    const opts: [Species, Species] = rnd() < 0.5 ? [x, y] : [y, x];
    const ages: [number, number] = opts[0] === x ? [ax, ay] : [ay, ax];
    return { type: 'closer', target: t, options: opts, answer: ages[0] < ages[1] ? 0 : 1, ages };
  }
  return null;
}

export function makeWhen(tree: Tree, rnd = Math.random, a?: Species, b?: Species): WhenQ | null {
  const pool = famous(tree);
  for (let tries = 0; tries < 100; tries++) {
    const x = a ?? pick(pool, rnd), y = b ?? pick(pool, rnd);
    if (x.id === y.id) continue;
    const { n } = splitAge(tree, x, y);
    if (n.u || n.a <= 0) continue;
    return { type: 'when', a: x, b: y, age: n.a, lo: n.lo, hi: n.hi };
  }
  return null;
}

export function makeOdd(tree: Tree, rnd = Math.random, seed?: Species): OddQ | null {
  const pool = famous(tree);
  for (let tries = 0; tries < 300; tries++) {
    const a = seed ?? pick(pool, rnd), b = pick(pool, rnd), c = pick(pool, rnd);
    if (new Set([a.id, b.id, c.id]).size < 3) continue;
    const ab = splitAge(tree, a, b).age, ac = splitAge(tree, a, c).age, bc = splitAge(tree, b, c).age;
    // need a clear pair: the two closest share an ancestor much younger than the outsider
    const trip = [
      { pair: [a, b], out: c, pa: ab, oa: Math.min(ac, bc) },
      { pair: [a, c], out: b, pa: ac, oa: Math.min(ab, bc) },
      { pair: [b, c], out: a, pa: bc, oa: Math.min(ab, ac) },
    ].sort((p, q) => p.pa - q.pa)[0];
    if (!clearlyDifferent(trip.pa, trip.oa) || trip.oa / trip.pa < 1.5) continue;
    // make it non-obvious sometimes: skip if the pair is same group and outsider a different group, 50% of the time
    if (tries < 150 && trip.pair[0].group === trip.pair[1].group && trip.out.group !== trip.pair[0].group && rnd() < 0.7) continue;
    const options = shuffle([...trip.pair, trip.out], rnd);
    return { type: 'odd', options, answer: options.indexOf(trip.out), pairAge: trip.pa, outAge: trip.oa };
  }
  return null;
}

/** "Did the split between A and B happen before or after <world event>?" — the event must sit clearly outside the CI. */
export function makeEvent(tree: Tree, events: { title: string; age: number; icon: string; major?: boolean }[], rnd = Math.random, a?: Species, b?: Species): EventQ | null {
  const pool = famous(tree);
  const evs = events.filter((e) => e.major && e.age < 4000);
  for (let tries = 0; tries < 200; tries++) {
    const x = a ?? pick(pool, rnd), y = b && tries < 100 ? b : pick(pool, rnd);
    if (x.id === y.id) continue;
    const { n } = splitAge(tree, x, y);
    if (n.u || n.a <= 0) continue;
    const ok = evs.filter((e) => clearlyDifferent(e.age, n.a) && (e.age > n.hi || e.age < n.lo));
    if (!ok.length) continue;
    // prefer events near the split — those are the interesting ones
    const sorted = ok.sort((p, q) => Math.abs(Math.log(p.age / n.a)) - Math.abs(Math.log(q.age / n.a)));
    const event = sorted[Math.floor(rnd() * Math.min(3, sorted.length))];
    return { type: 'event', a: x, b: y, age: n.a, event, answer: n.a > event.age ? 'before' : 'after' };
  }
  return null;
}
