import { useEffect, useState } from 'react';
import { Chapter } from './Chapter';
import { Landing } from './Landing';
import { loadIndex } from './lib/content';
import type { HumanIndex } from './lib/types';
import './human.css';

/** Entry point for the Human Story area: #/human, #/human/<chapter>, #/human/<chapter>/<stop>?d=1 */
export function HumanArea({ args, query }: { args: string[]; query: URLSearchParams }) {
  const [index, setIndex] = useState<HumanIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadIndex().then(setIndex).catch((e) => setErr(String(e))); }, []);
  // Arriving at a chapter from elsewhere starts at its top; moving between stops inside one does not jump.
  useEffect(() => { window.scrollTo(0, 0); }, [args[0]]);

  if (err) return <p className="error center" style={{ padding: 80 }}>Couldn't load Human Story: {err}</p>;
  if (!index) return <div className="center" style={{ padding: 80 }}><div className="spinner" /></div>;
  const chapter = index.chapters.find((c) => c.id === args[0]);
  if (!chapter) return <Landing index={index} />;
  return <Chapter key={chapter.id} index={index} chapter={chapter} stopId={args[1]} deepOpen={query.get('d') === '1'} />;
}
