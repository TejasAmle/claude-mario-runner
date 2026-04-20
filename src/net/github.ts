/**
 * GitHub device-flow OAuth.
 *
 * Flow:
 *   1. POST /login/device/code → { device_code, user_code, verification_uri, interval }
 *   2. Show user_code + verification_uri; user authorizes in browser.
 *   3. Poll /login/oauth/access_token with device_code until we get a token
 *      or the user declines.
 *
 * Scope: `read:user` only. We never write. The access token is persisted in
 * ~/.claude-mario-runner/profile.json with mode 0600.
 *
 * Client ID is deliberately public — device flow doesn't use a client secret.
 * Override via CLAUDE_MARIO_GH_CLIENT_ID for fork/testing.
 */

const DEFAULT_CLIENT_ID = 'Ov23li4kC2cRHaLxXXXX'; // placeholder; overridden at deploy
const SCOPE = 'read:user';

function clientId(): string {
  return process.env.CLAUDE_MARIO_GH_CLIENT_ID || DEFAULT_CLIENT_ID;
}

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export async function requestDeviceCode(): Promise<DeviceCode> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId(), scope: SCOPE }),
  });
  if (!res.ok) throw new Error(`device code request failed: ${res.status}`);
  return (await res.json()) as DeviceCode;
}

type TokenPoll =
  | { access_token: string; token_type: string; scope: string }
  | { error: 'authorization_pending' | 'slow_down' | 'expired_token' | 'access_denied' | string };

/**
 * Poll for the access token until we get one, the device code expires, or
 * the user denies. Respects `slow_down` by adding 5s to the interval.
 */
export async function pollForToken(dev: DeviceCode): Promise<string> {
  let intervalMs = dev.interval * 1000;
  const deadline = Date.now() + dev.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId(),
        device_code: dev.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const body = (await res.json()) as TokenPoll;
    if ('access_token' in body) return body.access_token;
    if (body.error === 'authorization_pending') continue;
    if (body.error === 'slow_down') {
      intervalMs += 5000;
      continue;
    }
    throw new Error(`github login failed: ${body.error}`);
  }
  throw new Error('github login timed out');
}

/** Resolve token → github login. Returns null if token is invalid. */
export async function resolveLogin(token: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.github.com/user', {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'claude-mario-runner',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as { login?: string };
    return typeof body.login === 'string' ? body.login.toLowerCase() : null;
  } catch {
    return null;
  }
}
