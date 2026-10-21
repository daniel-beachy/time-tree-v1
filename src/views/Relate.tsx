import { useEffect, useMemo, useState } from 'react';
import { useTree } from '../components/TreeContext';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import { TimeStrip } from '../components/TimeStrip';
import { LineagePath } from '../components/LineagePath';
import { ExpertPanel } from '../components/ExpertPanel';
import { Explain } from '../components/Explain';
import { GROUP_COLORS, type Species, type Tree } from '../lib/data';
import { ageParts, eventsSince, fmtAge, fmtDuration, fmtShort, friendly, periodAt } from '../lib/format';
import { EVENTS, type WorldEvent } from '../data/events';
import { go, href } from '../lib/router';
import { makeCloser, namedGroup, pick, splitAge, type CloserQ } from '../lib/insights';
import { inatExtras, searchInat, wikiSummary, type WikiSummary } from '../lib/live';
import './Relate.css';

export const SUGGESTED: [string, string][] = [
  ['Homo sapiens', 'Agaricus bisporus'],
  ['Balaenoptera musculus', 'Hippopotamus amphibius'],
  ['Gallus gallus', 'Alligator mississippiensis'],
  ['Homo sapiens', 'Musa acuminata'],
  ['Octopus vulgaris', 'Homo sapiens'],
  ['Elephas maximus', 'Trichechus manatus'],
  ['Felis catus', 'Canis lupus'],
  ['Homo sapiens', 'Pan troglodytes'],
];

/** Resolve a route arg (NCBI id for snapshot species, or scientific name for live ones). */
export async function resolveSpecies(tree: Tree, arg: string | undefined): Promise<Species | null> {
  if (!arg) return null;
  const id = Number(arg);
  if (Number.isFinite(id) && tree.species.has(id)) return tree.species.get(id)!;
  const byName = tree.allSpecies().find((s) => s.sci.toLowerCase() === arg.toLowerCase());
  if (byName) return byName;
  if (Number.isFinite(id)) return null;
  // Deep link to a live species: borrow its common name and photo from iNaturalist when we can.
  const t = await searchInat(arg).then((r) => r.find((x) => x.name.toLowerCase() === arg.toLowerCase())).catch(() => undefined);
  return tree.addLive(arg, t ? inatExtras(t) : {});
}

export const spArg = (s: Species) => (s.live ? s.sci : String(s.id));
export const bySci = (tree: Tree, sci: string) => tree.allSpecies().find((s) => s.sci === sci);

