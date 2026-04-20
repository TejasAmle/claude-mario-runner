'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '@/lib/types';

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; data: LeaderboardResponse; fetchedAt: number }
  | { status: 'error'; message: string };

const REFRESH_MS = 30_000;
const LIMIT = 100;

export function Board({ currentVersion }: { currentVersion: string }): React.ReactElement {
  const [version, setVersion] = useState(currentVersion);
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionsAvailable = useMemo(() => uniqueVersions(currentVersion), [currentVersion]);

  const doFetch = useCallback(
    async (v: string, { silent = false }: { silent?: boolean } = {}): Promise<void> => {
      if (!silent) setState({ status: 'loading' });
      setRefreshing(true);
      try {
        const res = await fetch(`/api/leaderboard?limit=${LIMIT}&version=${v}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LeaderboardResponse;
        setState({ status: 'ok', data, fetchedAt: Date.now() });
      } catch (e) {
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'unknown error',
        });
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  // Initial fetch + polling loop. Pauses when tab is hidden.
  useEffect(() => {
    let cancelled = false;

    async function tick(): Promise<void> {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        await doFetch(version, { silent: true });
      }
      if (cancelled) return;
      timer.current = setTimeout(tick, REFRESH_MS);
    }

    void doFetch(version);
    timer.current = setTimeout(tick, REFRESH_MS);

    const onVis = (): void => {
      if (document.visibilityState === 'visible') void doFetch(version, { silent: true });
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      if (timer.current !== null) clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [version, doFetch]);

  // Copy button wiring — exists outside this component. Minimal global handler.
  useEffect(() => {
    const btn = document.getElementById('copy-btn') as HTMLButtonElement | null;
    if (!btn) return;
    const handler = async (): Promise<void> => {
      const text = btn.getAttribute('data-copy') ?? '';
      try {
        await navigator.clipboard.writeText(text);
        btn.disabled = true;
        btn.textContent = '[ ✓ ]';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '[ copy ]';
        }, 1600);
      } catch {
        // fail silently — users can still copy-paste manually.
      }
    };
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);

  return (
    <section aria-label="leaderboard">
      <div className="section-head">
        <h2>TOP {LIMIT}</h2>
        <label className="visually-hidden" htmlFor="version-select">
          version
        </label>
        <select
          id="version-select"
          className="version-select"
          value={version}
          onChange={(e): void => setVersion(e.target.value)}
        >
          {versionsAvailable.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="double-rule" aria-hidden>
        ══════════════════════════════════════════════════════════════════════
      </div>

      {state.status === 'loading' && <LoadingTable />}
      {state.status === 'error' && (
        <ErrorPanel message={state.message} onRetry={() => void doFetch(version)} />
      )}
      {state.status === 'ok' && state.data.entries.length === 0 && <EmptyPanel />}
      {state.status === 'ok' && state.data.entries.length > 0 && (
        <>
          <table className="board" aria-describedby="board-meta">
            <thead>
              <tr>
                <th scope="col" className="col-rank">
                  #
                </th>
                <th scope="col" className="col-player">
                  player
                </th>
                <th scope="col" className="col-score">
                  score
                </th>
                <th scope="col" className="col-games">
                  games
                </th>
                <th scope="col" className="col-seen">
                  last seen
                </th>
              </tr>
              <tr className="underline-row" aria-hidden>
                <td className="r-rank">──</td>
                <td className="r-player">──────</td>
                <td className="r-score">─────</td>
                <td className="r-games">─────</td>
                <td className="r-seen">─────────</td>
              </tr>
            </thead>
            <tbody>
              {state.data.entries.map((e) => (
                <Row key={e.username} entry={e} />
              ))}
            </tbody>
          </table>
          <p className="meta" id="board-meta">
            <span>
              showing top {state.data.entries.length} · updated{' '}
              {relativeTime(state.fetchedAt / 1000)} · auto-refresh every 30s
            </span>
            <span className="refresh-dots" aria-hidden>
              {refreshing ? '⋯' : ''}
            </span>
          </p>
        </>
      )}
    </section>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }): React.ReactElement {
  const rankClass =
    entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : entry.rank === 3 ? 'rank-3' : '';
  return (
    <>
      <tr className={rankClass}>
        <td className="r-rank">{String(entry.rank).padStart(2, '0')}</td>
        <td className="r-player">
          {entry.username}
          {entry.identityType === 'github' && (
            <span className="verified" title="GitHub-verified identity">
              ✓
            </span>
          )}
        </td>
        <td className="r-score">{formatScore(entry.score)}</td>
        <td className="r-games">{entry.gamesPlayed}</td>
        <td className="r-seen">{relativeTime(entry.lastSeenTs)}</td>
      </tr>
      <tr className="mobile-meta-row" aria-hidden>
        <td />
        <td colSpan={4}>{relativeTime(entry.lastSeenTs)}</td>
      </tr>
    </>
  );
}

function LoadingTable(): React.ReactElement {
  return (
    <table className="board" aria-busy="true" aria-label="loading leaderboard">
      <tbody>
        {Array.from({ length: 10 }, (_, i) => (
          <tr key={i}>
            <td className="r-rank">
              <span className="skeleton-block">00</span>
            </td>
            <td className="r-player">
              <span className="skeleton-block">██████████</span>
            </td>
            <td className="r-score">
              <span className="skeleton-block">█████</span>
            </td>
            <td className="r-games">
              <span className="skeleton-block">███</span>
            </td>
            <td className="r-seen">
              <span className="skeleton-block">████████</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyPanel(): React.ReactElement {
  return (
    <div className="state-panel">
      no scores yet.
      <span className="prompt">&gt; be the first.</span>
      <span className="prompt">&gt; npx claude-mario-runner</span>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div className="state-panel error-panel" role="alert">
      ✗ connection lost · {message}
      <button className="retry-btn" type="button" onClick={onRetry}>
        retry now
      </button>
    </div>
  );
}

function formatScore(n: number): string {
  // Thousands-separator with commas (no zero-pad) → "563", "1,337", "12,450".
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function relativeTime(unixSec: number): string {
  if (!unixSec) return '—';
  const nowMs = Date.now();
  const thenMs = unixSec * 1000;
  const diff = Math.max(0, Math.floor((nowMs - thenMs) / 1000));
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86_400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  return new Date(thenMs).toISOString().slice(0, 10);
}

/** Build list of version keys to offer in the dropdown. For now just the current. */
function uniqueVersions(current: string): string[] {
  return [current];
}
