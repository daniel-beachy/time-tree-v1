import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTree } from '../components/TreeContext';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import { Explain } from '../components/Explain';
import { useWidth } from '../components/TimeStrip';
import { GROUP_COLORS, GROUP_ICONS, type Species, type Tree } from '../lib/data';
import { displayTree, eachNode, ladderize, leavesOf, type DNode } from '../lib/layout';
import { timeScale } from '../lib/timescale';
import { EVENTS, EVENT_COLORS } from '../data/events';
import { fmtAge, fmtShort, friendly } from '../lib/format';
import { go, href } from '../lib/router';
import { wikiSummary, type WikiSummary } from '../lib/live';
import { namedGroup, pick } from '../lib/insights';
import { spArg } from './Relate';
import './Explore.css';

const RING_EVENTS = ['kpg', 'permian', 'cambrian', 'goe', 'dinos', 'flowers', 'landplants', 'tetrapods'];

export function Explore({ args, query }: { args: string[]; query: URLSearchParams }) {
  const tree = useTree();
  const focus = clampFocus(tree, Number(args[0] ?? 0));
  const sel = query.get('sel') != null ? Number(query.get('sel')) : null;
  const [hover, setHover] = useState<DNode | null>(null);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [height, setHeight] = useState(600);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [k, setK] = useState(1);

  useEffect(() => {
    const f = () => setHeight(Math.max(420, window.innerHeight - (wrapRef.current?.getBoundingClientRect().top ?? 64)));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [wrapRef]);

  const root = useMemo(() => {
    const r = displayTree(tree, focus);
    ladderize(r);
    return r;
  }, [tree, focus, tree.version]);

  const nLeaves = root.leaves;
  const panelW = width > 900 ? 360 : 0;
  const cx = (width - panelW) / 2;
  const size = Math.min(width - panelW, height);
  const R = Math.max(160, size / 2 - (nLeaves > 140 ? 40 : 110));
  const rootAge = root.age || 1;

  // Radial layout: angle from leaf order, radius from age (stretched/log scale)
  const layout = useMemo(() => {
    const r = timeScale('log', rootAge * 1.08, 0, 0, R);
    const leaves = leavesOf(root);
    const span = Math.PI * 2;
    leaves.forEach((l, i) => { l.angle = (i + 0.5) / leaves.length * span; l.order = i; });
    const post = (d: DNode) => {
      d.children.forEach(post);
      if (d.children.length) d.angle = (d.children[0].angle! + d.children[d.children.length - 1].angle!) / 2;
      d.r = d.children.length ? r(d.age) : R;
      d.x = Math.sin(d.angle!) * d.r;
      d.y = -Math.cos(d.angle!) * d.r;
    };
    post(root);
    return { r, leaves };
  }, [root, R, rootAge]);

  const byIndex = useMemo(() => {
    const m = new Map<number, DNode>();
    eachNode(root, (d) => m.set(d.i, d));
    return m;
  }, [root]);

  // selected node + highlight path
  const selD = sel != null ? byIndex.get(sel) ?? null : null;
  const highlight = useMemo(() => {
    const s = new Set<number>();
    for (let d = selD; d; d = d.parent) s.add(d.i);
    return s;
  }, [selD]);

  // on phones the panel is a bottom sheet, so aim above it
  const flyT = (d: DNode, scale: number) => d3.zoomIdentity.translate(cx, width <= 760 ? height * 0.27 : height / 2).scale(scale).translate(-(d.x ?? 0), -(d.y ?? 0));
  const leafScale = Math.max(2.5, Math.min(5, nLeaves / 90));
  // zoom/pan
  useEffect(() => {
    if (!svgRef.current || !width) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 24]).on('zoom', (e) => {
      gRef.current?.setAttribute('transform', e.transform.toString());
      const nk = Math.pow(2, Math.round(Math.log2(e.transform.k) * 2) / 2);
      setK((old) => (old === nk ? old : nk));
    });
    zoomRef.current = zoom;
    svg.call(zoom).on('dblclick.zoom', null);
    // start zoomed onto a selected species (deep links), otherwise show the whole tree
    const start = selD && !selD.children.length ? flyT(selD, leafScale) : d3.zoomIdentity.translate(cx, height / 2);
    svg.call(zoom.transform, start);
  }, [width, height, focus, cx]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyTo = (d: DNode, scale = 4) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(900).call(zoomRef.current.transform, flyT(d, scale));
  };

  useEffect(() => {
    if (selD && !selD.children.length) flyTo(selD, leafScale);
  }, [selD?.i]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (i: number | null) => go('explore', [focus], { sel: i ?? undefined }, true);

  const leafSpacing = (2 * Math.PI * R * k) / nLeaves;
  const showLabels = leafSpacing > 7.5;
  const fs = Math.min(13, Math.max(8, leafSpacing * 0.85)) / k;

  // clade bands: contiguous runs of leaves with the same broad group
  const bands = useMemo(() => {
    const out: { group: string; a0: number; a1: number; n: number }[] = [];
    for (const l of layout.leaves) {
      const last = out[out.length - 1];
      const g = l.group;
      const half = Math.PI / layout.leaves.length;
      if (last && last.group === g) { last.a1 = l.angle! + half; last.n++; } else out.push({ group: g, a0: l.angle! - half, a1: l.angle! + half, n: 1 });
    }
    return out.filter((b) => b.n >= Math.max(2, nLeaves / 80));
  }, [layout, nLeaves]);

  const rings = useMemo(() => {
    // Place each ring's label at an angle where it won't collide with the labels already placed
    const placed: { x: number; y: number }[] = [];
    const cands = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4];
    return EVENTS.filter((e) => RING_EVENTS.includes(e.id) && e.age < rootAge)
      .sort((a, b) => a.age - b.age)
      .map((e) => {
        const rr = layout.r(e.age);
        let ang = 0;
        for (const c of cands) {
          const x = Math.sin(c) * rr, y = -Math.cos(c) * rr;
          if (placed.every((p) => Math.abs(p.x - x) > 150 || Math.abs(p.y - y) > 16)) { ang = c; break; }
          ang = c;
        }
        placed.push({ x: Math.sin(ang) * rr, y: -Math.cos(ang) * rr });
        return { e, rr, ang };
      });
  }, [layout, rootAge]);

  const crumbs = useMemo(() => {
    const out: number[] = [];
    for (let n = focus; n >= 0; n = tree.nodes[n].p) if (n === 0 || tree.nodes[n].n || n === focus) out.push(n);
    return out.reverse();
  }, [tree, focus]);

  return (
    <div className="explore">
      <div className="ex-bar">
        <nav className="crumbs" aria-label="Breadcrumbs">
          {crumbs.map((c, i) => (
            <span key={c}>
              {i > 0 && <span className="sep">›</span>}
              <a href={href('explore', [c])} className={c === focus ? 'on' : ''}>{c === 0 ? 'All life' : friendly(tree.nodes[c].n) || tree.nodes[c].n || 'unnamed group'}</a>
            </span>
          ))}
        </nav>
        <div className="ex-search">
          <SpeciesPicker compact placeholder="Find a species on the tree…" onPick={(s) => {
            // focus must contain the species
            const inFocus = tree.ancestors(s.node).includes(focus);
            go('explore', [inFocus ? focus : 0], { sel: s.node }, !inFocus ? false : true);
          }} />
        </div>
      </div>

      <div className="ex-main" ref={wrapRef} style={{ height }}>
        {width > 0 && (
          <svg ref={svgRef} width={width} height={height} className="ex-svg" onClick={(e) => { if (e.target === svgRef.current) select(null); }}>
            <g ref={gRef}>
              {/* event rings */}
              {rings.map(({ e, rr, ang }) => (
                <g key={e.id} className="ring">
                  <circle r={rr} fill="none" stroke={EVENT_COLORS[e.kind]} strokeDasharray={`${3 / k} ${5 / k}`} strokeWidth={1 / k} opacity={0.4} />
                  {rr * k > 110 && <text transform={`rotate(${(ang * 180) / Math.PI}) translate(0,${-rr - 4 / k})`} textAnchor="middle" fontSize={10.5 / k} fill={EVENT_COLORS[e.kind]} strokeWidth={3 / k} className="ring-label">{e.icon} {e.title} · {fmtShort(e.age)}</text>}
                </g>
              ))}
              {/* clade bands */}
              {nLeaves > 30 && bands.map((b, i) => {
                const r0 = R + (showLabels ? 90 / Math.max(1, k * 0.6) : 8), r1 = r0 + 10 / Math.sqrt(k);
                const arc = d3.arc()({ innerRadius: r0, outerRadius: r1, startAngle: b.a0, endAngle: b.a1 }) || '';
                const mid = (b.a0 + b.a1) / 2;
                const lr = r1 + 14 / k;
                const flip = mid > Math.PI / 2 && mid < Math.PI * 1.5;
                return (
                  <g key={i}>
                    <path d={arc} fill={GROUP_COLORS[b.group] || '#888'} opacity={0.55} />
                    {(b.a1 - b.a0) * lr * k > 60 && (
                      <text transform={`rotate(${(mid * 180) / Math.PI}) translate(0,${-lr}) ${flip ? 'rotate(180)' : ''}`} textAnchor="middle" dy={flip ? 4 / k : 0}
                        fontSize={12 / k} fill={GROUP_COLORS[b.group]} className="band-label">
                        {GROUP_ICONS[b.group]} {tree.meta.groups[b.group] || b.group}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* branches */}
              <Branches root={root} k={k} highlight={highlight} />
              {/* internal nodes (clickable) */}
              {[...byIndex.values()].filter((d) => d.children.length).map((d) => (
                <circle key={d.i} cx={d.x} cy={d.y} r={(d.i === sel ? 6 : tree.nodes[d.i].n ? 2.6 : 1.6) / Math.pow(k, 0.8)}
                  className={'inode' + (tree.nodes[d.i].n ? ' named' : '') + (d.i === sel ? ' sel' : '')}
                  onClick={(e) => { e.stopPropagation(); select(d.i); }}
                  onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} />
              ))}
              {/* leaves */}
              {layout.leaves.map((d) => {
                const sp = tree.byNode.get(d.i);
                const deg = (d.angle! * 180) / Math.PI - 90;
                const flip = d.angle! > Math.PI;
                const on = highlight.has(d.i);
                return (
                  <g key={d.i} className={'leaf' + (on ? ' on' : '')} onClick={(e) => { e.stopPropagation(); select(d.i); }}
                     onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
                    <circle cx={d.x} cy={d.y} r={(on ? 4.5 : 2.8) / Math.pow(k, 0.8)} fill={GROUP_COLORS[d.group] || '#aaa'} />
                    {(showLabels || on) && sp && (
                      <text transform={`translate(${d.x},${d.y}) rotate(${flip ? deg + 180 : deg})`} x={flip ? -6 / k : 6 / k} dy={fs * 0.35}
                        textAnchor={flip ? 'end' : 'start'} fontSize={on ? Math.max(fs, 12 / k) : fs} className="leaf-label">{sp.name}</text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
        <div className="ex-legend">
          <div className="row small" style={{ gap: 10 }}>
            <button className="btn sm ghost" onClick={() => svgRef.current && zoomRef.current && d3.select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, d3.zoomIdentity.translate(cx, height / 2))}>⟲ Reset view</button>
            <Explain topic="readtree">How to read this</Explain>
          </div>
          <p className="tiny muted" style={{ marginTop: 6 }}>Center = {fmtAge(rootAge)} · edge = today · scroll/pinch to zoom · tap any branch point</p>
        </div>
        {hover && !(selD && hover.i === selD.i) && <HoverTip tree={tree} d={hover} />}
        {selD ? <SidePanel tree={tree} d={selD} focus={focus} onClose={() => select(null)} onFly={() => flyTo(selD, selD.children.length ? 2 : 4)} />
          : <Intro tree={tree} focus={focus} nLeaves={nLeaves} />}
      </div>
    </div>
  );
}

function clampFocus(tree: Tree, f: number) {
  if (!Number.isFinite(f) || f < 0 || f >= tree.nodes.length) return 0;
  // a leaf can't be a focus — use its branching parent
  if (!tree.children[f].length) return tree.branchingAncestor(f);
  return f;
}

function Branches({ root, k, highlight }: { root: DNode; k: number; highlight: Set<number> }) {
  const paths: React.ReactNode[] = [];
  eachNode(root, (d) => {
    for (const c of d.children) {
      const a0 = d.angle!, a1 = c.angle!, r0 = d.r!;
      const p0x = Math.sin(a0) * r0, p0y = -Math.cos(a0) * r0;
      const p1x = Math.sin(a1) * r0, p1y = -Math.cos(a1) * r0;
      const sweep = a1 > a0 ? 1 : 0;
      const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
      const dPath = `M${p0x},${p0y} A${r0},${r0} 0 ${large} ${sweep} ${p1x},${p1y} L${c.x},${c.y}`;
      const on = highlight.has(c.i);
      paths.push(
        <path key={c.i} d={dPath} fill="none" stroke={on ? 'var(--warm)' : GROUP_COLORS[c.group] || '#8a97b8'}
          strokeWidth={(on ? 2.6 : 1.1) / Math.pow(k, 0.8)} opacity={on ? 1 : c.group === 'mixed' ? 0.5 : 0.75} className={on ? 'br on' : 'br'} />,
      );
    }
  });
  return <g className="branches">{paths}</g>;
}

function HoverTip({ tree, d }: { tree: Tree; d: DNode }) {
  const sp = tree.byNode.get(d.i);
  const n = tree.nodes[d.i];
  return (
    <div className="ex-tip">
      {sp ? (
        <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
          <SpeciesPhoto sp={sp} size={40} round />
          <div><b>{sp.name}</b><div className="sci small">{sp.sci}</div></div>
        </div>
      ) : (
        <>
          <b>{n.n ? friendly(n.n) || n.n : `Ancestor within ${friendly(tree.nodes[namedGroup(tree, d.i)].n) || tree.nodes[namedGroup(tree, d.i)].n}`}</b>
          <div className="small muted">{n.u ? 'no time estimate' : fmtAge(n.a)} · {d.leaves} species</div>
        </>
      )}
    </div>
  );
}

function Intro({ tree, focus, nLeaves }: { tree: Tree; focus: number; nLeaves: number }) {
  const n = tree.nodes[focus];
  return (
    <aside className="ex-panel intro">
      <div className="eyebrow">{focus === 0 ? 'The tree of life' : 'Exploring'}</div>
      <h2>{focus === 0 ? 'All cellular life' : friendly(n.n) || n.n || 'Unnamed group'}</h2>
      <p className="small text2" style={{ marginTop: 8 }}>
        {nLeaves} species in our collection, all descended from one ancestor that lived {fmtAge(n.a)}. Each colored tip is a species; every fork is a common ancestor placed at the time it lived.
      </p>
      <p className="small muted" style={{ marginTop: 8 }}>Dashed rings mark major events in Earth's history. Tap a fork to learn about that group.</p>
    </aside>
  );
}

function SidePanel({ tree, d, focus, onClose, onFly }: { tree: Tree; d: DNode; focus: number; onClose: () => void; onFly: () => void }) {
  const sp = tree.byNode.get(d.i);
  const n = tree.nodes[d.i];
  const named = n.n || tree.nodes[namedGroup(tree, d.i)].n;
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  useEffect(() => {
    setWiki(null);
    const title = sp ? (sp.wiki?.split('/wiki/')[1] ? decodeURIComponent(sp.wiki.split('/wiki/')[1]) : sp.sci) : n.n;
    if (title) wikiSummary(title).then(setWiki);
  }, [d.i]); // eslint-disable-line react-hooks/exhaustive-deps

  const members = useMemo(() => (sp ? [] : tree.leavesUnder(d.i)), [d.i]); // eslint-disable-line react-hooks/exhaustive-deps
  const famous = members.filter((m) => m.famous);
  const parentAge = d.parent ? tree.nodes[d.parent.i].a : null;
  const groupsHere = useMemo(() => {
    const m = new Map<string, number>();
    members.forEach((s) => m.set(s.group, (m.get(s.group) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [members]);

  return (
    <aside className="ex-panel fadein" key={d.i}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      {sp ? (
        <>
          <SpeciesPhoto sp={sp} className="ex-hero" />
          <div className="eyebrow" style={{ marginTop: 12 }}>{GROUP_ICONS[sp.group]} {tree.meta.groups[sp.group] || 'Species'}</div>
          <h2>{sp.name}</h2>
          <div className="sci">{sp.sci}</div>
          {sp.note && <p className="note small">{sp.note}</p>}
          {wiki?.extract && <p className="small text2" style={{ marginTop: 10 }}>{wiki.extract.slice(0, 300)}{wiki.extract.length > 300 ? '…' : ''}</p>}
          {parentAge != null && <p className="small" style={{ marginTop: 10 }}>Its closest relatives in our collection split off <b>{fmtAge(parentAge)}</b>.</p>}
          <div className="stack" style={{ marginTop: 14, gap: 8 }}>
            <a className="btn sm primary" href={href('relate', [9606, spArg(sp)])}>How related is it to me?</a>
            <a className="btn sm" href={href('time', [spArg(sp)])}>Its family history in Deep Time</a>
            <button className="btn sm ghost" onClick={onFly}>Zoom to it</button>
          </div>
        </>
      ) : (
        <>
          <div className="eyebrow">{n.r || 'group'} · {d.leaves} species here</div>
          <h2>{n.n ? friendly(n.n) || n.n : 'An unnamed ancestor'}</h2>
          {n.n && friendly(n.n) && <div className="sci">{n.n}</div>}
          {!n.n && <p className="small muted">A branching point within <i>{friendly(named) || named}</i>. <Explain topic="unnamed">Why unnamed?</Explain></p>}
          <div className="big-mini"><span className="grad">{n.u ? '?' : fmtShort(n.a).replace(/ (Mya|Bya)/, '')}</span> <span className="muted small">{n.u ? 'no time estimate' : fmtAge(n.a).replace(/^[\d.,]+ /, '')}</span></div>
          {n.hi > 0 && <p className="tiny muted">likely {fmtShort(n.lo)} – {fmtShort(n.hi)} · {n.k} studies</p>}
          {wiki?.extract && n.n && <p className="small text2" style={{ marginTop: 10 }}>{wiki.extract.slice(0, 320)}{wiki.extract.length > 320 ? '…' : ''}</p>}
          <div className="row" style={{ marginTop: 12, gap: 6 }}>
            {groupsHere.map(([g, c]) => <span key={g} className="chip"><span className="dot" style={{ background: GROUP_COLORS[g] }} />{tree.meta.groups[g] || g} {c}</span>)}
          </div>
          {famous.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="eyebrow">Includes</div>
              <div className="ex-faces">
                {famous.slice(0, 12).map((m) => <a key={m.id} href={href('explore', [focus], { sel: m.node })} title={m.name}><SpeciesPhoto sp={m} size={36} round /></a>)}
              </div>
            </div>
          )}
          <div className="stack" style={{ marginTop: 14, gap: 8 }}>
            {d.i !== focus && <a className="btn sm primary" href={href('explore', [d.i])}>Explore inside this group →</a>}
            {members.length >= 2 && (
              <button className="btn sm" onClick={() => {
                // two members on opposite sides of this fork, so their ancestor is exactly this node
                const sideA = tree.leavesUnder(d.children[0].i), sideB = tree.leavesUnder(d.children[d.children.length - 1].i);
                const pa = sideA.filter((s) => s.famous).length ? sideA.filter((s) => s.famous) : sideA;
                const pb = sideB.filter((s) => s.famous).length ? sideB.filter((s) => s.famous) : sideB;
                go('relate', [spArg(pick(pa)), spArg(pick(pb))]);
              }}>Compare two members</button>
            )}
            <a className="btn sm ghost" href={href('build', [], { ids: (famous.length >= 3 ? famous : members).slice(0, 14).map((m: Species) => spArg(m)).join(',') })}>Build a tree of this group</a>
          </div>
        </>
      )}
    </aside>
  );
}
