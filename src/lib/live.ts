// Live network helpers: TimeTree (via our CORS proxy), iNaturalist search, Wikipedia summaries.

export const PROXY = (import.meta.env.VITE_TIMETREE_PROXY as string | undefined) || 'https://deep-roots-timetree-proxy.daniel-beachy.workers.dev';

const memo = new Map<string, Promise<unknown>>();

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!memo.has(key)) {
    const p = fn().catch((e) => { memo.delete(key); throw e; });
    memo.set(key, p);
  }
  return memo.get(key) as Promise<T>;
}

export function fetchTimeTree<T>(path: string): Promise<T> {
  return cached('tt' + path, async () => {
    const res = await fetch(PROXY + path);
    const text = await res.text();
    try { return JSON.parse(text) as T; } catch { throw new Error('TimeTree returned an unexpected response'); }
  });
}

export interface MrcaResult {
  mrca_ttid: number;
  taxon_id: number;
  time_estimates: string;
  precomputed_age: number;
  precomputed_ci_low: number;
  precomputed_ci_high: number;
  adjusted_age: number;
}

export async function fetchMrca(ids: number[]): Promise<{ estimates: number[]; raw: MrcaResult } | null> {
  try {
    const raw = await fetchTimeTree<MrcaResult>(`/mrca/id/${ids.join('+')}/json`);
    const estimates = (raw.time_estimates || '').replace(/[{}]/g, '').split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return { estimates, raw };
  } catch {
    return null;
  }
}

export interface InatTaxon {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  iconic_taxon_name?: string;
  default_photo?: { square_url: string; medium_url: string; attribution: string } | null;
  wikipedia_url?: string | null;
  extinct?: boolean;
}

export function searchInat(q: string): Promise<InatTaxon[]> {
  return cached('inat' + q.toLowerCase(), async () => {
    const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(q)}&per_page=10&is_active=true`;
    const j = await (await fetch(url)).json();
    return (j.results || []) as InatTaxon[];
  });
}

const ICONIC: Record<string, string> = {
  Mammalia: 'mammal', Aves: 'bird', Reptilia: 'reptile', Amphibia: 'amphibian', Actinopterygii: 'fish',
  Insecta: 'insect', Arachnida: 'arthropod', Mollusca: 'mollusk', Animalia: 'invertebrate', Plantae: 'plant',
  Fungi: 'fungus', Protozoa: 'protist', Chromista: 'protist',
};
export const iconicToGroup = (s?: string) => (s && ICONIC[s]) || 'other';

export interface WikiSummary { title: string; extract: string; thumbnail?: { source: string }; content_urls?: { desktop: { page: string } } }

export function wikiSummary(title: string): Promise<WikiSummary | null> {
  return cached('wiki' + title, async () => {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (!res.ok) return null;
    const j = await res.json();
    if (j.type === 'disambiguation') return null;
    return j as WikiSummary;
  }).catch(() => null);
}

export function wikiTitleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/wiki\/([^#?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
