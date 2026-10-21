import { useMemo } from 'react';
import type { Species, Tree } from '../lib/data';
import { GROUP_COLORS } from '../lib/data';
import { EVENTS, EVENT_COLORS } from '../data/events';
import { timeScale } from '../lib/timescale';
import { fmtShort, friendly } from '../lib/format';
import { href } from '../lib/router';
import { useWidth } from './TimeStrip';

/**
 * Vertical "two family lines meeting" diagram: today at the bottom, the common ancestor at the top,
 * with every named group each lineage passes through, and world events as horizontal rules.
 */
export function LineagePath({ tree, a, b, mrca }: { tree: Tree; a: Species; b: Species; mrca: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const top = tree.nodes[mrca].a;
  const H = 460;
  const y = timeScale('log', top, 0, 70, H - 40);
  const W = Math.max(width, 300);
  const narrow = W < 560;
  const xa = W * (narrow ? 0.38 : 0.36), xb = W * (narrow ? 0.62 : 0.64), xm = W / 2;

  const side = (sp: Species) => {
    const out: { i: number; age: number; name: string }[] = [];
    let prevY = Infinity;
    for (let n = tree.nodes[sp.node].p; n >= 0 && n !== mrca; n = tree.nodes[n].p) {
      const node = tree.nodes[n];
      if (!node.n || node.u) continue;
      const yy = y(node.a);
      if (Math.abs(prevY - yy) < (narrow ? 26 : 15)) continue;
      prevY = yy;
      out.push({ i: n, age: node.a, name: node.n });
    }
    return out;
  };
  const la = useMemo(() => side(a), [a, mrca, W, tree.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const lb = useMemo(() => side(b), [b, mrca, W, tree.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const evs = EVENTS.filter((e) => e.major && e.age < top * 0.97 && e.age > 0.02);
  const ca = GROUP_COLORS[a.group] || '#5ef0c8', cb = GROUP_COLORS[b.group] || '#8b7bff';
  const lineA = '#5ef0c8', lineB = '#8b7bff';

  return (
    <div ref={ref} className="lineage">
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Lineages of ${a.name} and ${b.name} back to their common ancestor`}>
          <defs>
            <filter id="lp-glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {evs.map((e) => {
            const ey = y(e.age) - 4;
            const full = `${e.icon} ${e.title} · ${fmtShort(e.age)}`;
            // Only print the full label where it won't collide with a lineage label on the right side
            const clash = lb.some((n) => Math.abs(y(n.age) - ey) < 14 && xb + 10 + label(n.name, narrow).length * 7 + 40 > W - 10 - full.length * 5.6);
            return (
              <g key={e.id} opacity={0.75}>
                <line x1={8} x2={W - 8} y1={y(e.age)} y2={y(e.age)} stroke={EVENT_COLORS[e.kind]} strokeDasharray="2 5" opacity={0.45} />
                <text x={W - 10} y={ey} textAnchor="end" className="lp-event">{clash ? e.icon : full}<title>{full}</title></text>
              </g>
            );
          })}
          <path d={`M${xa},${H - 40} L${xa},${y(top) + 30} Q${xa},${y(top)} ${xm},${y(top)}`} stroke={lineA} strokeWidth={3} fill="none" filter="url(#lp-glow)" className="lp-draw" />
          <path d={`M${xb},${H - 40} L${xb},${y(top) + 30} Q${xb},${y(top)} ${xm},${y(top)}`} stroke={lineB} strokeWidth={3} fill="none" filter="url(#lp-glow)" className="lp-draw" />
          <circle cx={xm} cy={y(top)} r={9} fill="var(--warm)" filter="url(#lp-glow)" />
          <text x={xm} y={y(top) - 18} textAnchor="middle" className="lp-anc">Common ancestor · {fmtShort(top)}</text>
          {la.map((n) => (
            <a key={n.i} href={href('explore', [n.i])}>
              <circle cx={xa} cy={y(n.age)} r={4} fill="#0c1224" stroke={lineA} strokeWidth={2} />
              {narrow ? (
                <text x={xa - 10} y={y(n.age) + 1} textAnchor="end" className="lp-node"><title>{n.name}</title>{label(n.name, narrow)}<tspan x={xa - 10} dy={12} className="lp-age">{fmtShort(n.age)}</tspan></text>
              ) : <text x={xa - 10} y={y(n.age) + 4} textAnchor="end" className="lp-node">{label(n.name, narrow)} <tspan className="lp-age">{fmtShort(n.age)}</tspan></text>}
            </a>
          ))}
          {lb.map((n) => (
            <a key={n.i} href={href('explore', [n.i])}>
              <circle cx={xb} cy={y(n.age)} r={4} fill="#0c1224" stroke={lineB} strokeWidth={2} />
              {narrow ? (
                <text x={xb + 10} y={y(n.age) + 1} className="lp-node"><title>{n.name}</title>{label(n.name, narrow)}<tspan x={xb + 10} dy={12} className="lp-age">{fmtShort(n.age)}</tspan></text>
              ) : <text x={xb + 10} y={y(n.age) + 4} className="lp-node">{label(n.name, narrow)} <tspan className="lp-age">{fmtShort(n.age)}</tspan></text>}
            </a>
          ))}
          <text x={xa} y={H - 18} textAnchor="middle" className="lp-leaf" fill={ca}>{a.name}</text>
          <text x={xb} y={H - 18} textAnchor="middle" className="lp-leaf" fill={cb}>{b.name}</text>
          <text x={xm} y={H - 4} textAnchor="middle" className="lp-event">today</text>
        </svg>
      )}
    </div>
  );
}

function label(sci: string, narrow: boolean) {
  const f = friendly(sci);
  if (narrow) { const t = f && f.length < 18 ? f : sci; return t.length > 15 ? t.slice(0, 14) + '…' : t; }
  return f && f !== sci ? `${f}` : sci;
}
