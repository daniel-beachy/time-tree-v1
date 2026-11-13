import { line as d3line, scaleLinear, scaleLog } from 'd3';
import { useMemo } from 'react';
import { useWidth } from '../../components/TimeStrip';
import { fmtPeople, fmtWhen } from '../lib/time';
import type { Series, Year } from '../lib/types';

/** A line chart of one series over time. `mark` draws a dot at a year (the active stop). */
export function SeriesChart({ series, from, to, log, mark, height = 220 }: { series: Series; from?: Year; to?: Year; log?: boolean; mark?: Year; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const pts = useMemo(() => series.points.filter(([y]) => (from == null || y >= from) && (to == null || y <= to)), [series, from, to]);
  const m = { l: 8, r: 8, t: 14, b: 26 };
  const x = scaleLinear().domain([pts[0][0], pts[pts.length - 1][0]]).range([m.l, Math.max(m.l + 10, width - m.r)]);
  const vals = pts.map((p) => p[1]);
  const y = (log ? scaleLog().domain([Math.min(...vals), Math.max(...vals)]) : scaleLinear().domain([0, Math.max(...vals)])).range([height - m.b, m.t]);
  const path = d3line<[Year, number]>().x((p) => x(p[0])).y((p) => y(p[1]))(pts) ?? '';
  const xt = x.ticks(Math.max(2, Math.floor(width / 110)));
  const yt = y.ticks(4).filter((v) => !log || /^1/.test(String(v)));
  const last = pts[pts.length - 1];
  const markPt = mark != null && mark >= pts[0][0] ? pts.reduce((a, b) => (Math.abs(b[0] - mark) < Math.abs(a[0] - mark) ? b : a)) : null;
  return (
    <div ref={ref} className="hs-chart">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${series.title}: ${fmtPeople(pts[0][1])} in ${fmtWhen(pts[0][0])}, ${fmtPeople(last[1])} in ${fmtWhen(last[0])}`}>
          {yt.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} className="hs-grid" />
              <text x={m.l + 2} y={y(v) - 4} className="hs-tick">{fmtPeople(v)}</text>
            </g>
          ))}
          {xt.map((v) => <text key={v} x={x(v)} y={height - 8} textAnchor="middle" className="hs-tick">{fmtWhen(v)}</text>)}
          <path d={path} className="hs-line" />
          {markPt && <circle cx={x(markPt[0])} cy={y(markPt[1])} r={5} className="hs-dot" />}
        </svg>
      )}
      {series.note && <p className="tiny muted">{series.note}</p>}
    </div>
  );
}
