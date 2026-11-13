import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { loadTree, type Tree } from './lib/data';
import { useRoute, href } from './lib/router';
import { TreeContext } from './components/TreeContext';
import { Home } from './views/Home';
import { Relate } from './views/Relate';
import './human/entrances.css';

const Explore = lazy(() => import('./views/Explore').then((m) => ({ default: m.Explore })));
const DeepTime = lazy(() => import('./views/DeepTime').then((m) => ({ default: m.DeepTime })));
const Quiz = lazy(() => import('./views/Quiz').then((m) => ({ default: m.Quiz })));
const Tours = lazy(() => import('./views/Tours').then((m) => ({ default: m.Tours })));
const Build = lazy(() => import('./views/Build').then((m) => ({ default: m.Build })));
const HumanArea = lazy(() => import('./human/HumanArea').then((m) => ({ default: m.HumanArea })));
const About = lazy(() => import('./views/About').then((m) => ({ default: m.About })));

const NAV: [string, string, string][] = [
  ['relate', 'Relate', '🤝'],
  ['explore', 'Tree of Life', '🌳'],
  ['time', 'Deep Time', '⏳'],
  ['tours', 'Tours', '🧭'],
  ['quiz', 'Quiz', '🎯'],
  ['build', 'Build a Tree', '🛠️'],
  ['human', 'Human Story', '🌍'],
];

export default function App() {
  const route = useRoute();
  const [tree, setTree] = useState<Tree | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadTree().then(setTree).catch((e) => setErr(String(e))); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.view]);

  // Human Story is its own area: it has its own palette (src/human/human.css) and does not need the species tree.
  const human = route.view === 'human';
  useEffect(() => {
    if (human) document.documentElement.dataset.area = 'human';
    else delete document.documentElement.dataset.area;
  }, [human]);

  const full = route.view === 'explore';
  let body: React.ReactNode;
  if (human) body = <HumanArea args={route.args} query={route.query} />;
  else if (!tree) body = <div className="center" style={{ flex: 1, padding: 80 }}>{err ? <p className="error">Couldn't load data: {err}</p> : <div className="spinner" />}</div>;
  else {
    switch (route.view) {
      case 'relate': body = <Relate args={route.args} />; break;
      case 'explore': body = <Explore args={route.args} query={route.query} />; break;
      case 'time': body = <DeepTime args={route.args} />; break;
      case 'quiz': body = <Quiz query={route.query} />; break;
      case 'tours': body = <Tours args={route.args} />; break;
      case 'build': body = <Build query={route.query} />; break;
      case 'about': body = <About />; break;
      default: body = <Home />;
    }
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/"><img src="./favicon.svg" alt="" />DEEP<span>ROOTS</span></a>
        <nav className="nav" aria-label="Main">
          {NAV.map(([v, label, icon]) => (
            <a key={v} href={href(v)} className={(route.view === v ? 'on' : '') + (v === 'human' ? ' nav-human' : '')}><span aria-hidden>{icon}</span>{label}</a>
          ))}
        </nav>
        <a className="portfolio-link" href="https://daniel-beachy.github.io/" title="More projects by Daniel Beachy">More projects ↗</a>
      </header>
      <main className={'page' + (full ? ' full' : '') + (human ? ' human' : '')}>
        {human && <ViewBoundary key="human"><Suspense fallback={<div className="center" style={{ padding: 80 }}><div className="spinner" /></div>}>{body}</Suspense></ViewBoundary>}
        {!human && tree && (
          <TreeContext.Provider value={tree}>
            <ViewBoundary key={route.view}><Suspense fallback={<div className="center" style={{ padding: 80 }}><div className="spinner" /></div>}>{body}</Suspense></ViewBoundary>
          </TreeContext.Provider>
        )}
        {!human && !tree && body}
      </main>
      {human && (
        <footer className="foot">
          Human Story · borders from <a href="https://doi.org/10.1038/s41597-025-04516-9" target="_blank" rel="noreferrer">Seshat Cliopatria</a> (CC BY 4.0, simplified) ·
          base map made with <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer">Natural Earth</a> ·
          population data processed by <a href="https://ourworldindata.org/grapher/population" target="_blank" rel="noreferrer">Our World in Data</a> ·
          every stop lists its sources
        </footer>
      )}
      {!full && !human && (
        <footer className="foot">
          Divergence times from <a href="https://timetree.org" target="_blank" rel="noreferrer">TimeTree 5</a> (Kumar et al. 2022) ·
          photos from <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">iNaturalist</a> & <a href="https://wikipedia.org" target="_blank" rel="noreferrer">Wikipedia</a> contributors ·
          {' '}<a href="#/about">About & methods</a>
        </footer>
      )}
    </>
  );
}

/** Keeps one broken view from blanking the whole app. */
class ViewBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p className="muted" style={{ margin: '10px 0 18px' }}>This page failed to load. The site may have just been updated.</p>
        <button className="btn" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}
