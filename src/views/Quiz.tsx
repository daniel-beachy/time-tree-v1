import { useEffect, useMemo, useState } from 'react';
import { useTree } from '../components/TreeContext';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { Explain } from '../components/Explain';
import type { Species } from '../lib/data';
import { EVENTS } from '../data/events';
import { fmtAge, fmtDuration, fmtShort, lcName } from '../lib/format';
import { go, href } from '../lib/router';
import { usePref } from '../lib/store';
import { makeCloser, makeEvent, makeOdd, makeWhen, pick, splitAge, type Question } from '../lib/insights';
import { resolveSpecies, spArg } from './Relate';
import './Quiz.css';

type Kind = Question['type'];
const KINDS: [Kind, string, string][] = [
  ['closer', 'Who’s closer?', '👯'],
  ['when', 'When did they split?', '⏳'],
  ['odd', 'Odd one out', '🧩'],
  ['event', 'Before or after?', '🌋'],
];

interface Stats { answered: number; correct: number; streak: number; best: number }
const EMPTY: Stats = { answered: 0, correct: 0, streak: 0, best: 0 };

// The "when" slider works in log space: 10,000 years … 4.5 billion years.
const LMIN = Math.log10(0.01), LMAX = Math.log10(4540);
const toAge = (t: number) => Math.pow(10, LMIN + t * (LMAX - LMIN));
const toT = (age: number) => (Math.log10(Math.max(0.01, age)) - LMIN) / (LMAX - LMIN);
/** A guess counts if it's within a factor of 2 of the estimate, or inside the confidence interval. */
const whenCorrect = (guess: number, q: { age: number; lo: number; hi: number }) =>
  (guess >= q.lo && guess <= q.hi) || (guess / q.age < 2 && q.age / guess < 2);

export function Quiz({ query }: { query: URLSearchParams }) {
  const tree = useTree();
  const [stats, setStats] = usePref<Stats>('quiz', EMPTY);
  const [kinds, setKinds] = usePref<Kind[]>('quizKinds', ['closer', 'when', 'odd', 'event']);
  const [focus, setFocus] = useState<Species[]>([]);
  const [q, setQ] = useState<Question | null>(null);
  const [done, setDone] = useState<null | { correct: boolean; guess?: number; chosen?: number | string }>(null);
  const [n, setN] = useState(0);
  const withArg = query.get('with') ?? '';

  useEffect(() => {
    Promise.all(withArg.split(',').filter(Boolean).map((a) => resolveSpecies(tree, a))).then((list) => {
      setFocus(list.filter((s): s is Species => !!s));
      setN((x) => x + 1);
    });
  }, [withArg]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (n === 0) return;
    const pool = kinds.length ? kinds : (['closer'] as Kind[]);
    let next: Question | null = null;
    for (let t = 0; t < 8 && !next; t++) {
      const kind = pick(pool);
      const [a, b] = focus.length ? (Math.random() < 0.5 ? focus : [...focus].reverse()) : [];
      if (kind === 'closer') next = makeCloser(tree, Math.random, a, b);
      if (kind === 'when') next = makeWhen(tree, Math.random, a, focus.length > 1 ? b : undefined);
      if (kind === 'odd') next = makeOdd(tree, Math.random, a);
      if (kind === 'event') next = makeEvent(tree, EVENTS, Math.random, a, b);
    }
    setQ(next);
    setDone(null);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (correct: boolean, extra: { guess?: number; chosen?: number | string }) => {
    setDone({ correct, ...extra });
    const streak = correct ? stats.streak + 1 : 0;
    setStats({ answered: stats.answered + 1, correct: stats.correct + (correct ? 1 : 0), streak, best: Math.max(stats.best, streak) });
  };

  const toggleKind = (k: Kind) => setKinds(kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k]);

  return (
    <div className="quiz">
      <div className="quiz-head">
        <div>
          <div className="eyebrow">Quiz</div>
          <h1>How good is your <span className="grad">evolution intuition?</span></h1>
          <p className="muted" style={{ marginTop: 6 }}>Every question is generated from real TimeTree data, so they never run out — and every answer links to the evidence.</p>
        </div>
        <div className="quiz-stats">
          <div><b>{stats.streak}</b><span>streak</span></div>
          <div><b>{stats.best}</b><span>best</span></div>
          <div><b>{stats.answered ? Math.round((100 * stats.correct) / stats.answered) + '%' : '–'}</b><span>{stats.correct}/{stats.answered} right</span></div>
        </div>
      </div>

      <div className="quiz-filters">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {KINDS.map(([k, label, icon]) => (
            <button key={k} className={'chip' + (kinds.includes(k) ? ' on' : '')} onClick={() => toggleKind(k)}>{icon} {label}</button>
          ))}
        </div>
        <div className="row quiz-focus">
          {focus.length > 0 ? (
            <>
              <span className="small muted">Questions about</span>
              {focus.map((s) => <span key={s.id} className="chip on"><SpeciesPhoto sp={s} size={18} round /> {s.name}</span>)}
              <a className="small" href={href('quiz')}>× any species</a>
            </>
          ) : (
            <div style={{ width: 260 }}><SpeciesPicker compact placeholder="Focus on a species…" value={null} onPick={(s) => go('quiz', [], { with: spArg(s) })} /></div>
          )}
        </div>
      </div>

      <div className="panel quiz-card" key={n}>
        {!q && <p className="muted">Couldn’t make a question with these settings. Try enabling more question types.</p>}
        {q?.type === 'closer' && <CloserView q={q} done={done} onAnswer={(i) => answer(i === q.answer, { chosen: i })} />}
        {q?.type === 'when' && <WhenView q={q} done={done} onAnswer={(g) => answer(whenCorrect(g, q), { guess: g })} />}
        {q?.type === 'odd' && <OddView q={q} done={done} onAnswer={(i) => answer(i === q.answer, { chosen: i })} />}
        {q?.type === 'event' && <EventView q={q} done={done} onAnswer={(c) => answer(c === q.answer, { chosen: c })} />}
        {done && (
          <div className="quiz-next fadein">
            <span className={'verdict ' + (done.correct ? 'ok' : 'no')}>{done.correct ? (stats.streak >= 3 ? `🔥 ${stats.streak} in a row!` : '✅ Correct!') : '❌ Not quite'}</span>
            <button className="btn" autoFocus onClick={() => setN(n + 1)}>Next question →</button>
          </div>
        )}
      </div>
      {stats.answered > 0 && (
        <p className="tiny muted" style={{ textAlign: 'center', marginTop: 14 }}>
          Stats are saved in this browser only. <button className="linkish" onClick={() => setStats(EMPTY)}>Reset</button>
        </p>
      )}
    </div>
  );
}

