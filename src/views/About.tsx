import { useState } from 'react';
import { useTree } from '../components/TreeContext';
import { ExplainModal, TOPICS } from '../components/Explain';
import { PROXY } from '../lib/live';
import './About.css';

export function About() {
  const tree = useTree();
  const [topic, setTopic] = useState<keyof typeof TOPICS | null>(null);
  const built = tree.meta.built ? new Date(tree.meta.built).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'unknown';

  return (
    <div className="about">
      <div className="eyebrow">About & methods</div>
      <h1>How Deep Roots works</h1>
      <p className="lead">
        Deep Roots turns the scientific consensus on <em>when</em> lineages split into something you can explore. Every date comes
        from <a href="https://timetree.org" target="_blank" rel="noreferrer">TimeTree</a>, a public resource that combines thousands of
        published molecular-clock studies into a single timetree of life.
      </p>

      <section>
        <h2>The ideas in 60 seconds</h2>
        <div className="about-topics">
          {(Object.keys(TOPICS) as (keyof typeof TOPICS)[]).map((k) => (
            <button key={k} className="panel about-topic" onClick={() => setTopic(k)}>{TOPICS[k].title} →</button>
          ))}
        </div>
      </section>

      <section>
        <h2>Where the numbers come from</h2>
        <ul>
          <li><b>Divergence times</b> are TimeTree’s <em>adjusted</em> ages: the median of all published estimates for a node, smoothed so that no group is younger than a group nested inside it. The expert panel on each comparison also shows the raw median, the 95% confidence interval, and every individual study (with PubMed links).</li>
          <li><b>Confidence intervals</b> come from TimeTree and describe the spread of study estimates. Occasionally the adjusted age falls outside that interval — that’s TimeTree’s smoothing at work, and the expert panel flags it.</li>
          <li><b>The tree shape</b> is the NCBI taxonomy path TimeTree reports for each species, merged into one tree. Groups with no time estimate are drawn but marked as undated.</li>
          <li><b>World events</b> use dates from the International Commission on Stratigraphy chart and standard references. Where science gives a range, we show the commonly cited onset.</li>
          <li><b>Photos and descriptions</b> come from iNaturalist and Wikipedia, credited on hover.</li>
        </ul>
      </section>

      <section>
        <h2>The collection and live species</h2>
        <p>
          The site ships with a curated snapshot of <b>{tree.species.size.toLocaleString()} species</b> chosen to cover every major branch of life,
          from humans to archaea, built on <b>{built}</b>. That makes everything instant and works offline once loaded.
        </p>
        <p>
          You can also search for <em>any</em> species: picks tagged “live” are fetched from TimeTree on demand through a small caching proxy
          {' '}(<span className="mono tiny">{PROXY.replace(/^https?:\/\//, '')}</span>) — needed because TimeTree’s API doesn’t allow direct browser access.
          Live species are grafted into the tree and work everywhere on the site.
        </p>
      </section>

      <section>
        <h2>Things to keep in mind</h2>
        <ul>
          <li>Molecular dates are estimates, often with wide uncertainty — especially beyond ~600 million years, where the fossil record is thin.</li>
          <li>Very recent splits (subspecies, domestic breeds) are below what TimeTree resolves. That’s why dogs and gray wolves share one entry.</li>
          <li>Microbes swap genes sideways, so the deepest branches of the tree of life are still debated. TimeTree places bacteria and archaea at the root, ~4.25 billion years ago.</li>
          <li>Living species are cousins, never ancestors. A chimp is not a “less evolved” human: both lineages have evolved for the same amount of time since they split.</li>
        </ul>
      </section>

      <section>
        <h2>Credits & citation</h2>
        <p>
          Kumar S, Suleski M, Craig JM, Kasprowicz AE, Sanderford M, Li M, Stecher G, Hedges SB (2022). TimeTree 5: An expanded resource for species divergence
          times. <i>Molecular Biology and Evolution</i> 39:msac174. <a href="https://doi.org/10.1093/molbev/msac174" target="_blank" rel="noreferrer">doi:10.1093/molbev/msac174</a>
        </p>
        <p className="small muted">
          Photos © their iNaturalist and Wikimedia authors under their respective licenses. Deep Roots is an independent educational project and is not affiliated with TimeTree.
          Source code: <a href="https://github.com/daniel-beachy/time-tree-v1" target="_blank" rel="noreferrer">github.com/daniel-beachy/time-tree-v1</a>.
        </p>
      </section>

      {topic && <ExplainModal topic={topic} onClose={() => setTopic(null)} />}
    </div>
  );
}
