/**
 * Handle validation — MUST stay in sync with web/lib/validate.ts.
 * Centralized here because the CLI needs to validate locally before submitting
 * (fail fast on bad handles rather than hitting the API for a 400).
 */

/** 2–24 chars, lowercase alphanum + dash, must start alphanum. */
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,23}$/;

/**
 * Not a security filter — the server has the authoritative reserved set. This
 * is just to give immediate feedback in the first-launch prompt so we don't
 * let the user "save" a handle we know we'll reject on submit.
 */
export const CLIENT_RESERVED_HANDLES = [
  'admin',
  'root',
  'system',
  'anonymous',
  'null',
  'undefined',
  'server',
  'claude',
  'anthropic',
];

export type HandleCheck =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'shape' | 'reserved' };

export function checkHandle(raw: string): HandleCheck {
  const s = raw.trim().toLowerCase();
  if (!s) return { ok: false, reason: 'empty' };
  if (!HANDLE_RE.test(s)) return { ok: false, reason: 'shape' };
  if (CLIENT_RESERVED_HANDLES.includes(s)) return { ok: false, reason: 'reserved' };
  return { ok: true };
}

export function handleErrorMessage(reason: Exclude<HandleCheck, { ok: true }>['reason']): string {
  switch (reason) {
    case 'empty':
      return 'handle cannot be empty';
    case 'shape':
      return 'must be 2–24 chars, lowercase letters/digits/dash, starting alphanum';
    case 'reserved':
      return 'that handle is reserved — pick another';
  }
}
