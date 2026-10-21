import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Tree } from '../lib/data';

export const TreeContext = createContext<Tree | null>(null);

/** The loaded tree; components re-render when live species are grafted in. */
export function useTree(): Tree {
  const tree = useContext(TreeContext)!;
  useSyncExternalStore((f) => tree.subscribe(f), () => tree.version);
  return tree;
}