export function Relate({ args }: { args: string[] }) {
  const tree = useTree();
  const [a, setA] = useState<Species | null>(null);
  const [b, setB] = useState<Species | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setErr(null);
    setLoading(true);
    Promise.all([resolveSpecies(tree, args[0]), resolveSpecies(tree, args[1])])
      .then(([x, y]) => { if (live) { setA(x); setB(y); } })
      .catch((e) => live && setErr(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [args[0], args[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (x: Species | null, y: Species | null) => {
    go('relate', [x ? spArg(x) : '_', ...(y ? [spArg(y)] : [])].filter((v, i) => i === 0 || v));
  };

  const ready = a && b && a.id !== b.id;

  return (
    <div className="relate">
      <div className="relate-pick">
        <div className="eyebrow">How related are…</div>
        <div className="pick-row">
          <SpeciesPicker value={a} onPick={(s) => set(s, b)} placeholder="Pick a living thing…" />
          <button className="swap" onClick={() => set(b, a)} title="Swap" aria-label="Swap species" disabled={!a || !b}>⇄</button>
          <SpeciesPicker value={b} onPick={(s) => set(a, s)} placeholder="…and another one" />
        </div>
        {!ready && (
          <div className="suggest">
            <span className="muted small">Try:</span>
            {SUGGESTED.map(([x, y]) => {
              const sx = bySci(tree, x), sy = bySci(tree, y);
              if (!sx || !sy) return null;
              return <a key={x + y} className="chip" href={href('relate', [sx.id, sy.id])}>{sx.name} & {sy.name}</a>;
            })}
          </div>
        )}
        {a && b && a.id === b.id && <p className="muted" style={{ marginTop: 12 }}>That's the same species twice — pick something different to compare.</p>}
        {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}
        {loading && <div className="center" style={{ padding: 40 }}><div className="spinner" /></div>}
      </div>
      {ready && !loading && <RelateResult key={`${a.id}-${b.id}`} a={a} b={b} />}
    </div>
  );
}

function RelateResult({ a, b }: { a: Species; b: Species }) {
  const tree = useTree();
  const { node, age, n } = splitAge(tree, a, b);
  const parts = ageParts(age);
  const groupNode = namedGroup(tree, node);
  const groupName = tree.nodes[groupNode].n;
  const period = periodAt(age);
  const since = eventsSince(age);
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  useEffect(() => { if (groupName) wikiSummary(groupName).then(setWiki); }, [groupName]);

  // Other species in our collection that share this ancestor
  const cousins = useMemo(() => {
    const all = tree.leavesUnder(node).filter((s) => s.id !== a.id && s.id !== b.id);
    return { count: all.length, sample: [...all.filter((s) => s.famous), ...all.filter((s) => !s.famous)].slice(0, 14) };
  }, [node, tree.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const headline = age < 1
    ? `${a.name} and ${b.name} are extremely close relatives.`
    : `${a.name} and ${b.name} last shared an ancestor…`;

  return (
    <div className="relate-result fadein">
      <h1 className="relate-h">{headline}</h1>

      <div className="stage">
        <figure className="stage-sp">
          <SpeciesPhoto sp={a} size={150} round className="glow-a" />
          <figcaption><b>{a.name}</b><i className="sci">{a.sci}</i></figcaption>
        </figure>
        <svg className="stage-branches" viewBox="0 0 300 200" aria-hidden>
          <defs><filter id="g"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <path className="draw" d="M10 40 C 90 40, 120 170, 150 170" stroke="#5ef0c8" strokeWidth="3" fill="none" filter="url(#g)" />
          <path className="draw" d="M290 40 C 210 40, 180 170, 150 170" stroke="#8b7bff" strokeWidth="3" fill="none" filter="url(#g)" />
          <circle className="pop" cx="150" cy="170" r="8" fill="#ffb46b" filter="url(#g)" />
        </svg>
        <figure className="stage-sp">
          <SpeciesPhoto sp={b} size={150} round className="glow-b" />
          <figcaption><b>{b.name}</b><i className="sci">{b.sci}</i></figcaption>
        </figure>
      </div>

      <div className="big-age">
        {n.u ? (
          <div className="big-unknown">TimeTree doesn't have a time estimate for this split yet.</div>
        ) : (
          <>
            <div className="v grad">{parts.value}</div>
            <div className="u">{parts.unit}</div>
            <div className="ci">
              {n.hi > 0 ? <>Likely between {fmtShort(n.lo)} and {fmtShort(n.hi)} · </> : null}
              based on {n.k} {n.k === 1 ? 'study' : 'studies'} · <Explain topic="ci">why a range?</Explain>
            </div>
          </>
        )}
      </div>

      {[a, b].filter((s) => s.note).map((s) => <p key={s.id} className="note small" style={{ maxWidth: 680, margin: '0 auto 12px' }}>ℹ️ {s.note}</p>)}

      <div className="facts">
        <div className="fact panel">
          <div className="eyebrow">The common ancestor</div>
          <h3>
            {n.n ? <>{friendly(n.n) || n.n}{friendly(n.n) && <i className="sci"> · {n.n}</i>}</> : <>An unnamed ancestor within <a href={href('explore', [groupNode])}>{friendly(groupName) || groupName}</a></>}
          </h3>
          <p className="muted small">
            {n.n ? <>Every member of this group descends from it.</> : <>Scientists haven't formally named this branch. <Explain topic="unnamed">Why?</Explain></>}
          </p>
          {wiki?.extract && <p className="wiki small">{wiki.extract.slice(0, 280)}{wiki.extract.length > 280 ? '…' : ''} <a href={wiki.content_urls?.desktop.page} target="_blank" rel="noreferrer">Wikipedia ↗</a></p>}
          <div className="row" style={{ marginTop: 10 }}>
            <Explain topic="ancestor">What's a common ancestor?</Explain>
            {(a.group === 'mammal' && b.group === 'mammal') || age < 20 ? <Explain topic="notfrom">Did one evolve from the other?</Explain> : null}
          </div>
        </div>
        <div className="fact panel">
          <div className="eyebrow">What was Earth like?</div>
          <h3>{period ? <>The {period.name} {period.level === 'period' ? 'period' : 'eon'}</> : 'Deep time'}</h3>
          <p className="small text2">{earthContext(age, since)}</p>
          <p className="small muted" style={{ marginTop: 8 }}>{eraContext(age)}</p>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">When it happened, in Earth's history</span>
        <TimeStrip markers={[{ age, lo: n.lo || undefined, hi: n.hi || undefined, label: `split ${fmtShort(age)}`, strong: true }]} />
      </div>

      <div className="section">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">Two family lines, back to one ancestor</span>
          <Explain topic="clock">How do we know these dates?</Explain>
        </div>
        <div className="panel" style={{ padding: 8 }}>
          <LineagePath tree={tree} a={a} b={b} mrca={node} />
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">Who else descends from this ancestor?</span>
        <div className="panel">
          <p className="small text2">
            {cousins.count === 0 ? <>No other species in our collection branch from this ancestor — {a.name} and {b.name} are each other's closest relatives here.</> :
              <>{cousins.count} other species in our collection share this same ancestor{cousins.count > 100 ? ' — a huge family' : ''}. All of these are <i>at least</i> as closely related to {a.name} as {b.name} is:</>}
          </p>
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            {cousins.sample.map((s) => (
              <a key={s.id} className="chip" href={href('relate', [spArg(a), spArg(s)])}>
                <span className="dot" style={{ background: GROUP_COLORS[s.group] }} />{s.name}
              </a>
            ))}
            {cousins.count > cousins.sample.length && <a className="chip" href={href('explore', [node])}>+{cousins.count - cousins.sample.length} more in the tree →</a>}
          </div>
        </div>
      </div>

      <MiniQuiz a={a} b={b} />

      <div className="section">
        <ExpertPanel tree={tree} node={node} species={[a, b]} />
      </div>

      <div className="row next-steps">
        <a className="btn" href={href('explore', [node])}>See this ancestor on the tree of life →</a>
        <a className="btn ghost" href={href('build', [], { ids: [a, b, ...cousins.sample.slice(0, 4)].map(spArg).join(',') })}>Build a tree with these</a>
        <button className="btn ghost" onClick={() => {
          const pool = tree.allSpecies().filter((s) => s.famous);
          go('relate', [spArg(pick(pool)), spArg(pick(pool))]);
        }}>🎲 Random pair</button>
      </div>
    </div>
  );
}

/** A question specifically about the species on screen. Answering it inline, then optionally continuing in Quiz mode. */
function MiniQuiz({ a, b }: { a: Species; b: Species }) {
  const tree = useTree();
  const [q] = useState<CloserQ | null>(() => makeCloser(tree, Math.random, a, b));
  const [chosen, setChosen] = useState<number | null>(null);
  if (!q) return null;
  const right = chosen === q.answer;
  return (
    <div className="section">
      <span className="eyebrow">Test your intuition</span>
      <div className="panel mini-quiz">
        <p className="mq-q">Is the <b>{q.target.name}</b> more closely related to…</p>
        <div className="mq-opts">
          {q.options.map((o, i) => (
            <button key={o.id} disabled={chosen !== null}
              className={'mq-opt' + (chosen !== null ? (i === q.answer ? ' right' : i === chosen ? ' wrong' : '') : '')}
              onClick={() => setChosen(i)}>
              <SpeciesPhoto sp={o} size={44} round />
              <span><b>{o.name}</b>{chosen !== null && <span className="mono small"> · {fmtShort(q.ages[i])}</span>}</span>
            </button>
          ))}
        </div>
        {chosen !== null && (
          <div className="mq-res fadein">
            <p>{right ? '✅ Correct!' : '❌ Not quite.'} The {q.target.name} split from the {q.options[q.answer].name} {fmtAge(q.ages[q.answer])}, but from the {q.options[1 - q.answer].name} {fmtAge(q.ages[1 - q.answer])}.</p>
            <div className="row" style={{ marginTop: 10 }}>
              <a className="btn sm" href={href('quiz', [], { with: [a, b].map(spArg).join(',') })}>More questions about {a.name} & {b.name} →</a>
              <a className="btn sm ghost" href={href('relate', [spArg(q.target), spArg(q.options[1 - q.answer])])}>Compare those two</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** One or two sentences tying a split to world events. */
function earthContext(age: number, since: WorldEvent[]): React.ReactNode {
  const during = EVENTS.find((e) => e.end != null && age <= e.age && age >= e.end);
  const prev = EVENTS.filter((e) => e.age >= age && e !== during).sort((x, y) => x.age - y.age)[0];
  const list = since.slice(0, 4);
  return (
    <>
      {during ? <>This split happened <b>during</b> {during.icon} <b>{during.title}</b>. </>
        : prev ? <>This split happened about <b>{fmtDuration(prev.age - age)}</b> after {prev.icon} <b>{prev.title}</b>. </> : null}
      {list.length > 0 && <>Since then, both lineages have lived through {list.map((e, i) => <span key={e.id}>{i > 0 && (i === list.length - 1 ? ' and ' : ', ')}{e.icon} {e.title}</span>)}{since.length > 4 ? `, plus ${since.length - 4} more major events` : ''}.</>}
    </>
  );
}

function eraContext(age: number) {
  if (age >= 1000) return 'Their common ancestor was a single-celled microbe — complex, many-celled life did not exist yet.';
  if (age >= 541) return 'Their common ancestor lived before the Cambrian explosion, when life in the oceans was small and soft-bodied.';
  if (age >= 252) return 'Their common ancestor lived before the first dinosaurs.';
  if (age >= 66) return 'Their common ancestor lived in the age of dinosaurs.';
  if (age >= 2.6) return 'They split after the dinosaurs disappeared, in the age of mammals.';
  return 'They split during the age of ice ages — when early humans were also evolving.';
}
