import { useEffect, useState } from 'react';
import { href } from '../lib/router';
import { SeriesChart } from './charts/SeriesChart';
import { loadSeries } from './lib/content';
import { START, generationsAgo } from './lib/time';
import type { HumanIndex, Series } from './lib/types';
import { ScaleStrip } from './ScaleStrip';

export function Landing({ index }: { index: HumanIndex }) {
  const [pop, setPop] = useState<Series | null>(null);
  useEffect(() => { loadSeries().then((s) => setPop(s.find((x) => x.id === 'world-population') ?? null)).catch(() => {}); }, []);
  const n = (v: number) => v.toLocaleString('en-US');
  return (
    <div className="hs-landing">
      <section className="hs-hero">
        <div className="eyebrow">Human Story</div>
        <h1>How a few thousand wanderers became <span className="grad">eight billion</span> neighbours.</h1>
        <p className="hs-lede">Our species is about 300,000 years old. For almost all of that time there were no farms, no cities and no writing. This is the story of how that changed, told on a map that moves through time.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 22 }}>
          <a className="btn primary" href={href('human', ['across-the-world'])}>Start with the journey out of Africa</a>
          <a className="btn" href={href('human', ['first-cities'])}>Jump to the first cities</a>
        </div>
      </section>

      <section className="section">
        <span className="eyebrow">The whole story, to scale</span>
        <ScaleStrip index={index} big />
        <p className="muted small" style={{ marginTop: 10, maxWidth: 720 }}>
          Counted in lifetimes, our species is about {n(generationsAgo(START))} generations old. Farming began about {n(generationsAgo(-9500))} generations ago, writing about {n(generationsAgo(-3300))}, and the steam engine about {n(generationsAgo(1769))}.
        </p>
      </section>

      <section className="section">
        <span className="eyebrow">Nine chapters</span>
        <div className="hs-grid">
          {index.chapters.map((c) => (
            <a key={c.id} className={'hs-chap panel' + (c.stopCount ? '' : ' soon')} href={href('human', [c.id])} style={{ ['--c' as string]: c.color }}>
              <div className="hs-chap-n">{c.n}</div>
              <h3>{c.title}</h3>
              <div className="small hs-chap-when">{c.subtitle}</div>
              <p className="small muted">{c.intro.split('. ')[0]}.</p>
              {!c.stopCount && <span className="hs-soon tiny">Being written</span>}
            </a>
          ))}
        </div>
      </section>

      {pop && (
        <section className="section">
          <span className="eyebrow">People alive, 10,000 BCE to today</span>
          <div className="panel"><SeriesChart series={pop} height={260} /></div>
          <p className="tiny muted" style={{ marginTop: 8 }}>Data: HYDE (2023); Gapminder (2022); UN World Population Prospects (2024), with major processing by <a href="https://ourworldindata.org/grapher/population" target="_blank" rel="noreferrer">Our World in Data</a>.</p>
        </section>
      )}
    </div>
  );
}
