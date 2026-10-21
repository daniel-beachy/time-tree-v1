import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTree } from '../components/TreeContext';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import { Explain } from '../components/Explain';
import { useWidth } from '../components/TimeStrip';
import { GROUP_COLORS, type Species } from '../lib/data';
import { EVENTS, EVENT_COLORS, INTERVALS } from '../data/events';
import { fmtAge, fmtShort, friendly, lcName } from '../lib/format';
import { go, href } from '../lib/router';
import { usePref } from '../lib/store';
import { timeScale, type ScaleMode } from '../lib/timescale';
import { resolveSpecies, spArg } from './Relate';
import './DeepTime.css';

interface Item { kind: 'split' | 'event'; age: number; key: string; y: number; top: number; text: string; render: () => React.ReactNode }

export function DeepTime({ args }: { args: string[] }) {
  const tree = useTree();
  const [sp, setSp] = useState<Species | null>(null);
  const [mode, setMode] = usePref<ScaleMode>('scale', 'log');
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width < 720;
  // Real card heights, measured after render, so cards can be stacked without overlapping.
  const [heights, setHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    resolveSpecies(tree, args[0] ?? '9606').then((s) => setSp(s ?? tree.species.get(9606)!)).catch(() => setSp(tree.species.get(9606)!));
  }, [args[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const OLDEST = 4540;
  // Timeline length: at least enough to stack every card, so cards stay near their true dates.
  const stackH = useMemo(() => {
    const hs = Object.entries(heights);
    const sum = (f: (k: string) => boolean) => hs.filter(([k]) => f(k)).reduce((t, [, h]) => t + h + 10, 0);
    return narrow ? sum(() => true) : Math.max(sum((k) => k.startsWith('split:')), sum((k) => !k.startsWith('split:')));
  }, [heights, narrow]);
  const H = Math.max(mode === 'log' ? 3600 : 5200, stackH * 1.15);
  const y = useMemo(() => timeScale(mode, 0, OLDEST, 40, H), [mode, H]);

  const splits = useMemo(() => {
    if (!sp) return [];
    const out: { node: number; age: number; kin: Species[]; count: number }[] = [];
    let child = sp.node;
    for (let n = tree.nodes[sp.node].p; n >= 0; child = n, n = tree.nodes[n].p) {
      const sibs = tree.children[n].filter((c) => c !== child);
      if (!sibs.length || tree.nodes[n].u) continue;
      const kin = sibs.flatMap((c) => tree.leavesUnder(c));
      out.push({ node: n, age: tree.nodes[n].a, kin: [...kin.filter((k) => k.famous), ...kin.filter((k) => !k.famous)].slice(0, 6), count: kin.length });
    }
    return out;
  }, [sp, tree, tree.version]);

  // Lay out cards in each column: at their true time where possible, pushed down to avoid overlaps.
  const columns = useMemo(() => {
    // Card height estimate from text length and column width (13px text ≈ 6.6px per character, 20px lines).
    const colW = narrow ? width - 98 : width / 2 - 60;
    const perLine = Math.max(20, (colW - 30) / 6.6);
    const est = (it: Omit<Item, 'top'>) => heights[it.key] ?? 46 + Math.ceil(it.text.length / perLine) * 20;
    const place = (items: Omit<Item, 'top'>[]) => {
      let last = -Infinity;
      return items.sort((a, b) => a.y - b.y).map((it) => {
        const top = Math.max(it.y - 14, last + 10);
        last = top + est(it);
        return { ...it, top };
      });
    };
    const splitItems = splits.map((s) => ({
      kind: 'split' as const, age: s.age, key: 'split:' + s.node, y: y(s.age), text: 'Parted ways with the ancestors of ' + s.kin.map((k) => k.name).join(', ') + (s.count > s.kin.length ? ' 000 species, including ' : ''),
      render: () => <SplitCard key={'s' + s.node} node={s.node} kin={s.kin} count={s.count} sp={sp!} />,
    }));
    const eventItems = EVENTS.map((e) => ({
      kind: 'event' as const, age: e.age, key: e.id, y: y(e.age), text: e.blurb + ' '.repeat(Math.round(e.title.length * 1.3)),
      render: () => (
        <div className="dt-event" style={{ borderColor: EVENT_COLORS[e.kind] }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}><b>{e.icon} {e.title}</b><span className="mono tiny muted">{fmtShort(e.age)}</span></div>
          <p className="small">{e.blurb}</p>
        </div>
      ),
    }));
    if (narrow) return { left: [] as Item[], right: place([...splitItems, ...eventItems]) };
    return { left: place(splitItems), right: place(eventItems) };
  }, [splits, y, narrow, sp, width, heights]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next: Record<string, number> = {};
    let changed = false;
    el.querySelectorAll<HTMLElement>('.dt-item').forEach((n) => {
      const k = n.dataset.key!, h = n.offsetHeight;
      next[k] = h;
      if (Math.abs((heights[k] ?? -99) - h) > 1) changed = true;
    });
    if (changed) setHeights(next);
  });

  const totalH = Math.max(H, ...[...columns.left, ...columns.right].map((i) => i.top + 160)) + 40;
  const periods = INTERVALS.filter((i) => i.level === 'period' || (i.level === 'eon' && i.start > 538.8));
  const ticks = y.ticks();

  return (
    <div className="deeptime">
      <div className="dt-head">
        <div>
          <div className="eyebrow">Deep Time</div>
          <h1>A family history, 4.5 billion years deep</h1>
          <p className="muted" style={{ marginTop: 8, maxWidth: 640 }}>
            Scroll down to travel back in time. On the {narrow ? 'timeline' : 'left'}, every moment the {sp ? <b>{lcName(sp.name)}</b> : 'chosen'} lineage parted ways with another branch of life. {narrow ? '' : 'On the right, what was happening on Earth.'}
          </p>
        </div>
        <div className="dt-controls">
          <div style={{ minWidth: 260 }}><SpeciesPicker value={sp} onPick={(s) => go('time', [spArg(s)])} /></div>
          <div className="row" style={{ gap: 10 }}>
            <div className="seg"><button className={mode === 'log' ? 'on' : ''} onClick={() => setMode('log')}>Stretched</button><button className={mode === 'linear' ? 'on' : ''} onClick={() => setMode('linear')}>Linear</button></div>
            <Explain topic="scale">Why?</Explain>
          </div>
        </div>
      </div>

      <div ref={ref} className={'dt-body' + (narrow ? ' narrow' : '')} style={{ height: totalH }}>
        {width > 0 && (
          <>
            <div className="dt-periods">
              {periods.map((p) => (
                <div key={p.name} className="dt-period" style={{ top: y(p.end), height: Math.max(1, y(Math.min(p.start, OLDEST)) - y(p.end)), background: p.color }} title={`${p.name} · ${fmtShort(p.start)}–${p.end ? fmtShort(p.end) : 'now'}`}>
                  {y(Math.min(p.start, OLDEST)) - y(p.end) > 60 && <span>{p.name}</span>}
                </div>
              ))}
            </div>
            <div className="dt-spine" />
            {ticks.map((t) => <div key={t} className="dt-tick" style={{ top: y(t) }}><span>{t === 0 ? 'today' : fmtShort(t)}</span></div>)}
            {columns.left.map((it) => (
              <div key={it.key} data-key={it.key} className="dt-item left" style={{ top: it.top }}>
                <svg className="dt-conn" style={{ top: Math.min(0, it.y - it.top) }} width="40" height={Math.abs(it.y - it.top) + 20}><path d={`M0,${Math.max(0, it.y - it.top) + 14} L40,${Math.max(0, it.top - it.y) + 14}`} /></svg>
                {it.render()}
              </div>
            ))}
            {columns.right.map((it) => (
              <div key={it.key} data-key={it.key} className={'dt-item right' + (it.kind === 'split' ? ' split' : '')} style={{ top: it.top }}>
                <span className="dt-dot" style={{ top: it.y - it.top + 14, background: it.kind === 'split' ? 'var(--glow)' : 'var(--warm)' }} />
                {it.render()}
              </div>
            ))}
            {sp && (
              <div className="dt-you" style={{ top: 0 }}>
                <SpeciesPhoto sp={sp} size={34} round /> <span><b>{sp.name}</b> today</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SplitCard({ node, kin, count, sp }: { node: number; kin: Species[]; count: number; sp: Species }) {
  const tree = useTree();
  const n = tree.nodes[node];
  const name = n.n ? friendly(n.n) || n.n : '';
  return (
    <div className="dt-split">
      <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
        <span className="mono small" style={{ color: 'var(--glow)' }}>{fmtAge(n.a)}</span>
        {name && <a className="tiny muted" href={href('explore', [node])}>{name}</a>}
      </div>
      <p className="small">Parted ways with the ancestors of {count > kin.length ? <>{count} species, including </> : ''}
        {kin.map((k, i) => (
          <span key={k.id}>{i > 0 && (i === kin.length - 1 && count <= kin.length ? ' and ' : ', ')}<a href={href('relate', [spArg(sp), spArg(k)])} style={{ color: GROUP_COLORS[k.group] }}>{lcName(k.name)}</a></span>
        ))}
      </p>
    </div>
  );
}
