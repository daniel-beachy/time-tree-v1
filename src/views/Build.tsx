import { useEffect, useMemo, useRef, useState } from 'react';
import { useTree } from '../components/TreeContext';
import { DatedTree } from '../components/DatedTree';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import { Explain } from '../components/Explain';
import { GROUP_COLORS, type Species, type Tree } from '../lib/data';
import { displayTree } from '../lib/layout';
import { go, href } from '../lib/router';
import { usePref } from '../lib/store';
import type { ScaleMode } from '../lib/timescale';
import { resolveSpecies, spArg } from './Relate';
import './Build.css';

const PRESETS: [string, string, string[]][] = [
  ['🦖', 'Dinosaurs & kin', ['Gallus gallus', 'Struthio camelus', 'Alligator mississippiensis', 'Crocodylus niloticus', 'Chelonia mydas', 'Varanus komodoensis', 'Homo sapiens']],
  ['🐒', 'Primates', ['Homo sapiens', 'Pan troglodytes', 'Pan paniscus', 'Gorilla gorilla', 'Pongo pygmaeus', 'Macaca mulatta', 'Lemur catta']],
  ['🐾', 'Pets', ['Canis lupus', 'Felis catus', 'Oryctolagus cuniculus', 'Melopsittacus undulatus', 'Carassius auratus', 'Mesocricetus auratus', 'Pogona vitticeps']],
  ['🍽️', 'Your dinner', ['Bos taurus', 'Sus scrofa', 'Gallus gallus', 'Salmo salar', 'Oryza sativa', 'Solanum tuberosum', 'Agaricus bisporus', 'Triticum aestivum']],
  ['🌍', 'All of life', ['Homo sapiens', 'Drosophila melanogaster', 'Saccharomyces cerevisiae', 'Arabidopsis thaliana', 'Plasmodium falciparum', 'Escherichia coli', 'Methanocaldococcus jannaschii']],
];

export function Build({ query }: { query: URLSearchParams }) {
  const tree = useTree();
  const [mode, setMode] = usePref<ScaleMode>('scale', 'log');
  const [events, setEvents] = usePref<boolean>('buildEvents', true);
  const [list, setList] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const idsArg = query.get('ids') ?? '';

  useEffect(() => {
    const ids = idsArg ? idsArg.split(',').filter(Boolean) : PRESETS[0][2];
    setLoading(true);
    Promise.all(ids.map((a) => resolveSpecies(tree, a).catch(() => null))).then((r) => {
      const seen = new Set<number>();
      setList(r.filter((s): s is Species => !!s && !seen.has(s.id) && !!seen.add(s.id)));
      setLoading(false);
    });
  }, [idsArg]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next: Species[]) => go('build', [], { ids: next.map(spArg).join(',') }, true);
  const presetIds = (names: string[]) => names.map((n) => tree.allSpecies().find((s) => s.sci === n)).filter(Boolean).map((s) => spArg(s!));
  const newick = useMemo(() => (list.length >= 2 ? toNewick(tree, list) : ''), [list, tree, tree.version]);

  return (
    <div className="build">
      <div className="eyebrow">Build a tree</div>
      <h1>Pick any species. <span className="grad">Get their family tree.</span></h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: 680 }}>
        Add up to 40 species — from our collection or anything TimeTree knows (search a name and pick a “live” result). The tree is drawn to scale: the further left a fork, the longer ago those lineages split.
      </p>

      <div className="build-presets row">
        <span className="small muted">Start from:</span>
        {PRESETS.map(([icon, label, names]) => (
          <button key={label} className="chip" onClick={() => go('build', [], { ids: presetIds(names).join(',') })}>{icon} {label}</button>
        ))}
        {list.length > 0 && <button className="chip" onClick={() => update([])}>✕ Clear</button>}
      </div>

      <div className="panel build-panel">
        <div className="build-chips">
          {list.map((s) => (
            <span key={s.id} className="chip build-chip" style={{ borderColor: GROUP_COLORS[s.group] + '66' }}>
              <SpeciesPhoto sp={s} size={20} round /> {s.name}{s.live && <span className="tiny" style={{ color: 'var(--glow)' }}> live</span>}
              <button aria-label={`Remove ${s.name}`} onClick={() => update(list.filter((x) => x.id !== s.id))}>×</button>
            </span>
          ))}
          <div className="build-add">
            <SpeciesPicker compact placeholder={list.length ? 'Add a species…' : 'Search any species…'} value={null}
              exclude={list.map((s) => s.id)} onPick={(s) => list.length < 40 && update([...list, s])} />
          </div>
        </div>

        <div className="build-toolbar row">
          <div className="row" style={{ gap: 8 }}>
            <div className="seg sm"><button className={mode === 'log' ? 'on' : ''} onClick={() => setMode('log')}>Stretched</button><button className={mode === 'linear' ? 'on' : ''} onClick={() => setMode('linear')}>Linear</button></div>
            <label className="small row" style={{ gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={events} onChange={(e) => setEvents(e.target.checked)} /> World events</label>
            <Explain topic="readtree">How to read a tree</Explain>
          </div>
          {list.length >= 2 && (
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm ghost" onClick={() => download('deep-roots-tree.nwk', newick, 'text/plain')}>Newick</button>
              <button className="btn sm ghost" onClick={() => svgRef.current && download('deep-roots-tree.svg', svgString(svgRef.current), 'image/svg+xml')}>SVG</button>
              <button className="btn sm ghost" onClick={() => svgRef.current && downloadPng(svgRef.current)}>PNG</button>
              <button className="btn sm ghost" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy link</button>
            </div>
          )}
        </div>

        {loading && <div className="row muted small" style={{ padding: 20 }}><span className="spinner" /> Loading species…</div>}
        {!loading && list.length < 2 && <p className="muted" style={{ padding: '30px 6px' }}>Add at least two species to draw a tree.</p>}
        {list.length >= 2 && <DatedTree ref={svgRef} species={list} mode={mode} events={events ? 'major' : []} rowH={list.length > 16 ? 28 : 36} />}
      </div>

      {list.length >= 2 && (
        <details className="panel build-newick">
          <summary className="small">Newick (branch lengths in millions of years)</summary>
          <pre className="mono tiny">{newick}</pre>
          <p className="tiny muted">Paste into iTOL, FigTree or R/ape. Internal node labels are TimeTree / NCBI group names where known. <a href={href('about')}>Methods</a></p>
        </details>
      )}
    </div>
  );
}

