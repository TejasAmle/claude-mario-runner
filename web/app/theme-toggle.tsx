'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Light/dark toggle.
 *
 * - First paint reads the `data-theme` attribute set by the inline <script>
 *   in <head> (see layout.tsx) so we never flash the wrong theme.
 * - Persists to localStorage under `cmr-theme`.
 * - Ignores system changes once a user has explicitly picked a theme;
 *   honors `prefers-color-scheme` only when no explicit choice exists.
 */
export function ThemeToggle(): React.ReactElement {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute('data-theme') as Theme | null) ?? 'dark';
    setTheme(current);
  }, []);

  const flip = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('cmr-theme', next);
    } catch {
      // private mode / storage disabled — fine, in-memory state still works
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={flip}
      aria-label={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span aria-hidden className="theme-toggle-icon">
        {theme === 'dark' ? (
          // sun
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <line x1="8" y1="1.5" x2="8" y2="3.5" />
              <line x1="8" y1="12.5" x2="8" y2="14.5" />
              <line x1="1.5" y1="8" x2="3.5" y2="8" />
              <line x1="12.5" y1="8" x2="14.5" y2="8" />
              <line x1="3.2" y1="3.2" x2="4.6" y2="4.6" />
              <line x1="11.4" y1="11.4" x2="12.8" y2="12.8" />
              <line x1="3.2" y1="12.8" x2="4.6" y2="11.4" />
              <line x1="11.4" y1="4.6" x2="12.8" y2="3.2" />
            </g>
          </svg>
        ) : (
          // moon
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.5 9.5a5.5 5.5 0 1 1-7-7 4.5 4.5 0 0 0 7 7z"
              fill="currentColor"
            />
          </svg>
        )}
      </span>
      <span className="theme-toggle-label">{theme === 'dark' ? 'light' : 'dark'}</span>
    </button>
  );
}
