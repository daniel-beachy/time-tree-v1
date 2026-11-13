import { useEffect, useRef, type ReactNode } from 'react';
import { fmtWhen } from './lib/time';
import type { DeepSection, Source, Stop } from './lib/types';

/** Renders the two inline forms deep dives may use: *emphasis* and [text](https://link). */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)|\*([^*]+)\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] ? <a key={m.index} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a> : <em key={m.index}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Level 3: the longer read behind a stop, with its sources. */
export function DeepDive({ stop, sections, sources, onClose }: { stop: Stop; sections: DeepSection[]; sources: Source[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Keep Tab inside the drawer while it is open.
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href], button');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; prev?.focus(); };
  }, [onClose]);
  const cited = stop.sources.map((id) => sources.find((s) => s.id === id)).filter((s): s is Source => !!s);
  return (
    <div className="hs-deep-back" onClick={onClose}>
      <div ref={ref} className="hs-deep" role="dialog" aria-modal="true" aria-label={stop.title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="hs-deep-head">
          <div>
            <div className="eyebrow">{fmtWhen(stop.year, stop.yearEnd, stop.precision)}</div>
            <h2>{stop.title}</h2>
          </div>
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>
        {sections.map((s) => (
          <section key={s.h}>
            <h3>{s.h}</h3>
            {s.p.map((p, i) => <p key={i}>{inline(p)}</p>)}
          </section>
        ))}
        <section>
          <h3>Sources</h3>
          <ol className="hs-sources">
            {cited.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.citation}</a></li>)}
          </ol>
        </section>
        {stop.links.length > 0 && (
          <section>
            <h3>Read more</h3>
            <div className="row">{stop.links.map((l) => <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
