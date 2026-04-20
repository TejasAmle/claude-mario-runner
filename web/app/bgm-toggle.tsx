'use client';

import { useEffect, useRef, useState } from 'react';

const LS_KEY = 'cmr-bgm';
const VOLUME = 0.08; // very low — background ambience, not foreground

/**
 * Lo-fi chiptune background music toggle.
 *
 * - OFF by default. Browsers block autoplay-with-sound without a user gesture,
 *   so this is the only honest UX anyway.
 * - Preference persists in localStorage; if the user had it on before, we
 *   re-arm the player and kick it off after the first interaction on the
 *   page (pointer / key / touch) to satisfy autoplay policies.
 * - Volume pinned low (0.08) — you should notice it only if you stop typing.
 */
export function BgmToggle(): React.ReactElement {
  const [on, setOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Restore previous preference and attempt to resume after first gesture.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LS_KEY);
    } catch {
      // storage disabled — fine
    }
    if (stored !== 'on') return;

    const startOnGesture = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.volume = VOLUME;
        await audio.play();
        setOn(true);
      } catch {
        // still blocked — leave off
      }
      window.removeEventListener('pointerdown', startOnGesture);
      window.removeEventListener('keydown', startOnGesture);
      window.removeEventListener('touchstart', startOnGesture);
    };
    window.addEventListener('pointerdown', startOnGesture, { once: true });
    window.addEventListener('keydown', startOnGesture, { once: true });
    window.addEventListener('touchstart', startOnGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', startOnGesture);
      window.removeEventListener('keydown', startOnGesture);
      window.removeEventListener('touchstart', startOnGesture);
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (on) {
      audio.pause();
      setOn(false);
      try {
        localStorage.setItem(LS_KEY, 'off');
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      audio.volume = VOLUME;
      await audio.play();
      setOn(true);
      try {
        localStorage.setItem(LS_KEY, 'on');
      } catch {
        /* ignore */
      }
    } catch {
      // Autoplay blocked in this context (rare for a click handler). No-op.
    }
  };

  return (
    <>
      <button
        type="button"
        className="bgm-toggle"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? 'mute background music' : 'play background music'}
        title={on ? 'mute music' : 'play music'}
      >
        <span aria-hidden className="bgm-toggle-icon">
          {on ? (
            // speaker with waves
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 6h2l3-3v10L5 10H3V6z"
                fill="currentColor"
              />
              <path
                d="M10 5.5a3 3 0 0 1 0 5M12 3.5a5 5 0 0 1 0 9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : (
            // speaker muted
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 6h2l3-3v10L5 10H3V6z"
                fill="currentColor"
              />
              <path
                d="M10.5 6.5l3 3M13.5 6.5l-3 3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
        <span className="bgm-toggle-label">{on ? 'music' : 'muted'}</span>
      </button>
      {/* preload=none: don't waste bandwidth until a user clicks */}
      <audio ref={audioRef} src="/bgm.mp3" loop preload="none" />
    </>
  );
}
