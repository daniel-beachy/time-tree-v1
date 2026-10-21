import { useEffect, useMemo, useRef, useState } from 'react';
import { GROUP_ICONS, type Species } from '../lib/data';
import { iconicToGroup, inatExtras, searchInat, type InatTaxon } from '../lib/live';
import { useTree } from './TreeContext';
import { SpeciesPhoto } from './SpeciesPhoto';
import './SpeciesPicker.css';

interface Props {
  value?: Species | null;
  onPick: (sp: Species) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** compact single-line style (Build-a-tree chips input) */
  compact?: boolean;
  exclude?: number[];
}

type Option = { kind: 'local'; sp: Species } | { kind: 'live'; t: InatTaxon };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function SpeciesPicker({ value, onPick, placeholder, autoFocus, compact, exclude = [] }: Props) {
  const tree = useTree();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<InatTaxon[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const local = useMemo(() => {
    const all = tree.allSpecies().filter((s) => !exclude.includes(s.id));
    if (!q.trim()) return [];
    const nq = norm(q.trim());
    const scored = all.map((s) => {
      const n = norm(s.name), sc = norm(s.sci);
      let score = -1;
      if (n === nq || sc === nq) score = 100;
      else if (n.startsWith(nq)) score = 80;
      else if (n.split(/[\s(/-]+/).some((w) => w.startsWith(nq))) score = 60;
      else if (sc.startsWith(nq)) score = 50;
      else if (n.includes(nq) || sc.includes(nq)) score = 30;
      return { s, score: score + (s.famous && score > 0 ? 5 : 0) };
    }).filter((x) => x.score > 0);
    return scored.sort((a, b) => b.score - a.score).slice(0, 8).map((x) => x.s);
  }, [q, tree.version, exclude.join(',')]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setLive([]); return; }
    const t = setTimeout(() => {
      searchInat(term).then((r) => {
        const known = new Set(tree.allSpecies().map((s) => norm(s.sci)));
        setLive(r.filter((x) => !known.has(norm(x.name)) && ['species', 'subspecies', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom'].includes(x.rank)).slice(0, 6));
      }).catch(() => setLive([]));
    }, 280);
    return () => clearTimeout(t);
  }, [q, tree]);

  const options: Option[] = [...local.map((sp) => ({ kind: 'local' as const, sp })), ...live.map((t) => ({ kind: 'live' as const, t }))];

  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function choose(o: Option) {
    setErr(null);
    if (o.kind === 'local') {
      onPick(o.sp);
      setQ(''); setOpen(false);
      return;
    }
    const t = o.t;
    setBusy(t.name);
    try {
      const sp = await tree.addLive(t.name, inatExtras(t));
      onPick(sp);
      setQ(''); setOpen(false);
    } catch (e) {
      setErr((e as Error).message || 'Could not load that species from TimeTree.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={'picker' + (compact ? ' compact' : '')} ref={box}>
      {value && !open && !compact ? (
        <button className="picker-value" onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0); }}>
          <SpeciesPhoto sp={value} size={28} round />
          <span><b>{value.name}</b> <i className="sci">{value.sci}</i></span>
          <span className="picker-change">change</span>
        </button>
      ) : (
        <input
          ref={input}
          value={q}
          autoFocus={autoFocus}
          placeholder={placeholder || 'Search any living thing… (e.g. octopus, oak, yeast)'}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { setHi((h) => Math.min(h + 1, options.length - 1)); e.preventDefault(); }
            if (e.key === 'ArrowUp') { setHi((h) => Math.max(h - 1, 0)); e.preventDefault(); }
            if (e.key === 'Enter' && options[hi]) choose(options[hi]);
            if (e.key === 'Escape') setOpen(false);
          }}
          aria-label="Search species"
        />
      )}
      {busy && <div className="picker-busy"><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Asking TimeTree about <i>{busy}</i>…</div>}
      {err && <div className="picker-err">{err}</div>}
      {open && q.trim() && (
        <div className="picker-menu">
          {options.length === 0 && <div className="picker-empty">{q.trim().length < 3 ? 'Keep typing…' : 'Searching…'}</div>}
          {options.map((o, i) => o.kind === 'local' ? (
            <button key={'l' + o.sp.id} className={'picker-opt' + (i === hi ? ' hi' : '')} onMouseEnter={() => setHi(i)} onClick={() => choose(o)}>
              <SpeciesPhoto sp={o.sp} size={34} round />
              <span className="po-text"><b>{o.sp.name}</b><i className="sci">{o.sp.sci}</i></span>
              <span className="po-tag">{GROUP_ICONS[o.sp.group]}</span>
            </button>
          ) : (
            <button key={'i' + o.t.id} className={'picker-opt' + (i === hi ? ' hi' : '')} onMouseEnter={() => setHi(i)} onClick={() => choose(o)}>
              <div className="sp-photo" style={{ width: 34, height: 34, borderRadius: '50%' }}>
                {o.t.default_photo ? <img src={o.t.default_photo.square_url} alt="" /> : <span className="sp-photo-icon">{GROUP_ICONS[iconicToGroup(o.t.iconic_taxon_name)]}</span>}
              </div>
              <span className="po-text"><b>{o.t.preferred_common_name ? cap(o.t.preferred_common_name) : o.t.name}</b><i className="sci">{o.t.name} · {o.t.rank}</i></span>
              <span className="po-tag live" title="Fetched live from TimeTree">live</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
