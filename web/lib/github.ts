/**
 * Resolve a GitHub OAuth token (from a device-flow auth) to a login.
 * Used only when a submission carries `githubToken` — in which case we
 * upgrade the identity to "github" iff the token's login matches the
 * claimed handle (case-insensitive).
 */
export async function resolveGithubLogin(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'claude-mario-runner-leaderboard',
        Accept: 'application/vnd.github+json',
      },
      // 3s budget — we don't want a slow GH API to block submission.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { login?: string };
    return typeof data.login === 'string' ? data.login.toLowerCase() : null;
  } catch {
    // Any failure → treat as unverified. Not a submission failure.
    return null;
  }
}
