import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { href } from '../lib/router';
import { usePref } from '../lib/store';
import { TimeChart } from './charts/TimeChart';
import { DeepDive } from './DeepDive';
import { loadChapter, loadSeries } from './lib/content';
import { fmtGenerations, fmtPeople, fmtWhen, populationAt } from './lib/time';
import type { Chapter as ChapterT, ChapterData, HumanIndex, MapState, Series, Stop } from './lib/types';
import { HumanMap } from './map/HumanMap';
import { ScaleStrip } from './ScaleStrip';

type Unit = 'date' | 'generations';

/** One chapter: a sticky map driven by whichever stop card is in the reading position. */
export function Chapter({ index, chapter, stopId, deepOpen }: { index: HumanIndex; chapter: ChapterT; stopId?: string; deepOpen?: boolean }) {
  const [data, setData] = useState<ChapterData | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(0); // 0 is the intro card, 1..n are stops
  const [deep, setDeep] = useState<string | null>(null);
  const [unit, setUnit] = usePref<Unit>('human:unit', 'date');
  const cards = useRef<HTMLDivElement>(null);
  const mapPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null); setActive(0); setErr(null);
    loadChapter(chapter.id).then(setData).catch((e) => setErr(String(e)));
    loadSeries().then(setSeries).catch(() => {});
  }, [chapter.id]);

  const stops = useMemo(() => data?.stops ?? [], [data]);
  const stop: Stop | null = active > 0 ? stops[active - 1] ?? null : null;

  // The active card is the one crossing the reading line: mid-screen on desktop, just under the map on a phone.
  const measure = useCallback(() => {
    const root = cards.current, panel = mapPanel.current;
    if (!root || !panel) return;
    const stacked = getComputedStyle(root.parentElement!).display !== 'grid';
    const top = stacked ? panel.getBoundingClientRect().bottom : 0;
    const line = top + (window.innerHeight - top) * (stacked ? 0.35 : 0.45);
    let best = 0;
    root.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => { if (el.getBoundingClientRect().top <= line) best = Number(el.dataset.card); });
    setActive(best);
  }, []);
  useEffect(() => {
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [measure]);

  // Arriving on a link to a stop: scroll to it once the cards exist, and open its deep dive if asked.
  // Our own address-bar updates (below) also change the route, so only scroll when the route names a stop we are not already on.
  const activeId = useRef<string | null>(null);
  activeId.current = stop?.id ?? null;
  useEffect(() => {
    if (!data) return;
    if (stopId && stopId !== activeId.current) {
      const el = cards.current?.querySelector<HTMLElement>(`[data-stop="${CSS.escape(stopId)}"]`);
      if (el) {
        const stacked = getComputedStyle(cards.current!.parentElement!).display !== 'grid';
        const offset = stacked ? (mapPanel.current?.getBoundingClientRect().height ?? 0) + 16 : window.innerHeight * 0.3;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset });
      }
    }
    if (stopId && deepOpen && data.deep[stopId]) setDeep(stopId);
    measure();
  }, [data, stopId, deepOpen, measure]);

  // Keep the address bar pointing at the stop being read, without adding history entries.
  useEffect(() => {
    if (!data) return;
    const h = href('human', stop ? [chapter.id, stop.id] : [chapter.id], deep ? { d: 1 } : undefined);
    if (h !== window.location.hash) history.replaceState(null, '', h);
  }, [data, stop, deep, chapter.id]);

  // A stop without its own map keeps the map of the stop before it.
  const mapState: MapState = useMemo(() => {
    for (let i = active - 1; i >= 0; i--) { const m = stops[i]?.map; if (m) return m; }
    return chapter.map;
  }, [active, stops, chapter.map]);

  const year = stop?.year ?? chapter.from;
  const pop = populationAt(index.population, year);
  // A chart stop puts its chart in the sticky panel, over the map. The last one stays drawn while it fades out.
  const chartStop = stop?.kind === 'chart' && stop.chart ? stop : null;
  const [panelStop, setPanelStop] = useState<Stop | null>(null);
  if (chartStop && chartStop !== panelStop) setPanelStop(chartStop);
  const panelSeries = panelStop?.chart ? panelStop.chart.series.map((id) => series.find((x) => x.id === id)).filter((x): x is Series => !!x) : [];

  const when = stop ? fmtWhen(stop.year, stop.yearEnd, stop.precision) : chapter.subtitle;
  const gens = fmtGenerations(year);
  const next = index.chapters[chapter.n], prev = index.chapters[chapter.n - 2];
  const deepStop = deep ? stops.find((s) => s.id === deep) : null;
  const closeDeep = useCallback(() => setDeep(null), []);

  return (
    <div className="hs-chapter" style={{ ['--chapter' as string]: chapter.color }}>
      <div className={'hs-mapcol' + (chartStop ? ' charting' : '')} ref={mapPanel}>
        <div className="hs-stage">
          <HumanMap state={mapState} polityYears={index.polityYears} place={chartStop ? null : stop?.place ?? null} />
          <div className={'hs-chartpanel' + (chartStop ? ' on' : '')} aria-hidden={!chartStop}>
            {panelStop?.chart && panelSeries.length > 0 && (
              <>
                <h3>{panelStop.chart.title ?? panelStop.title}</h3>
                <TimeChart series={panelSeries} from={panelStop.chart.from} to={panelStop.chart.to} log={panelStop.chart.log} marks={panelStop.chart.marks} at={chartStop ? chartStop.yearEnd ?? chartStop.year : undefined} />
              </>
            )}
          </div>
        </div>
        <div className="hs-readout">
          <div className="hs-readout-main">{unit === 'date' ? when : gens}</div>
          <div className="hs-readout-sub">
            <span>{unit === 'date' ? gens : when}</span>
            {pop != null && <span>· about {fmtPeople(pop)} people alive</span>}
          </div>
        </div>
        <div className="seg hs-unit" role="group" aria-label="Show time as">
          <button className={unit === 'date' ? 'on' : ''} onClick={() => setUnit('date')}>Dates</button>
          <button className={unit === 'generations' ? 'on' : ''} onClick={() => setUnit('generations')}>Generations</button>
        </div>
        <ScaleStrip index={index} year={year} active={chapter.id} />
      </div>

      <div className="hs-cards" ref={cards}>
        <nav className="hs-rail" aria-label="Chapters">
          <a href={href('human')} className="hs-rail-home" title="All chapters">◂ All</a>
          {index.chapters.map((c) => (
            <a key={c.id} href={href('human', [c.id])} className={c.id === chapter.id ? 'on' : ''} title={c.title} aria-current={c.id === chapter.id ? 'page' : undefined}
              style={{ ['--c' as string]: c.color }}>{c.n}</a>
          ))}
        </nav>

        <article className="hs-card hs-intro" data-card={0}>
          <div className="eyebrow">Chapter {chapter.n} · {chapter.subtitle}</div>
          <h1>{chapter.title}</h1>
          <p className="hs-lede">{chapter.intro}</p>
          {stops.length > 0 && <p className="small muted">Scroll to move through time. The map and charts follow.</p>}
        </article>

        {err && <p className="error">Couldn't load this chapter: {err}</p>}
        {data && stops.length === 0 && (
          <article className="hs-card"><h3>This chapter is still being written</h3><p className="muted">Its stops will appear here. Chapters 2 and 4 are ready to explore.</p></article>
        )}

        {stops.map((s, i) => (
          <article key={s.id} className={'hs-card' + (active === i + 1 ? ' on' : '')} data-card={i + 1} data-stop={s.id}>
            <div className="hs-when">
              <span>{unit === 'date' ? fmtWhen(s.year, s.yearEnd, s.precision) : fmtGenerations(s.year)}</span>
              {s.confidence !== 'established' && <span className="hs-badge" title={s.debate ?? s.dateNote}>{s.confidence === 'debated' ? 'Debated' : 'Uncertain'}</span>}
            </div>
            <h2>{s.title}</h2>
            {s.place && <div className="hs-place">📍 {s.place.name}</div>}
            {s.image && (
              <figure>
                <img src={s.image.src} alt={s.image.alt} loading="lazy" />
                <figcaption className="tiny muted"><a href={s.image.sourceUrl} target="_blank" rel="noreferrer">{s.image.credit}</a> · {s.image.licence}</figcaption>
              </figure>
            )}
            <p>{s.blurb}</p>
            {s.chart && s.kind !== 'chart' && (
              <TimeChart compact height={200} series={s.chart.series.map((id) => series.find((x) => x.id === id)).filter((x): x is Series => !!x)}
                from={s.chart.from} to={s.chart.to} log={s.chart.log} marks={s.chart.marks} at={s.yearEnd ?? s.year} />
            )}
            {s.kind === 'chart' && s.chart?.note && <p className="small muted">{s.chart.note}</p>}
            {s.confidence !== 'established' && (s.debate ?? s.dateNote) && <p className="hs-debate small"><b>What's in question:</b> {s.debate ?? s.dateNote}</p>}
            {s.confidence === 'established' && s.dateNote && <p className="small muted">{s.dateNote}</p>}
            <div className="hs-actions">
              {s.deep && data?.deep[s.id] && <button className="btn sm hs-deeper" onClick={() => setDeep(s.id)}>Go deeper</button>}
              <details className="hs-src">
                <summary>{s.sources.length} source{s.sources.length > 1 ? 's' : ''}</summary>
                <ol className="hs-sources">
                  {s.sources.map((id) => { const src = data?.sources.find((x) => x.id === id); return src ? <li key={id}><a href={src.url} target="_blank" rel="noreferrer">{src.citation}</a></li> : null; })}
                </ol>
                {s.links.length > 0 && <div className="row" style={{ marginTop: 8 }}>{s.links.map((l) => <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>}
              </details>
            </div>
          </article>
        ))}

        {data && (
          <div className="hs-card hs-next">
            {next ? (
              <a className="hs-next-link" href={href('human', [next.id])} style={{ ['--c' as string]: next.color }}>
                <span className="eyebrow">Next · Chapter {next.n}</span>
                <b>{next.title} →</b>
                <span className="small muted">{next.subtitle}</span>
              </a>
            ) : <a className="hs-next-link" href={href('human')}><span className="eyebrow">The end, for now</span><b>Back to all chapters →</b></a>}
            {prev && <a className="small" href={href('human', [prev.id])}>← Chapter {prev.n}: {prev.title}</a>}
          </div>
        )}
      </div>

      {deepStop && data?.deep[deepStop.id] && <DeepDive stop={deepStop} sections={data.deep[deepStop.id]} sources={data.sources} onClose={closeDeep} />}
    </div>
  );
}
