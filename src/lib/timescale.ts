// Deep time is wildly uneven: ~3,500 million years of microbes, everything familiar in the last ~500.
// The default "stretched" scale is logarithmic in (1 + age) so recent splits get room, while the
// linear scale is available to show true proportions.

export type ScaleMode = 'log' | 'linear';

export interface TimeScale {
  (mya: number): number;
  invert(x: number): number;
  domain: [number, number];
  range: [number, number];
  mode: ScaleMode;
  ticks(): number[];
}

/**
 * Maps an age (Mya) in [oldest, newest] onto [r0, r1]. In log mode the scale is log(c + age); the offset `c`
 * (default 1 My) sets where "stretching" kicks in — small trees pass their youngest fork so it gets room.
 */
export function timeScale(mode: ScaleMode, oldest: number, newest: number, r0: number, r1: number, c = 1): TimeScale {
  const f = (a: number) => (mode === 'log' ? Math.log10(c + Math.max(0, a)) : Math.max(0, a));
  const fi = (v: number) => (mode === 'log' ? Math.pow(10, v) - c : v);
  const d0 = f(oldest), d1 = f(newest);
  const s = ((a: number) => r0 + ((f(a) - d0) / (d1 - d0 || 1)) * (r1 - r0)) as TimeScale;
  s.invert = (x: number) => fi(d0 + ((x - r0) / (r1 - r0 || 1)) * (d1 - d0));
  s.domain = [oldest, newest];
  s.range = [r0, r1];
  s.mode = mode;
  s.ticks = () => {
    const lo = Math.min(oldest, newest), hi = Math.max(oldest, newest);
    const base = mode === 'log'
      ? [0, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 4000].filter((t) => t === 0 || t >= c / 10)
      : niceLinear(hi - lo);
    return base.filter((t) => t >= lo && t <= hi);
  };
  return s;
}

function niceLinear(span: number) {
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 250, 500, 1000].find((s) => span / s <= 8) ?? 1000;
  return Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => i * step);
}
