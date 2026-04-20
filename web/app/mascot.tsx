/**
 * Mascot sprite as an inline SVG so it picks up the current theme's accent
 * (via `currentColor`). Mirrors the in-game mascot pattern:
 *
 *   ########
 *   #o####o#
 *   ########
 *   # #  # #
 *
 * Kept purely decorative — `aria-hidden` — since the visible "CLAUDE MARIO
 * RUNNER" heading already conveys the identity to screen readers.
 */
export function Mascot({ size = 40 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={(size / 32) * 16}
      viewBox="0 0 32 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block' }}
    >
      <g fill="currentColor">
        {/* row 0: full bar */}
        <rect x="0" y="0" width="32" height="3" />
        {/* row 1: body with eye slots */}
        <rect x="0" y="3" width="4" height="3" />
        <rect x="8" y="3" width="12" height="3" />
        <rect x="24" y="3" width="8" height="3" />
        {/* row 2: full bar */}
        <rect x="0" y="6" width="32" height="3" />
        {/* row 3: legs */}
        <rect x="0" y="9" width="4" height="3" />
        <rect x="8" y="9" width="4" height="3" />
        <rect x="20" y="9" width="4" height="3" />
        <rect x="28" y="9" width="4" height="3" />
      </g>
      {/* eyes — punched out in the bg color */}
      <rect x="5" y="4" width="2" height="2" fill="var(--bg)" />
      <rect x="21" y="4" width="2" height="2" fill="var(--bg)" />
    </svg>
  );
}
