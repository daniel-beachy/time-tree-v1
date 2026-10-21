import { useEffect, useMemo, useState } from 'react';
import type { Species, Study, Tree } from '../lib/data';
import { fetchMrca } from '../lib/live';
import { fmtMya } from '../lib/format';
import { Explain } from './Explain';
import { useWidth } from './TimeStrip';
import './ExpertPanel.css';

/** "For scientists" details for the MRCA of a set of species. */
export function ExpertPanel({ tree, node, species }: { tree: Tree; node: number; species: Species[] }) {
  const [open, setOpen] = useState(false);
  const [studies, setStudies] = useState<Study[] | null>(null);
  const [estimates, setEstimates] = useState<number[] | null>(null);
  const [liveMeta, setLiveMeta] = useState<{ ttid: number; taxon: number } | null>(null);
  const n = tree.nodes[node];
  const ids = species.map((s) => s.id);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setStudies(null); setEstimates(null); setLiveMeta(null);
    tree.studies(node).then((s) => live && setStudies(s));
    fetchMrca(ids).then((r) => {
      if (!live || !r) return;
      setEstimates(r.estimates);
      setLiveMeta({ ttid: r.raw.mrca_ttid, taxon: r.raw.taxon_id });
    });
    return () => { live = false; };
  }, [open, node, ids.join('+')]); // eslint-disable-line react-hooks/exhaustive-deps

  const times = estimates?.length ? estimates : studies?.map((s) => s.time).filter((t) => t > 0) ?? [];
  const outside = n.hi > 0 && (n.a > n.hi * 1.001 || n.a < n.lo * 0.999);
  const named = nearestNamed(tree, node);

  const csv = () => {
    const rows = [['author', 'year', 'title', 'pubmed', 'time_mya'], ...(studies || []).map((s) => [s.author, s.year, s.title, s.pubmed ?? '', s.time])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timetree-${ids.join('-')}-studies.csv`;
    a.click();
  };

  return (
    <div className={'expert panel' + (open ? ' open' : '')}>
      <button className="expert-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span><span className="mono">{'</>'}</span> For scientists: data, studies & methods</span>
        <span className="chev">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="expert-body fadein">
          <dl className="kv">
            <div><dt>Adjusted age</dt><dd className="mono">{fmtMya(n.a)}</dd></div>
            <div><dt>Median (precomputed)</dt><dd className="mono">{n.s ? fmtMya(n.s) : '—'}</dd></div>
            <div><dt>95% CI</dt><dd className="mono">{n.hi > 0 ? `${n.lo.toFixed(2)} – ${n.hi.toFixed(2)} Mya` : 'not available'}</dd></div>
            <div><dt>Studies at this node</dt><dd className="mono">{n.k}</dd></div>
            <div><dt>MRCA taxon</dt><dd>{n.n ? <><i>{n.n}</i>{n.r && <span className="muted"> ({n.r})</span>}</> : <span className="muted">unnamed node within <i>{named}</i></span>}</dd></div>
            <div><dt>NCBI taxon</dt><dd className="mono">{n.x > 0 ? <a href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${n.x}`} target="_blank" rel="noreferrer">{n.x}</a> : liveMeta?.taxon ? liveMeta.taxon : '—'}</dd></div>
            <div><dt>TimeTree node</dt><dd className="mono">{liveMeta ? liveMeta.ttid : '…'} · level {n.v}</dd></div>
            <div><dt>Species</dt><dd>{species.map((s, i) => <span key={s.id}>{i > 0 && ', '}<i>{s.sci}</i> <span className="mono muted">({s.id})</span></span>)}</dd></div>
          </dl>
          {outside && (
            <p className="note small">
              ⚠ The adjusted age lies outside the median's confidence interval. TimeTree shifts node ages so that ancestors are always older than their descendants; here the studies directly estimating this split conflict with older splits elsewhere in the tree. <Explain topic="adjusted">Adjusted vs. median</Explain>
            </p>
          )}
          {times.length > 0 && (
            <div className="section" style={{ marginTop: 18 }}>
              <span className="eyebrow">Spread of individual study estimates ({times.length})</span>
              <Histogram values={times} mark={n.a} lo={n.lo} hi={n.hi} />
            </div>
          )}
          <div className="section" style={{ marginTop: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">Studies behind this node</span>
              {studies && studies.length > 0 && <button className="btn sm ghost" onClick={csv}>Download CSV</button>}
            </div>
            {!studies ? <div className="spinner" style={{ margin: 12 }} /> : studies.length === 0 ? (
              <p className="muted small" style={{ marginTop: 8 }}>No per-node study list in the offline snapshot for this node{species.some((s) => s.live) ? ' (it was added live)' : ''}. See timetree.org for full details.</p>
            ) : (
              <div className="studies">
                <table>
                  <thead><tr><th>Estimate</th><th>Study</th><th>Year</th></tr></thead>
                  <tbody>
                    {[...studies].sort((a, b) => b.year - a.year).map((s, i) => (
                      <tr key={i}>
                        <td className="mono">{s.time ? s.time.toFixed(1) : '—'}</td>
                        <td>
                          {s.author} et al. — {s.pubmed ? <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pubmed}/`} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                        </td>
                        <td className="mono muted">{s.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="row small" style={{ marginTop: 16 }}>
            {species.length === 2 && (
              <a className="btn sm" href={`https://timetree.org/pairwise?taxonA=${encodeURIComponent(species[0].sci)}&taxonB=${encodeURIComponent(species[1].sci)}`} target="_blank" rel="noreferrer">Open on timetree.org ↗</a>
            )}
            <a className="btn sm ghost" href={`https://api.timetree.org/mrca/id/${ids.join('+')}/json`} target="_blank" rel="noreferrer">Raw API JSON ↗</a>
          </div>
          <p className="tiny muted" style={{ marginTop: 14 }}>
            Data: Kumar S, et al. (2022) TimeTree 5: An Expanded Resource for Species Divergence Times. <i>Mol Biol Evol</i> 39:msac174. Snapshot version {tree.meta.ttVersion ?? '—'}, built {tree.meta.built.slice(0, 10)}.
          </p>
        </div>
      )}
    </div>
  );
}

function nearestNamed(tree: Tree, i: number) {
  for (let n = i; n >= 0; n = tree.nodes[n].p) if (tree.nodes[n].n) return tree.nodes[n].n;
  return 'cellular organisms';
}

function Histogram({ values, mark, lo, hi }: { values: number[]; mark: number; lo: number; hi: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const W = Math.max(w, 260), H = 120, pad = 24;
  const { bins, x0, x1 } = useMemo(() => {
    const all = [...values, mark];
    let a = Math.min(...all), b = Math.max(...all);
    if (a === b) { a *= 0.9; b *= 1.1; }
    const n = Math.min(24, Math.max(6, Math.round(Math.sqrt(values.length) * 2)));
    const step = (b - a) / n;
    const bins = Array.from({ length: n }, (_, i) => ({ from: a + i * step, to: a + (i + 1) * step, c: 0 }));
    for (const v of values) bins[Math.min(n - 1, Math.floor((v - a) / step))].c++;
    return { bins, x0: a, x1: b };
  }, [values, mark]);
  const max = Math.max(...bins.map((b) => b.c));
  const sx = (v: number) => pad + ((v - x0) / (x1 - x0)) * (W - pad * 2);
  return (
    <div ref={ref} className="histo">
      {w > 0 && (
        <svg width={W} height={H + 22}>
          {hi > 0 && <rect x={sx(lo)} width={Math.max(2, sx(hi) - sx(lo))} y={0} height={H} fill="var(--warm)" opacity={0.12} />}
          {bins.map((b, i) => (
            <rect key={i} x={sx(b.from) + 1} width={Math.max(1, sx(b.to) - sx(b.from) - 2)} y={H - (b.c / max) * (H - 10)} height={(b.c / max) * (H - 10)} fill="var(--glow2)" opacity={0.75} rx={2}>
              <title>{`${b.from.toFixed(1)}–${b.to.toFixed(1)} Mya: ${b.c} estimate(s)`}</title>
            </rect>
          ))}
          <line x1={sx(mark)} x2={sx(mark)} y1={0} y2={H} stroke="var(--warm)" strokeWidth={2} />
          <text x={sx(mark)} y={10} dx={4} className="histo-l">adjusted {mark.toFixed(1)}</text>
          <text x={pad} y={H + 16} className="histo-t">{x0.toFixed(0)} Mya</text>
          <text x={W - pad} y={H + 16} textAnchor="end" className="histo-t">{x1.toFixed(0)} Mya</text>
        </svg>
      )}
    </div>
  );
}