type Done = null | { correct: boolean; guess?: number; chosen?: number | string };

function Opt({ sp, state, onClick, sub }: { sp: Species; state: string; onClick?: () => void; sub?: React.ReactNode }) {
  return (
    <button className={'q-opt ' + state} disabled={!onClick} onClick={onClick}>
      <SpeciesPhoto sp={sp} size={88} />
      <b>{sp.name}</b>
      <span className="sci tiny">{sp.sci}</span>
      {sub && <span className="mono small q-sub">{sub}</span>}
    </button>
  );
}

function CloserView({ q, done, onAnswer }: { q: Extract<Question, { type: 'closer' }>; done: Done; onAnswer: (i: number) => void }) {
  const far = q.options[1 - q.answer], near = q.options[q.answer];
  return (
    <>
      <div className="q-title">
        <SpeciesPhoto sp={q.target} size={56} round />
        <h2>Is the <span style={{ color: 'var(--glow)' }}>{lcName(q.target.name)}</span> more closely related to…</h2>
      </div>
      <div className="q-opts two">
        {q.options.map((o, i) => (
          <Opt key={o.id} sp={o} onClick={done ? undefined : () => onAnswer(i)}
            state={done ? (i === q.answer ? 'right' : i === done.chosen ? 'wrong' : 'dim') : ''}
            sub={done && <>split {fmtShort(q.ages[i])}</>} />
        ))}
      </div>
      {done && (
        <div className="q-explain fadein">
          <p>The {lcName(q.target.name)}’s lineage parted from the {lcName(near.name)}’s <b>{fmtAge(q.ages[q.answer])}</b>, but from the {lcName(far.name)}’s much earlier — <b>{fmtAge(q.ages[1 - q.answer])}</b>.
            {near.group !== q.target.group && far.group === q.target.group && ' Looks can be deceiving: similar body shapes can evolve independently.'}
          </p>
          <p className="small muted">“Closer” means sharing a more recent common ancestor. <Explain topic="readtree">How to read relatedness</Explain></p>
          <Links pairs={[[q.target, near], [q.target, far]]} />
        </div>
      )}
    </>
  );
}

