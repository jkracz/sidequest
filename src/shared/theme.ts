import { getState, onStateChanged } from './storage';
import type { ThemePreference } from './types';

const media = window.matchMedia('(prefers-color-scheme: dark)');

function apply(pref: ThemePreference): void {
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Keeps the `dark` class on <html> in sync with the stored theme preference.
 * Call once per page before rendering: the system theme is applied
 * synchronously so storage's async load can't flash the wrong palette for
 * system-theme users, then the stored preference takes over.
 */
export function initTheme(): void {
  let pref: ThemePreference = 'system';
  apply(pref);

  const sync = () =>
    void getState().then((s) => {
      pref = s.settings.theme;
      apply(pref);
    });
  sync();
  onStateChanged(sync);
  media.addEventListener('change', () => apply(pref));
}
