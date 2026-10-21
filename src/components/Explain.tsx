import { useEffect, useState } from 'react';
import './Explain.css';

export interface Topic { title: string; body: React.ReactNode }

export const TOPICS: Record<string, Topic> = {
  ancestor: {
    title: 'What is a "common ancestor"?',
    body: (
      <>
        <p>Go back far enough in any two family trees and they meet. Two cousins share grandparents; two species share an ancestral <b>population</b> — a group of organisms that lived long ago.</p>
        <p>At some point that population got divided — by a river, a mountain range, a drifting continent, or just different habits. Each half kept reproducing separately, and tiny DNA changes piled up independently on each side. Given millions of years, the two halves became completely different kinds of life.</p>
        <p>The date shown is when that division — the <b>split</b> or <b>divergence</b> — happened.</p>
      </>
    ),
  },
  notfrom: {
    title: "Wait — did humans evolve from chimps?",
    body: (
      <>
        <p>No! This is the most common mix-up. Living species don't evolve <i>from</i> each other — they are <b>cousins</b>.</p>
        <p>Humans and chimpanzees both descend from an ancestor that lived about 6–7 million years ago. Since then, chimps have been evolving for exactly as long as we have. Neither is "more evolved"; both lines simply went their own way.</p>
        <p>The same goes for every pair in this app: a mushroom isn't your ancestor, but you and it share a single-celled ancestor that lived over a billion years ago.</p>
      </>
    ),
  },
  clock: {
    title: 'How do scientists know when species split?',
    body: (
      <>
        <p><b>The molecular clock.</b> DNA picks up small changes (mutations) at a roughly steady rate over long periods. Compare the same gene in two species: the more differences, the longer ago they split.</p>
        <p>To turn "number of differences" into "millions of years", the clock is <b>calibrated</b> with fossils of known age — e.g. the oldest known fossil of a group sets a minimum age for when that group existed.</p>
        <p>TimeTree gathers thousands of these published studies and combines their estimates into one consensus timeline of life.</p>
      </>
    ),
  },
  ci: {
    title: 'Why is there a range?',
    body: (
      <>
        <p>Different studies use different genes, fossils, and methods, so they don't all agree exactly. The headline number is TimeTree's best summary; the <b>confidence interval</b> (e.g. "86–93 million years") is the range where the true answer most likely lies.</p>
        <p>A narrow range means many studies agree. A wide range — common for very ancient splits — means the evidence is thinner or more contested. When no range is shown, there aren't enough independent estimates to compute one.</p>
      </>
    ),
  },
  scale: {
    title: 'Why is the timeline "stretched"?',
    body: (
      <>
        <p>Life's history is extremely lopsided. For about <b>3 billion years</b>, life was almost entirely microscopic. Every animal, plant and mushroom you know appeared in roughly the last 600 million years, and every mammal you know in the last ~100 million.</p>
        <p>On a normal (linear) scale, everything familiar would be squashed into a sliver at the end. The <b>stretched (logarithmic)</b> scale gives each "×10" of time the same width — so 1→10 million years ago takes as much room as 100→1,000. Toggle to <b>linear</b> any time to see true proportions.</p>
      </>
    ),
  },
  readtree: {
    title: 'How to read a tree of life',
    body: (
      <>
        <p>Each <b>tip</b> is a living species. Each <b>branching point</b> (node) is a common ancestor, positioned at the time it lived. Follow any two tips back toward the root until their branches meet: that's their most recent common ancestor.</p>
        <p>The order of tips left-to-right (or around the circle) <b>doesn't matter</b> — branches can rotate freely around a node like a mobile. Only the branching pattern and the times carry meaning.</p>
        <p>The center/root is the ancestor of all cellular life, roughly 4 billion years ago.</p>
      </>
    ),
  },
  adjusted: {
    title: 'Adjusted vs. median time',
    body: (
      <>
        <p>TimeTree reports two numbers for each split. The <b>median</b> (precomputed) time summarises the studies that directly estimated that split, with its confidence interval.</p>
        <p>The <b>adjusted</b> time is the value used in TimeTree's tree of life. It is tweaked when needed so that every ancestor is older than its descendants — individual studies sometimes conflict, and a tree can't have a parent younger than its child. This app shows the adjusted time, like timetree.org does.</p>
      </>
    ),
  },
  unnamed: {
    title: 'Why is this ancestor "unnamed"?',
    body: (
      <>
        <p>Biologists only give formal names to some groups. Many branching points in the tree of life are well supported by DNA but simply don't have an official name.</p>
        <p>In those cases we describe the ancestor by the nearest named group that contains it.</p>
      </>
    ),
  },
};

/** Inline "?" link that opens a plain-language explainer. */
export function Explain({ topic, children }: { topic: keyof typeof TOPICS; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="explain-link" onClick={() => setOpen(true)}>
        {children ?? TOPICS[topic].title}<span className="q">?</span>
      </button>
      {open && <ExplainModal topic={topic} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ExplainModal({ topic, onClose }: { topic: keyof typeof TOPICS; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const t = TOPICS[topic];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal fadein" role="dialog" aria-modal="true" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className="eyebrow">Explainer</div>
        <h2>{t.title}</h2>
        <div className="modal-body">{t.body}</div>
      </div>
    </div>
  );
}
