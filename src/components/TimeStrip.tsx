import { useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS, EVENT_COLORS, INTERVALS, type WorldEvent } from '../data/events';
import { timeScale, type ScaleMode } from '../lib/timescale';
import { fmtAge, fmtShort } from '../lib/format';
import { usePref } from '../lib/store';
import { Explain } from './Explain';
import './TimeStrip.css';

export interface Marker { age: number; lo?: number; hi?: number; label: string; color?: string; strong?: boolean }

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Horizontal deep-time strip: geologic eras, world events, and highlighted split markers. */
export function TimeStrip({ markers = [], oldest = 4540, events = 'major', title }: { markers?: Marker[]; oldest?: number; events?: 'major' | 'all' | 'none'; title?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [mode, setMode] = usePref<ScaleMode>('scale', 'log');
  const [sel, setSel] = useState<WorldEvent | null>(null);
  const pad = 16;
  const W = Math.max(width, 280);
  const x = timeScale(mode, oldest, 0, pad, W - pad);

  const evs = useMemo(() => EVENTS.filter((e) => e.age <= oldest && (events === 'all' || (events === 'major' && e.major))), [oldest, events]);

  // Greedy lanes so event icons don't overlap
  const placed = useMemo(() => {
    const lanes: number[] = [];
    return [...evs].sort((a, b) => x(a.age) - x(b.age)).map((e) => {
      const px = x(e.age);
      let lane = lanes.findIndex((end) => px - end > 24);
      if (lane < 0) { lane = lanes.length; lanes.push(px); } else lanes[lane] = px;
      return { e, px, lane: Math.min(lane, 2) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evs, W, mode, oldest]);

  const markerY = 30;
  const bandY = 64;
  const axisY = bandY + 22;
  const H = axisY + 22 + 3 * 28 + 10;
  const periods = INTERVALS.filter((i) => i.level === (oldest > 600 ? 'eon' : 'period') || (oldest > 600 && i.level === 'era'));

  return (
    <div className="timestrip">
      <div className="ts-head">
        {title && <span className="eyebrow">{title}</span>}
        <div className="ts-tools">
          <Explain topic="scale">Why stretched?</Explain>
          <div className="seg" role="group" aria-label="Time scale">
            <button className={mode === 'log' ? 'on' : ''} onClick={() => setMode('log')}>Stretched</button>
            <button className={mode === 'linear' ? 'on' : ''} onClick={() => setMode('linear')}>Linear</button>
          </div>
        </div>
      </div>
      <div ref={ref} className="ts-body">
        {width > 0 && (
          <svg width={W} height={H} role="img" aria-label="Timeline of Earth's history">
            {/* geologic bands */}
            {periods.map((p) => {
              const x0 = x(Math.min(p.start, oldest)), x1 = x(p.end);
              const y = p.level === 'era' ? bandY + 10 : bandY;
              const h = p.level === 'era' ? 10 : (oldest > 600 ? 10 : 14);
              return (
                <g key={p.name}>
                  <rect x={x0} y={y} width={Math.max(0, x1 - x0)} height={h} fill={p.color} opacity={0.5} />
                  {x1 - x0 > p.name.length * 6.5 + 6 && <text x={(x0 + x1) / 2} y={y - 3} className="ts-band-label" textAnchor="middle">{p.level === 'era' ? '' : p.name}</text>}
                  <title>{`${p.name}: ${fmtShort(p.start)} – ${p.end ? fmtShort(p.end) : 'today'}`}</title>
                </g>
              );
            })}
            {/* axis */}
            <line x1={pad} x2={W - pad} y1={axisY} y2={axisY} className="ts-axis" />
            {x.ticks().map((t) => (
              <g key={t} transform={`translate(${x(t)},${axisY})`}>
                <line y1={0} y2={5} className="ts-axis" />
                <text y={16} textAnchor="middle" className="ts-tick">{t === 0 ? 'now' : fmtShort(t)}</text>
              </g>
            ))}
            {/* markers (CI bands + split lines) */}
            {markers.map((m, i) => {
              const px = x(m.age);
              const c = m.color || 'var(--warm)';
              return (
                <g key={i} className={m.strong ? 'ts-marker strong' : 'ts-marker'}>
                  {m.lo != null && m.hi != null && m.hi > m.lo && <rect x={x(m.hi)} width={Math.max(2, x(m.lo) - x(m.hi))} y={markerY + 8} height={axisY - markerY - 8} fill={c} opacity={0.18} />}
                  <line x1={px} x2={px} y1={markerY + 8} y2={axisY} stroke={c} strokeWidth={m.strong ? 2.5 : 1.5} />
                  <circle cx={px} cy={axisY} r={m.strong ? 6 : 4} fill={c} />
                  <text x={Math.min(Math.max(px, 60), W - 60)} y={markerY + 2} textAnchor="middle" className="ts-mlabel" fill={c}>{m.label}</text>
                </g>
              );
            })}
            {/* events */}
            {placed.map(({ e, px, lane }) => {
              const y = axisY + 34 + lane * 28;
              return (
                <g key={e.id} className={'ts-event' + (sel?.id === e.id ? ' on' : '')} transform={`translate(${px},0)`} onClick={() => setSel(sel?.id === e.id ? null : e)} role="button" tabIndex={0} aria-label={e.title}
                   onKeyDown={(k) => k.key === 'Enter' && setSel(e)}>
                  <line y1={axisY} y2={y - 11} stroke={EVENT_COLORS[e.kind]} opacity={0.35} />
                  <circle cy={y} r={11} fill="#0c1224" stroke={EVENT_COLORS[e.kind]} />
                  <text y={y + 4.5} textAnchor="middle" fontSize={12}>{e.icon}</text>
                  <title>{`${e.title} · ${fmtAge(e.age)}`}</title>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {sel && (
        <div className="ts-pop fadein" style={{ borderColor: EVENT_COLORS[sel.kind] }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{sel.icon} {sel.title}</b>
            <span className="mono small muted">{fmtAge(sel.age)}{sel.end ? ` → ${fmtShort(sel.end)}` : ''}</span>
          </div>
          <p>{sel.blurb}</p>
          <a className="small" href={`https://en.wikipedia.org/wiki/${sel.wiki}`} target="_blank" rel="noreferrer">Read more on Wikipedia ↗</a>
        </div>
      )}
      {!sel && evs.length > 0 && <div className="ts-hint tiny muted">Tap an icon to learn about that moment in Earth's history.</div>}
    </div>
  );
}
