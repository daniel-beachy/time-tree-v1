// A line chart of up to four series over time, all in the same unit and on one axis.
//
// - `at` is the year the story has reached: lines are solid up to it and faint after it, so scrolling "draws" the chart.
// - `marks` are events or spans (a war, a pandemic) drawn as bands behind the lines.
// - Pointing at the chart moves a crosshair and lists each series' value for that year.
// Colours are assigned in a fixed order and were checked for colour-blind separation on this background
// (dataviz validator, dark mode). Do not add a fifth: split the chart instead.
import { line as d3line, scaleLinear, scaleLog } from 'd3';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { fmtPeople, fmtWhen } from '../lib/time';
import type { ChartMark, Series, Year } from '../lib/types';

export const CHART_COLORS = ['#c2871a', '#3794c8', '#d9573f', '#9d78d8'];

/** Writes a value the way its series asks. `short` is for axis ticks. */
export function fmtValue(v: number, format: Series['format'], short = false): string {
  switch (format) {
    case 'people': return fmtPeople(v);
    case 'years': return short ? String(Math.round(v)) : `${v.toFixed(1)} years`;
    case 'percent': return `${v.toFixed(short || v >= 10 ? 0 : 1)}%`;
    case 'tonnes': return v >= 1e9 ? `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)} billion${short ? '' : ' tonnes'}` : v >= 1e6 ? `${Math.round(v / 1e6)} million${short ? '' : ' tonnes'}` : `${Math.round(v).toLocaleString()}${short ? '' : ' tonnes'}`;
    default: return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : String(+v.toFixed(1));
  }
}
const fmtYear = (y: Year, modern: boolean) => (modern ? String(Math.round(y)) : fmtWhen(Math.round(y)));

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    setSize([el.clientWidth, el.clientHeight]);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** The value of a series at a year, interpolated between its points; null outside its range. */
function valueAt(points: [Year, number][], year: Year): number | null {
  if (!points.length || year < points[0][0] || year > points[points.length - 1][0]) return null;
  let i = points.findIndex((p) => p[0] >= year);
  if (i <= 0) return points[0][1];
  const [a, b] = [points[i - 1], points[i]];
  return a[1] + ((b[1] - a[1]) * (year - a[0])) / (b[0] - a[0] || 1);
}

interface Props {
  series: Series[];
  from?: Year; to?: Year; log?: boolean;
  /** The year the story has reached. */
  at?: Year;
  marks?: ChartMark[];
  /** Fixed height in pixels. Leave out to fill the parent's height. */
  height?: number;
  /** Hide the "show the numbers" table (for small charts inside a card). */
  compact?: boolean;
}

