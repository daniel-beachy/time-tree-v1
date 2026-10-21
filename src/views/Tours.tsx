import { useEffect, useMemo } from 'react';
import { useTree } from '../components/TreeContext';
import { DatedTree } from '../components/DatedTree';
import { Explain } from '../components/Explain';
import type { Species, Tree } from '../lib/data';
import { EVENTS } from '../data/events';
import { fmtAge } from '../lib/format';
import { go, href } from '../lib/router';
import { usePref } from '../lib/store';
import type { ScaleMode } from '../lib/timescale';
import { bySci, spArg } from './Relate';
import { TOURS, type Tour } from './tours-data';
import './Tours.css';

export function Tours({ args }: { args: string[] }) {
  const tour = TOURS.find((t) => t.id === args[0]);
  if (!tour) return <TourList />;
  const step = Math.max(0, Math.min(tour.steps.length - 1, (parseInt(args[1] ?? '1', 10) || 1) - 1));
  return <TourStepView tour={tour} step={step} />;
}

function TourList() {
  return (
    <div className="tours">
      <div className="eyebrow">Guided tours</div>
      <h1>Short stories from the tree of life</h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: 620 }}>Each tour is a few steps long. Every date in the text is pulled live from the same data as the rest of the site.</p>
      <div className="tour-grid">
        {TOURS.map((t) => (
          <a key={t.id} className="panel tour-tile" href={href('tours', [t.id])}>
            <span className="tour-emoji">{t.emoji}</span>
            <h3>{t.title}</h3>
            <p className="small muted">{t.teaser}</p>
            <span className="tiny" style={{ color: 'var(--glow)' }}>{t.steps.length} steps →</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Replace {SciA|SciB} tokens with the divergence time between the two species. */
function narrate(tree: Tree, text: string): React.ReactNode[] {
  return text.split(/(\{[^}]+\})/).map((part, i) => {
    const m = part.match(/^\{(.+)\|(.+)\}$/);
    if (!m) return part;
    const a = bySci(tree, m[1]), b = bySci(tree, m[2]);
    if (!a || !b) return <span key={i} className="muted">[?]</span>;
    const age = tree.nodes[tree.mrca(a.node, b.node)].a;
    return <a key={i} className="tour-age" href={href('relate', [spArg(a), spArg(b)])} title={`${a.name} vs ${b.name}`}>{fmtAge(age)}</a>;
  });
}

function TourStepView({ tour, step }: { tour: Tour; step: number }) {
  const tree = useTree();
  const [mode, setMode] = usePref<ScaleMode>('scale', 'log');
  const s = tour.steps[step];
  const species = useMemo(() => s.species.map((n) => bySci(tree, n)).filter((x): x is Species => !!x), [s, tree]);
  const focus = useMemo(() => {
    if (!s.focus) return undefined;
    const a = bySci(tree, s.focus[0]), b = bySci(tree, s.focus[1]);
    return a && b ? ([a, b] as [Species, Species]) : undefined;
  }, [s, tree]);
  const last = step === tour.steps.length - 1;
  const nextTour = TOURS[(TOURS.indexOf(tour) + 1) % TOURS.length];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'ArrowRight' && !last) go('tours', [tour.id, step + 2]);
      if (e.key === 'ArrowLeft' && step > 0) go('tours', [tour.id, step]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, step, last]);

  return (
    <div className="tour">
      <div className="tour-top">
        <a className="small muted" href={href('tours')}>← All tours</a>
        <div className="tour-progress">
          {tour.steps.map((_, i) => <a key={i} href={href('tours', [tour.id, i + 1])} className={i === step ? 'on' : i < step ? 'done' : ''} aria-label={`Step ${i + 1}`} />)}
        </div>
      </div>
      <div className="tour-grid2" key={step}>
        <div className="tour-text fadein">
          <div className="eyebrow">{tour.emoji} {tour.title} · step {step + 1} of {tour.steps.length}</div>
          <h1>{s.title}</h1>
          <p className="tour-body">{narrate(tree, s.text)}</p>
          {s.events && s.events.length > 0 && (
            <div className="tour-events">
              {s.events.map((id) => EVENTS.find((e) => e.id === id)).filter(Boolean).map((e) => (
                <div key={e!.id} className="small"><b>{e!.icon} {e!.title}</b> <span className="muted">· {fmtAge(e!.age)}</span></div>
              ))}
            </div>
          )}
          <div className="row tour-nav">
            {step > 0 ? <a className="btn ghost" href={href('tours', [tour.id, step])}>← Back</a> : <span />}
            {last
              ? <a className="btn" href={href('tours', [nextTour.id])}>Next tour: {nextTour.title} →</a>
              : <a className="btn" href={href('tours', [tour.id, step + 2])}>Next →</a>}
          </div>
          {last && (
            <div className="row" style={{ marginTop: 12, gap: 8 }}>
              <a className="btn sm ghost" href={href('build', [], { ids: species.map(spArg).join(',') })}>Open these in Build a Tree</a>
              <a className="btn sm ghost" href={href('quiz', [], { with: focus ? focus.map(spArg).join(',') : spArg(species[0]) })}>Quiz me on this</a>
            </div>
          )}
        </div>
        <div className="panel tour-tree fadein">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="tiny muted">Past ← → Today · hover a fork for details</span>
            <div className="row" style={{ gap: 8 }}>
              <div className="seg sm"><button className={mode === 'log' ? 'on' : ''} onClick={() => setMode('log')}>Stretched</button><button className={mode === 'linear' ? 'on' : ''} onClick={() => setMode('linear')}>Linear</button></div>
              <Explain topic="readtree">How to read this</Explain>
            </div>
          </div>
          <DatedTree species={species} mode={mode} focus={focus} events={s.events ?? 'major'} rowH={species.length > 7 ? 32 : 40} />
        </div>
      </div>
    </div>
  );
}
