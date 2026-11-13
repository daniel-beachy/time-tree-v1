import type { ChapterData, HumanIndex, Series } from './types';

const BASE = './data/human/';
const cache = new Map<string, Promise<unknown>>();

/** Fetch a file under public/data/human/ once. */
export function loadJson<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(BASE + path).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p as Promise<T>;
}

export const loadIndex = () => loadJson<HumanIndex>('index.json');
export const loadChapter = (id: string) => loadJson<ChapterData>(`chapters/${id}.json`);
export const loadSeries = () => loadJson<Series[]>('series.json');