export function TimeChart({ series, from, to, log, at, marks = [], height, compact }: Props) {
  const [ref, [width, boxH]] = useSize<HTMLDivElement>();
  const clip = useId();
  const [hover, setHover] = useState<Year | null>(null);
  const h = height ?? Math.max(160, boxH);
  const data = useMemo(() => series.slice(0, 4).map((s) => ({ s, pts: s.points.filter(([y]) => (from == null || y >= from) && (to == null || y <= to)) })).filter((d) => d.pts.length > 1), [series, from, to]);
  if (!data.length) return null;

  const format = data[0].s.format;
  const x0 = Math.min(...data.map((d) => d.pts[0][0])), x1 = Math.max(...data.map((d) => d.pts[d.pts.length - 1][0]));
  const modern = x0 >= 1000;
  const many = data.length > 1;
  // On a narrow chart the legend alone names the lines, and the readout appears only when asked for.
  const narrow = width < 420;
  const endLabels = many && !narrow;
  // Room on the right for the name of each line, written at its end.
  const m = { l: 10, r: endLabels ? 74 : 14, t: marks.length ? 34 : 14, b: 26 };
  // The lines start to the right of the axis numbers, so the two never overlap.
  const axisPad = format === 'years' || format === 'percent' ? 26 : 62;
  const x = scaleLinear().domain([x0, x1]).range([m.l + axisPad, Math.max(m.l + axisPad + 10, width - m.r)]);
  const vals = data.flatMap((d) => d.pts.map((p) => p[1]));
  const y = (log ? scaleLog().domain([Math.min(...vals), Math.max(...vals)]) : scaleLinear().domain([0, Math.max(...vals) * 1.06])).range([h - m.b, m.t]);
  const path = d3line<[Year, number]>().x((p) => x(p[0])).y((p) => y(p[1]));
  const xt = x.ticks(Math.max(2, Math.floor(width / 110)));
  const yt = y.ticks(4).filter((v) => v > 0 && (!log || /^1/.test(String(v))));
  const reached = at == null ? x1 : Math.min(x1, Math.max(x0, at));
  const focus = hover ?? (at != null && !narrow ? reached : null);
  const focusX = focus != null ? x(focus) : 0;
  const readings = focus != null ? data.map((d, i) => ({ d, i, v: valueAt(d.pts, focus) })).filter((r) => r.v != null) : [];

  // Keep the names at the ends of the lines from sitting on top of each other.
  const ends = data.map((d, i) => ({ i, label: d.s.label ?? d.s.title, yy: y(d.pts[d.pts.length - 1][1]) })).sort((a, b) => a.yy - b.yy);
  for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 14) ends[i].yy = ends[i - 1].yy + 14;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(Math.min(x1, Math.max(x0, x.invert(e.clientX - r.left)))));
  };
  const first = data[0], last = first.pts[first.pts.length - 1];
  const summary = `${data.map((d) => d.s.title).join(', ')}: ${fmtValue(first.pts[0][1], format)} in ${fmtYear(first.pts[0][0], modern)}, ${fmtValue(last[1], format)} in ${fmtYear(last[0], modern)}`;
  const tableYears = xt.filter((v) => v >= x0 && v <= x1).concat(x1).filter((v, i, a) => a.indexOf(v) === i);
  // The readout sits on whichever side of the crosshair has more room, so it never covers the ends of the lines.
  const tipSide: React.CSSProperties = focusX > width / 2 ? { right: Math.max(4, width - focusX + 12) } : { left: focusX + 12 };

  return (
    <div className={'hs-chart' + (height == null ? ' fill' : '')}>
      {many && (
        <div className="hs-legend" aria-hidden>
          {data.map((d, i) => <span key={d.s.id}><i style={{ background: CHART_COLORS[i] }} />{d.s.label ?? d.s.title}</span>)}
          <span className="hs-legend-unit">{data[0].s.unit}</span>
        </div>
      )}
      <div className="hs-plot" ref={ref} style={height != null ? { height } : undefined}>
        {width > 0 && (
          <svg width={width} height={h} role="img" aria-label={summary} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <defs>
              <clipPath id={clip + 'a'}><rect x={0} y={0} height={h} style={{ width: Math.max(0, x(reached)), transition: 'width .7s ease' }} /></clipPath>
            </defs>
            {marks.map((k) => {
              const a = x(Math.max(x0, k.year)), b = x(Math.min(x1, k.yearEnd ?? k.year));
              if (k.year > x1 || (k.yearEnd ?? k.year) < x0) return null;
              return <rect key={k.label} x={a - 1} width={Math.max(2, b - a + 2)} y={m.t} height={h - m.b - m.t} className="hs-markband" />;
            })}
            {yt.map((v) => (
              <g key={v}>
                <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} className="hs-gridline" />
                <text x={m.l + 2} y={y(v) - 4} className="hs-tick">{fmtValue(v, format, true)}</text>
              </g>
            ))}
            {xt.map((v) => <text key={v} x={x(v)} y={h - 8} textAnchor="middle" className="hs-tick">{fmtYear(v, modern)}</text>)}
            {marks.map((k, i) => {
              if (k.year > x1 || (k.yearEnd ?? k.year) < x0) return null;
              const cx = (x(Math.max(x0, k.year)) + x(Math.min(x1, k.yearEnd ?? k.year))) / 2;
              return <text key={k.label} x={Math.min(width - m.r - 4, Math.max(m.l + 4, cx))} y={12 + (i % 2) * 13} textAnchor="middle" className="hs-marklabel">{k.label}</text>;
            })}
            {data.map((d, i) => <path key={d.s.id} d={path(d.pts) ?? ''} className="hs-line ahead" style={{ stroke: CHART_COLORS[i] }} />)}
            <g clipPath={`url(#${clip}a)`}>
              {data.map((d, i) => <path key={d.s.id} d={path(d.pts) ?? ''} className="hs-line" style={{ stroke: CHART_COLORS[i] }} />)}
            </g>
            {endLabels && ends.map((e) => (
              <g key={e.i}>
                <circle cx={width - m.r + 9} cy={e.yy} r={4} style={{ fill: CHART_COLORS[e.i] }} />
                <text x={width - m.r + 17} y={e.yy + 4} className="hs-endlabel">{e.label}</text>
              </g>
            ))}
            {focus != null && (
              <g pointerEvents="none">
                <line x1={focusX} x2={focusX} y1={m.t} y2={h - m.b} className="hs-cross" />
                {readings.map((r) => <circle key={r.d.s.id} cx={focusX} cy={y(r.v!)} r={5} className="hs-dot" style={{ fill: CHART_COLORS[r.i] }} />)}
              </g>
            )}
          </svg>
        )}
        {focus != null && width > 0 && readings.length > 0 && (
          <div className="hs-tip" style={{ ...tipSide, top: m.t + 4 }} aria-hidden>
            <b>{fmtYear(focus, modern)}</b>
            {readings.map((r) => (
              <span key={r.d.s.id}><i style={{ background: CHART_COLORS[r.i] }} />{many ? `${r.d.s.label ?? r.d.s.title}: ` : ''}{fmtValue(r.v!, format)}</span>
            ))}
          </div>
        )}
      </div>
      {!compact && (
        <details className="hs-table">
          <summary>Show the numbers</summary>
          <table>
            <thead><tr><th>Year</th>{data.map((d) => <th key={d.s.id}>{d.s.label ?? d.s.title}</th>)}</tr></thead>
            <tbody>
              {tableYears.map((yr) => (
                <tr key={yr}><td>{fmtYear(yr, modern)}</td>{data.map((d) => { const v = valueAt(d.pts, yr); return <td key={d.s.id}>{v == null ? '' : fmtValue(v, format)}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {data[0].s.note && <p className="tiny muted">{data[0].s.note}</p>}
    </div>
  );
}
