import { useEffect, useState } from 'react';
import { getState, onStateChanged } from './storage';
import type { AppState } from './types';

/** Live view of extension state, re-fetched whenever chrome.storage changes. */
export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void getState().then((s) => {
        if (!cancelled) setState(s);
      });
    };
    refresh();
    const unsubscribe = onStateChanged(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
