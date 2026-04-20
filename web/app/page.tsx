import { LB_VERSION } from '@/lib/redis';
import { Board } from './board';
import { BgmToggle } from './bgm-toggle';
import { Mascot } from './mascot';
import { ThemeToggle } from './theme-toggle';

export default function HomePage(): React.ReactElement {
  return (
    <>
      <main>
        <div className="top-bar">
          <BgmToggle />
          <ThemeToggle />
        </div>

        <div className="header">
          <span className="mascot-wrap" aria-hidden>
            <Mascot size={44} />
          </span>
          <h1 className="title">CLAUDE MARIO RUNNER</h1>
        </div>
        <div className="rule" aria-hidden>
          ────────────────────
        </div>
        <p className="tagline">global leaderboard · unverified honor system</p>

        <div className="play-card">
          <div>
            <span className="label">play:</span>
            <code>npx claude-mario-runner</code>
          </div>
          <button
            id="copy-btn"
            className="copy-btn"
            type="button"
            data-copy="npx claude-mario-runner"
            aria-live="polite"
          >
            [ copy ]
          </button>
        </div>

        <Board currentVersion={LB_VERSION} />

        <footer className="page-footer">
          <a
            href="https://github.com/TejasAmle/claude-mario-runner"
            target="_blank"
            rel="noreferrer"
          >
            github ↗
          </a>
          <a
            href="https://www.npmjs.com/package/claude-mario-runner"
            target="_blank"
            rel="noreferrer"
          >
            npm ↗
          </a>
          <span>{LB_VERSION}</span>
          <span>MIT licensed</span>
        </footer>
      </main>

      <div className="made-by" role="contentinfo">
        Made with <span className="heart" aria-label="love">♥</span> by{' '}
        <a href="https://github.com/TejasAmle" target="_blank" rel="noreferrer">
          TejasAmle
        </a>
      </div>
    </>
  );
}
