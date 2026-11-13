import type { Year } from './types';

/** The story starts with the earliest known Homo sapiens, about 300,000 years ago. */
export const START: Year = -298000;
export const NOW: Year = new Date().getFullYear();
/** Average human generation time over the last 250,000 years (Wang et al. 2023, Science Advances: 26.9 years). */
export const GEN_YEARS = 27;

const sig = (n: number, digits: number) => {
  if (n === 0) return 0;
  const m = Math.pow(10, Math.floor(Math.log10(Math.abs(n))) - digits + 1);
  return Math.round(n / m) * m;
};
const num = (n: number) => n.toLocaleString('en-US');

/** Years before 10,000 BCE read as "N years ago"; later ones as calendar dates. */
const isDeep = (y: Year) => y < -10000;
const yearsAgo = (y: Year) => sig(2000 - y, 2000 - y >= 100000 ? 2 : 3);

function one(y: Year): string {
  if (isDeep(y)) return `${num(yearsAgo(y))} years ago`;
  if (y < 0) return `${num(-y)} BCE`;
  return y < 1500 ? `${y} CE` : String(y);
}

/** "about 60,000 to 50,000 years ago", "about 3300 BCE", "2600 to 1900 BCE", "1914". */
export function fmtWhen(year: Year, yearEnd?: Year, precision: 'exact' | 'circa' | 'range' = 'exact'): string {
  const about = precision === 'circa' || isDeep(year) ? 'about ' : '';
  if (yearEnd == null) return about + one(year);
  const a = one(year), b = one(yearEnd);
  // Share the unit when both ends have the same one: "60,000 to 50,000 years ago", "2600 to 1900 BCE".
  for (const unit of [' years ago', ' BCE', ' CE']) {
    if (a.endsWith(unit) && b.endsWith(unit)) return `${about}${a.slice(0, -unit.length)} to ${b}`;
  }
  return `${about}${a} to ${b}`;
}

export function generationsAgo(year: Year): number {
  return sig((NOW - year) / GEN_YEARS, 2);
}
export function fmtGenerations(year: Year): string {
  const g = generationsAgo(year);
  if (g < 1) return 'within living memory';
  return `about ${num(g)} generation${g === 1 ? '' : 's'} ago`;
}

/** Estimated world population at a year, interpolated on a log scale. Null before the series begins. */
export function populationAt(points: [Year, number][], year: Year): number | null {
  if (!points.length || year < points[0][0]) return null;
  for (let i = 1; i < points.length; i++) {
    const [y1, v1] = points[i];
    if (year <= y1) {
      const [y0, v0] = points[i - 1];
      const t = (year - y0) / (y1 - y0 || 1);
      return Math.exp(Math.log(v0) + t * (Math.log(v1) - Math.log(v0)));
    }
  }
  return points[points.length - 1][1];
}
export function fmtPeople(n: number): string {
  if (n >= 1e9) return `${(sig(n, 2) / 1e9).toLocaleString('en-US')} billion`;
  if (n >= 1e6) return `${(sig(n, 2) / 1e6).toLocaleString('en-US')} million`;
  return num(sig(n, 2));
}

/** Position of a year on the to-scale strip, 0 (the start) to 1 (today). */
export const scalePos = (year: Year) => Math.min(1, Math.max(0, (year - START) / (NOW - START)));