/** Newick string of the pruned, dated tree. Branch length = parent age − child age (Mya). */
function toNewick(tree: Tree, list: Species[]): string {
  const keep = new Set(list.map((s) => s.node));
  const root = displayTree(tree, tree.mrcaOf([...keep]), keep);
  const q = (s: string) => (/^[\w.-]+$/.test(s) ? s : `'${s.replace(/'/g, "''")}'`);
  const rec = (d: typeof root): string => {
    const len = d.parent ? `:${+(d.parent.age - d.age).toFixed(3)}` : '';
    if (!d.children.length) return q(tree.byNode.get(d.i)?.sci.replace(/ /g, '_') ?? String(d.i)) + len;
    const name = tree.nodes[d.i].n ? q(tree.nodes[d.i].n.replace(/ /g, '_')) : '';
    return `(${d.children.map(rec).join(',')})${name}${len}`;
  };
  return rec(root) + ';';
}

function svgString(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.dtr-x').forEach((n) => n.remove());
  clone.querySelectorAll('text').forEach((t) => { if (!t.getAttribute('fill')) t.setAttribute('fill', '#e8ecff'); });
  clone.querySelectorAll('.halo').forEach((t) => { t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#070b16'); t.setAttribute('stroke-width', '3'); });
  const credit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  credit.setAttribute('x', '8'); credit.setAttribute('y', String(+svg.getAttribute('height')! - 4));
  credit.setAttribute('font-size', '9'); credit.setAttribute('fill', '#5c6488');
  credit.textContent = 'Deep Roots · divergence times from TimeTree 5 (timetree.org)';
  clone.appendChild(credit);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function download(name: string, data: string | Blob, type: string) {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function downloadPng(svg: SVGSVGElement) {
  const w = +svg.getAttribute('width')!, h = +svg.getAttribute('height')!;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const ctx = c.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    c.toBlob((b) => b && download('deep-roots-tree.png', b, 'image/png'));
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString(svg));
}
