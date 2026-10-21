import { useEffect, useState } from 'react';

// Per-browser preferences and quiz stats. Every access is guarded: storage can be unavailable
// (private windows, blocked site data) and the app must still work.

export function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem('deeproots:' + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  try { localStorage.setItem('deeproots:' + key, JSON.stringify(value)); } catch { /* ignore */ }
}

const subs = new Map<string, Set<(v: unknown) => void>>();

export function usePref<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const set = subs.get(key) ?? new Set();
    subs.set(key, set);
    const f = (nv: unknown) => setV(nv as T);
    set.add(f);
    return () => { set.delete(f); };
  }, [key]);
  return [v, (nv: T) => { write(key, nv); subs.get(key)?.forEach((f) => f(nv)); }];
}
