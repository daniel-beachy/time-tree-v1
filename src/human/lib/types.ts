// The Human Story data model. Mirrors docs/PLAN.md section 4 and the validator in scripts/human/build-human.mjs.

/** A calendar year: positive is CE, negative is BCE (3200 BCE is -3200). "N years ago" is stored as 2000 - N. */
export type Year = number;

export type RegionId = 'africa' | 'sw-asia' | 'europe' | 's-asia' | 'e-asia' | 'se-asia-pacific' | 'n-america' | 'c-s-america' | 'global';
export type ThemeId = 'food' | 'settlement' | 'knowledge' | 'exchange' | 'technology' | 'power' | 'belief' | 'health' | 'art' | 'environment' | 'movement';
export type LayerId = 'land' | 'borders' | 'paleo' | 'hominins' | 'dispersal' | 'farming' | 'cities' | 'polities' | 'routes';

export interface MapState {
  year: Year;
  view: 'world' | RegionId | { center: [number, number]; zoom: number };
  /** Longitude at the middle of the map, for stories that cross the Pacific. Default 0. */
  centerLon?: number;
  layers: LayerId[];
  highlight?: { places?: string[]; routes?: string[]; polities?: string[] };
  labels?: { lat: number; lon: number; text: string }[];
}

export interface Chapter {
  id: string; n: number; title: string; subtitle: string;
  from: Year; to: Year;
  status: 'draft' | 'complete';
  intro: string; color: string; map: MapState;
  keyNumbers: { label: string; value: string; sources: string[] }[];
  stopCount: number;
}

export interface Stop {
  id: string;
  kind: 'event' | 'map' | 'chart' | 'artifact';
  title: string;
  year: Year; yearEnd?: Year;
  precision: 'exact' | 'circa' | 'range';
  dateNote?: string;
  place?: { name: string; lat: number; lon: number };
  regions: RegionId[]; themes: ThemeId[];
  blurb: string;
  image?: { src: string; alt: string; credit: string; licence: string; sourceUrl: string };
  map?: MapState;
  /**
   * A chart for this stop. On a `kind: 'chart'` stop it takes over the sticky panel in place of the map;
   * on any other kind it is drawn small inside the card.
   */
  chart?: { series: string[]; from?: Year; to?: Year; log?: boolean; title?: string; marks?: ChartMark[]; note?: string };
  deep?: boolean;
  confidence: 'established' | 'debated' | 'uncertain';
  debate?: string;
  sources: string[];
  links: { label: string; url: string }[];
  major?: boolean;
  checked?: string;
}

/** An event (one year) or a span (year to yearEnd) drawn behind a chart's lines. */
export interface ChartMark { year: Year; yearEnd?: Year; label: string }

export interface Source { id: string; type: string; citation: string; url: string; accessed: string }
export interface Series {
  id: string; title: string;
  /** Short name for legends and line ends ("Africa"). */
  label?: string;
  unit: string;
  format?: 'people' | 'years' | 'percent' | 'tonnes' | 'number';
  points: [Year, number][]; sources: string[]; note?: string;
}
export interface DeepSection { h: string; p: string[] }

export interface HumanIndex {
  chapters: Chapter[];
  stops: { id: string; chapter: string; year: Year; title: string; major?: boolean }[];
  population: [Year, number][];
  polityYears: number[];
}
export interface ChapterData { id: string; stops: Stop[]; deep: Record<string, DeepSection[]>; sources: Source[] }