function WhenView({ q, done, onAnswer }: { q: Extract<Question, { type: 'when' }>; done: Done; onAnswer: (g: number) => void }) {
  const [t, setT] = useState(0.5);
  const guess = toAge(t);
  const marks = [0.01, 1, 10, 100, 1000];
  return (
    <>
      <div className="q-title">
        <div className="q-pair"><SpeciesPhoto sp={q.a} size={56} round /><SpeciesPhoto sp={q.b} size={56} round /></div>
        <h2>When did the <span style={{ color: 'var(--glow)' }}>{lcName(q.a.name)}</span> and the <span style={{ color: 'var(--glow2)' }}>{lcName(q.b.name)}</span> share their last common ancestor?</h2>
      </div>
      <div className="when-guess">
        <div className="when-val mono">{fmtAge(done?.guess ?? guess)}</div>
        <div className="when-track">
          <input type="range" min={0} max={1} step={0.001} value={done?.guess != null ? toT(done.guess) : t} disabled={!!done}
            onChange={(e) => setT(+e.target.value)} aria-label="Your guess" />
          {done && (
            <>
              <span className="when-ci" style={{ left: `${toT(q.lo) * 100}%`, width: `${Math.max(0.6, (toT(q.hi) - toT(q.lo)) * 100)}%` }} />
              <span className="when-true" style={{ left: `${toT(q.age) * 100}%` }}><span>{fmtShort(q.age)}</span></span>
            </>
          )}
          <div className="when-marks">
            {marks.map((m) => <span key={m} style={{ left: `${toT(m) * 100}%` }}>{fmtShort(m)}</span>)}
          </div>
        </div>
        <div className="row tiny muted" style={{ justifyContent: 'space-between' }}><span>recently</span><span>Earth’s youth</span></div>
        {!done && <button className="btn" style={{ marginTop: 14 }} onClick={() => onAnswer(guess)}>Lock in my guess</button>}
      </div>
      {done && (
        <div className="q-explain fadein">
          <p>The best estimate is <b>{fmtAge(q.age)}</b> (95% range {fmtShort(q.lo)}–{fmtShort(q.hi)}). You guessed {fmtAge(done.guess!)} —{' '}
            {(() => { const r = done.guess! / q.age; return r > 1 ? `${r.toFixed(r < 10 ? 1 : 0)}× too old` : `${(1 / r).toFixed(1 / r < 10 ? 1 : 0)}× too recent`; })()}.
            {' '}Anything within 2× or inside the range counts.
          </p>
          <p className="small muted">The slider is “stretched” so recent and ancient times both fit. <Explain topic="scale">Why?</Explain></p>
          <Links pairs={[[q.a, q.b]]} />
        </div>
      )}
    </>
  );
}

function OddView({ q, done, onAnswer }: { q: Extract<Question, { type: 'odd' }>; done: Done; onAnswer: (i: number) => void }) {
  const tree = useTree();
  const pair = q.options.filter((_, i) => i !== q.answer);
  const out = q.options[q.answer];
  return (
    <>
      <div className="q-title"><h2>Which one is the <span style={{ color: 'var(--warm)' }}>odd one out</span>? <span className="muted small">Two of these are each other’s closest relatives.</span></h2></div>
      <div className="q-opts three">
        {q.options.map((o, i) => (
          <Opt key={o.id} sp={o} onClick={done ? undefined : () => onAnswer(i)}
            state={done ? (i === q.answer ? 'right' : i === done.chosen ? 'wrong' : '') : ''} />
        ))}
      </div>
      {done && (
        <div className="q-explain fadein">
          <p>The {lcName(pair[0].name)} and the {lcName(pair[1].name)} shared an ancestor <b>{fmtAge(q.pairAge)}</b>. The {lcName(out.name)} branched off earlier, <b>{fmtAge(splitAge(tree, out, pair[0]).age)}</b>.</p>
          <Links pairs={[[pair[0], pair[1]], [out, pair[0]]]} />
        </div>
      )}
    </>
  );
}

function EventView({ q, done, onAnswer }: { q: Extract<Question, { type: 'event' }>; done: Done; onAnswer: (c: 'before' | 'after') => void }) {
  const ev = useMemo(() => EVENTS.find((e) => e.title === q.event.title)!, [q]);
  return (
    <>
      <div className="q-title">
        <div className="q-pair"><SpeciesPhoto sp={q.a} size={56} round /><SpeciesPhoto sp={q.b} size={56} round /></div>
        <h2>Did the <span style={{ color: 'var(--glow)' }}>{lcName(q.a.name)}</span> and <span style={{ color: 'var(--glow2)' }}>{lcName(q.b.name)}</span> lineages split <u>before</u> or <u>after</u> this?</h2>
      </div>
      <div className="q-event"><span className="q-ev-icon">{ev.icon}</span><div><b>{ev.title}</b><p className="small muted">{ev.blurb}</p>{done && <span className="mono small" style={{ color: 'var(--warm)' }}>{fmtAge(ev.age)}</span>}</div></div>
      <div className="q-opts two">
        {(['before', 'after'] as const).map((c) => (
          <button key={c} className={'q-opt text ' + (done ? (c === q.answer ? 'right' : c === done.chosen ? 'wrong' : 'dim') : '')} disabled={!!done} onClick={() => onAnswer(c)}>
            <b>{c === 'before' ? '⬅ Before' : 'After ➡'}</b><span className="small muted">{c === 'before' ? 'their split is older' : 'their split is more recent'}</span>
          </button>
        ))}
      </div>
      {done && (
        <div className="q-explain fadein">
          <p>They split <b>{fmtAge(q.age)}</b> — {q.answer === 'before' ? <>about {fmtDuration(q.age - ev.age)} <b>before</b></> : <>about {fmtDuration(ev.age - q.age)} <b>after</b></>} this event.</p>
          <Links pairs={[[q.a, q.b]]} time={q.a} />
        </div>
      )}
    </>
  );
}


function Links({ pairs, time }: { pairs: [Species, Species][]; time?: Species }) {
  return (
    <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      {pairs.map(([a, b]) => <a key={a.id + '-' + b.id} className="btn sm ghost" href={href('relate', [spArg(a), spArg(b)])}>{a.name} vs {b.name} →</a>)}
      {time && <a className="btn sm ghost" href={href('time', [spArg(time)])}>{time.name}’s deep time →</a>}
    </div>
  );
}
