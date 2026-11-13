import { useEffect, useRef, useState } from 'react';
import type { MapState } from '../lib/types';
import { MapEngine } from './engine';

/** The time-aware world map. Give it a new `state` and it animates there. */
export function HumanMap({ state, polityYears, place }: { state: MapState; polityYears: number[]; place?: { lat: number; lon: number; name: string } | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const engine = useRef<MapEngine | null>(null);
  const [moved, setMoved] = useState(false);
  const lastMoved = useRef(false);

  useEffect(() => {
    const e = new MapEngine(canvas.current!, polityYears);
    engine.current = e;
    e.onDraw = (xy, userMoved) => {
      const m = marker.current;
      if (m) { m.style.display = xy ? 'block' : 'none'; if (xy) m.style.transform = `translate(${xy[0]}px, ${xy[1]}px)`; }
      if (userMoved !== lastMoved.current) { lastMoved.current = userMoved; setMoved(userMoved); }
    };
    const ro = new ResizeObserver(() => { const r = wrap.current!.getBoundingClientRect(); e.resize(Math.round(r.width), Math.round(r.height)); });
    ro.observe(wrap.current!);
    return () => { ro.disconnect(); e.destroy(); engine.current = null; };
  }, [polityYears]);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.place = place ?? null;
    e.setState(state);
  }, [state, place]);

  return (
    <div ref={wrap} className="hs-map">
      <canvas ref={canvas} aria-hidden="true" />
      <div ref={marker} className="hs-marker" aria-hidden="true" />
      {moved && <button className="btn sm hs-reset" onClick={() => engine.current?.resetView()}>Reset view</button>}
    </div>
  );
}
