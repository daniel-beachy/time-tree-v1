import { useSyncExternalStore } from 'react';

// Hash routing keeps every view linkable and works on GitHub Pages without server rewrites.
// Format: #/view/arg1/arg2?key=value

export interface Route { view: string; args: string[]; query: URLSearchParams }

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const [view = '', ...args] = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { view: view || 'home', args, query: new URLSearchParams(qs) };
}

let current = parse();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  subs.forEach((f) => f());
});

export function useRoute(): Route {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current);
}

export function href(view: string, args: (string | number)[] = [], query?: Record<string, string | number | undefined>) {
  const q = query ? Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  return `#/${[view, ...args.map((a) => encodeURIComponent(String(a)))].join('/')}${q ? '?' + q : ''}`;
}

export function go(view: string, args: (string | number)[] = [], query?: Record<string, string | number | undefined>, replace = false) {
  const h = href(view, args, query);
  if (replace) history.replaceState(null, '', h);
  else history.pushState(null, '', h);
  current = parse();
  subs.forEach((f) => f());
}
