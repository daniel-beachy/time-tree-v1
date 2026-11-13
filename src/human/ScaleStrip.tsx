import { useState } from 'react';
import { href } from '../lib/router';
import { NOW, START, fmtGenerations, scalePos } from './lib/time';
import type { Chapter, HumanIndex, Year } from './lib/types';

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const share = (c: Chapter) => ((c.to - c.from) / (NOW - START)) * 100;
const fmtShare = (v: number) => (v >= 10 ? `${Math.round(v)}%` : v >= 1 ? `${v.toFixed(1)}%` : `${v.toFixed(2)}%`);

/**
 * All 300,000 years drawn to scale. Chapters are coloured bands, so the last seven collapse into a sliver at the
 * right-hand end. `year` marks where the reader is; `big` is the wide version on the landing page.
 */
export function ScaleStrip({ index, year, active, big }: { index: HumanIndex; year?: Year; active?: string; big?: boolean }) {
  const [open, setOpen] = useState(false);
  const recent = index.chapters.filter((c) => c.n >= 3);
  const recentShare = recent.reduce((t, c) => t + share(c), 0);
  return (
    <div className={'hs-scale' + (big ? ' big' : '')}>
      <button className="hs-scale-bar" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="The whole story to scale. Show how much of it each chapter covers.">
        {index.chapters.map((c) => (
          <span key={c.id} className={'hs-band' + (c.id === active ? ' on' : '')} style={{ left: pct(scalePos(c.from)), width: pct(scalePos(c.to) - scalePos(c.from)), background: c.color }} />
        ))}
        {index.stops.filter((s) => s.major).map((s) => <span key={s.id} className="hs-tickmark" style={{ left: pct(scalePos(s.year)) }} />)}
        {year != null && <span className="hs-here" style={{ left: pct(scalePos(year)) }} />}
      </button>
      {big && (
        <div className="hs-scale-ends">
          <span>300,000 years ago</span>
          <span className="hs-scale-note">Chapters 3 to 9, everything since farming began, are the last {fmtShare(recentShare)} →</span>
          <span>today</span>
        </div>
      )}
      {open && (
        <div className="hs-scale-pop panel" role="dialog" aria-label="Chapters to scale">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>The whole story, to scale</b>
            <button className="btn sm ghost" onClick={() => setOpen(false)}>Close</button>
          </div>
          <p className="small muted">How much of our species' 300,000 years each chapter covers.</p>
          <ul>
            {index.chapters.map((c) => (
              <li key={c.id}>
                <a href={href('human', [c.id])} onClick={() => setOpen(false)}>
                  <span className="dot" style={{ background: c.color }} />
                  <span className="hs-pop-title">{c.n}. {c.title}</span>
                  <span className="mono">{fmtShare(share(c))}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="tiny muted">Writing is {fmtGenerations(-3300).replace(' ago', '')} old. Our species is {fmtGenerations(START).replace(' ago', '')} old.</p>
        </div>
      )}
    </div>
  );
}
