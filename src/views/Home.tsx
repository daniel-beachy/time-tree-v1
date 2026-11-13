import { useState } from 'react';
import { useTree } from '../components/TreeContext';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import type { Species } from '../lib/data';
import { fmtShort, lcName } from '../lib/format';
import { go, href } from '../lib/router';
import { splitAge } from '../lib/insights';
import { bySci, spArg, SUGGESTED } from './Relate';
import { TOURS } from './tours-data';
import './Home.css';

const MODES = [
  { v: 'relate', icon: '🤝', title: 'How related are we?', text: 'Pick any two living things and travel back to the ancestor they share.' },
  { v: 'explore', icon: '🌳', title: 'Tree of Life', text: 'Fly around a map of 400+ species and 4 billion years of branching.' },
  { v: 'time', icon: '⏳', title: 'Deep Time', text: 'Scroll from the birth of Earth to today — and watch your own family history unfold.' },
  { v: 'tours', icon: '🧭', title: 'Guided tours', text: 'Short stories: why whales aren\'t fish, why birds are dinosaurs, and more.' },
  { v: 'quiz', icon: '🎯', title: 'Quiz', text: 'Who is closer to a whale — a hippo or a shark? Test your intuition.' },
  { v: 'build', icon: '🛠️', title: 'Build a tree', text: 'Choose any set of species and get a dated family tree you can export.' },
];

export function Home() {
  const tree = useTree();
  const [a, setA] = useState<Species | null>(null);
  const [editA, setEditA] = useState(false);
  const human = tree.species.get(9606)!;
  const choose = (x: Species | null, y: Species | null) => {
    if (x && y) go('relate', [spArg(x), spArg(y)]);
    else { setA(x); }
  };

  const facts: [string, string, string][] = [
    ['Homo sapiens', 'Agaricus bisporus', 'Musa acuminata'],
    ['Balaenoptera musculus', 'Hippopotamus amphibius', 'Carcharodon carcharias'],
    ['Gallus gallus', 'Alligator mississippiensis', 'Iguana iguana'],
  ];

  return (
    <div className="home">
      <section className="hero">
        <div className="eyebrow">A field guide to the family of life</div>
        <h1 className="hero-h">Every living thing on Earth is <span className="grad">family</span>.<br />Find out how close.</h1>
        <p className="hero-sub">You share an ancestor with your cat, your houseplant, and the yeast in your bread. Using the real science behind <a href="https://timetree.org" target="_blank" rel="noreferrer">TimeTree</a>, discover <i>when</i> — and what the world looked like back then.</p>
        <div className="hero-pick panel">
          <div className="hero-pick-row">
            {editA ? (
              <div className="hp-you-edit"><SpeciesPicker compact autoFocus onPick={(x) => { setA(x); setEditA(false); }} placeholder="Start from…" /></div>
            ) : (
              <button className="hp-you" onClick={() => setEditA(true)} title="Change who you start from">
                <SpeciesPhoto sp={a ?? human} size={40} round />
                <span>{a ? a.name : 'You (human)'}<span className="tiny muted hp-change">change</span></span>
              </button>
            )}
            <span className="hp-and">&amp;</span>
            <SpeciesPicker onPick={(s) => choose(a ?? human, s)} placeholder="…a cat? an oak? a mushroom? Search anything" />
          </div>
        </div>
        <div className="suggest" style={{ marginTop: 18 }}>
          {SUGGESTED.slice(0, 6).map(([x, y]) => {
            const sx = bySci(tree, x), sy = bySci(tree, y);
            if (!sx || !sy) return null;
            return <a key={x + y} className="chip" href={href('relate', [sx.id, sy.id])}>{sx.name} & {sy.name}</a>;
          })}
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">Surprising family facts</span>
        <div className="facts3">
          {facts.map(([x, y, z]) => {
            const sx = bySci(tree, x)!, sy = bySci(tree, y)!, sz = bySci(tree, z)!;
            if (!sx || !sy || !sz) return null;
            const xy = splitAge(tree, sx, sy).age, xz = splitAge(tree, sx, sz).age;
            return (
              <a key={x} className="fact3 panel" href={href('relate', [sx.id, sy.id])}>
                <div className="f3-photos">
                  <SpeciesPhoto sp={sx} size={52} round /><SpeciesPhoto sp={sy} size={52} round /><SpeciesPhoto sp={sz} size={52} round />
                </div>
                <p>The <b>{lcName(sx.name)}</b> is more closely related to the <b>{lcName(sy.name)}</b> ({fmtShort(xy)}) than to the <b>{lcName(sz.name)}</b> ({fmtShort(xz)}).</p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">Ways to explore</span>
        <div className="modes">
          {MODES.map((m) => (
            <a key={m.v} className="mode panel" href={href(m.v)}>
              <div className="mode-icon">{m.icon}</div>
              <h3>{m.title}</h3>
              <p className="muted small">{m.text}</p>
            </a>
          ))}
        </div>
        <a className="human-door" href={href('human')}>
          <div className="hd-icon" aria-hidden>🌍</div>
          <div>
            <h3>Zoom in: the Human Story</h3>
            <p>Our own species is the last sliver of all this. Follow 300,000 years of human history on a map that moves through time.</p>
          </div>
          <span className="hd-go">Open →</span>
        </a>
      </section>

      <section className="section">
        <span className="eyebrow">Start a guided tour</span>
        <div className="tours-row">
          {TOURS.map((t) => (
            <a key={t.id} className="tour-card panel" href={href('tours', [t.id])}>
              <div className="tc-emoji">{t.emoji}</div>
              <div><b>{t.title}</b><p className="small muted">{t.teaser}</p></div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
