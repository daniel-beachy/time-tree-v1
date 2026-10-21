import { forwardRef, useMemo, useState } from 'react';
import { useTree } from './TreeContext';
import { useWidth } from './TimeStrip';
import { GROUP_COLORS, type Species } from '../lib/data';
import { displayTree, eachNode, ladderize, type DNode } from '../lib/layout';
import { timeScale, type ScaleMode } from '../lib/timescale';
import { EVENTS, EVENT_COLORS } from '../data/events';
import { fmtAge, fmtShort, friendly } from '../lib/format';
import { href } from '../lib/router';
import { spArg } from '../views/Relate';
import './DatedTree.css';

interface Props {
  species: Species[];
  mode: ScaleMode;
  /** pair whose common ancestor is highlighted */
  focus?: [Species, Species];
  /** world event ids drawn as vertical lines; 'major' = all major events in range */
  events?: string[] | 'major';
  onRemove?: (s: Species) => void;
  /** fixed width for exports; otherwise fills its container */
  rowH?: number;
}

/** A horizontal, time-calibrated tree ("chronogram") of a handful of species: past on the left, today on the right. */
export const DatedTree = forwardRef<SVGSVGElement, Props>(function DatedTree({ species, mode, focus, events = 'major', onRemove, rowH = 40 }, svgRef) {
  const tree = useTree();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<DNode | null>(null);

  const layout = useMemo(() => {
    if (species.length < 2) return null;
    const keep = new Set(species.map((s) => s.node));
    const root = displayTree(tree, tree.mrcaOf([...keep]), keep);
    ladderize(root);
    let row = 0;
    const place = (d: DNode) => {
      if (!d.children.length) { d.y = row++; return; }
      d.children.forEach(place);
      d.y = (d.children[0].y! + d.children[d.children.length - 1].y!) / 2;
    };
    place(root);
    const nodes: DNode[] = [];
    eachNode(root, (d) => nodes.push(d));
    return { root, nodes, rows: row };
  }, [species, tree, tree.version]);

  const W = Math.max(width, 320);
  const narrow = W < 560;
  const labelW = narrow ? 130 : 270;
  const top = 34, padL = narrow ? 40 : 56;
  const H = layout ? top + layout.rows * rowH + 34 : 0;
  const rootAge = layout?.root.age ?? 1;
  // log offset = youngest fork, so the most recent splits get room whatever the tree's age
  const youngest = layout ? Math.max(0.01, Math.min(...layout.nodes.filter((d) => d.children.length).map((d) => d.age))) : 1;
  const oldest = mode === 'log' ? Math.pow(rootAge + youngest, 1.08) - youngest + 0.2 : rootAge * 1.08 + 0.2;
  const x = timeScale(mode, oldest, 0, padL, W - labelW, youngest);
  const yOf = (d: DNode) => top + d.y! * rowH + rowH / 2;
  const focusNode = focus ? tree.mrca(focus[0].node, focus[1].node) : -1;
  const focusPath = useMemo(() => {
    const set = new Set<number>();
    if (focus) for (const f of focus) for (let n = f.node; n >= 0 && n !== focusNode; n = tree.nodes[n].p) set.add(n);
    return set;
  }, [focus, focusNode, tree]);

  const evs = useMemo(() => {
    const list = events === 'major' ? EVENTS.filter((e) => e.major) : EVENTS.filter((e) => events.includes(e.id));
    return list.filter((e) => e.age < oldest && e.age > 0.05);
  }, [events, oldest]);

  // Ticks that fit; drop ones closer than 46px to the previous.
  const ticks = useMemo(() => {
    let last = -Infinity;
    return x.ticks().filter((t) => t <= oldest).sort((a, b) => b - a).filter((t) => {
      const px = x(t);
      if (px - last < 46) return false;
      last = px;
      return true;
    });
  }, [x, oldest]);

  return (
    <div ref={ref} className="dated-tree">
      {layout && width > 0 && (
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="Space Grotesk, system-ui, sans-serif">
          <rect width={W} height={H} fill="#070b16" className="dt-bg" />
          {/* axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 6} y2={H - 26} stroke="#ffffff10" />
              <text x={x(t)} y={H - 10} fill="#8a93b8" fontSize={10} textAnchor="middle" fontFamily="JetBrains Mono, monospace">{t === 0 ? 'today' : fmtShort(t)}</text>
            </g>
          ))}
          {/* events */}
          {evs.map((e, i) => (
            <g key={e.id} className="dtr-ev">
              <line x1={x(e.age)} x2={x(e.age)} y1={top - 8} y2={H - 26} stroke={EVENT_COLORS[e.kind]} strokeDasharray="3 4" opacity={0.65} />
              <text x={x(e.age)} y={i % 2 ? 24 : 12} fontSize={11} textAnchor="middle"><title>{e.title} · {fmtAge(e.age)}</title>{e.icon}</text>
            </g>
          ))}
          {/* branches */}
          {layout.nodes.filter((d) => d.parent).map((d) => {
            const p = d.parent!;
            const onPath = focusPath.has(d.i);
            return (
              <path key={'b' + d.i} d={`M${x(p.age)},${yOf(p)} V${yOf(d)} H${x(d.age)}`} fill="none"
                stroke={onPath ? '#5ef0c8' : d.group !== 'mixed' ? GROUP_COLORS[d.group] ?? '#9aa4c8' : '#9aa4c8'} strokeOpacity={onPath ? 0.95 : 0.6} strokeWidth={onPath ? 2.4 : 1.6} />
            );
          })}
          {/* root stub */}
          <path d={`M${x(oldest) + 6},${yOf(layout.root)} H${x(layout.root.age)}`} stroke="#9aa4c8" strokeOpacity={0.4} strokeWidth={1.6} />
          {/* internal nodes */}
          {layout.nodes.filter((d) => d.children.length).map((d) => {
            const isFocus = d.i === focusNode;
            const name = tree.nodes[d.i].n;
            return (
              <g key={'n' + d.i} className="dtr-node" onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
                {isFocus && <circle cx={x(d.age)} cy={yOf(d)} r={11} fill="#5ef0c822" stroke="#5ef0c8" />}
                <circle cx={x(d.age)} cy={yOf(d)} r={isFocus ? 5 : 3.5} fill={isFocus ? '#5ef0c8' : '#0c1224'} stroke={isFocus ? '#5ef0c8' : '#c7cde6'} strokeWidth={1.2} />
                <rect x={x(d.age) - 10} y={yOf(d) - 10} width={20} height={20} fill="transparent" />
                {(isFocus || layout.rows <= 8) && (
                  <text x={x(d.age) - 6} y={yOf(d) - 7} fontSize={10} textAnchor="end" fill={isFocus ? '#5ef0c8' : '#8a93b8'} fontFamily="JetBrains Mono, monospace" className="halo">
                    {fmtShort(d.age)}{isFocus && name && !narrow ? ` · ${friendly(name) ?? name}` : ''}
                  </text>
                )}
              </g>
            );
          })}
          {/* leaves */}
          {layout.nodes.filter((d) => !d.children.length).map((d) => {
            const sp = tree.byNode.get(d.i);
            if (!sp) return null;
            const inFocus = focus?.some((f) => f.id === sp.id);
            return (
              <g key={'l' + d.i} className="dtr-leaf">
                <circle cx={x(0)} cy={yOf(d)} r={4} fill={GROUP_COLORS[sp.group]} />
                <a href={href('relate', [spArg(sp), focus ? spArg(focus[0].id === sp.id ? focus[1] : focus[0]) : '9606'])}>
                  <text x={x(0) + 10} y={yOf(d) + 4} fontSize={narrow ? 12 : 14} fill={inFocus ? '#5ef0c8' : '#e8ecff'} fontWeight={inFocus ? 600 : 400}>
                    {sp.name}
                    {!narrow && <tspan fill="#8a93b8" fontSize={11} fontStyle="italic" dx={6}>{sp.sci}</tspan>}
                  </text>
                </a>
                {onRemove && (
                  <text x={W - 6} y={yOf(d) + 4} fontSize={14} fill="#8a93b8" textAnchor="end" className="dtr-x" onClick={() => onRemove(sp)}><title>Remove</title>×</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover && layout && (
        <div className="dtr-tip" style={{ left: Math.min(x(hover.age) + 14, W - 250), top: yOf(hover) + 12 }}>
          <b>{tree.nodes[hover.i].n ? friendly(tree.nodes[hover.i].n) ?? tree.nodes[hover.i].n : 'Common ancestor'}</b>
          <div className="mono small" style={{ color: 'var(--glow)' }}>{fmtAge(hover.age)}</div>
          {!tree.nodes[hover.i].u && <div className="tiny muted">95% CI {fmtShort(tree.nodes[hover.i].lo)}–{fmtShort(tree.nodes[hover.i].hi)}</div>}
          <div className="tiny muted">{hover.leaves} species below</div>
        </div>
      )}
    </div>
  );
});
