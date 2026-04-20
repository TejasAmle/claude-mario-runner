/**
 * Endpoint resolution. Defaults to production; overridable via env for
 * local development against `pnpm dev` in web/.
 */
export const DEFAULT_ENDPOINT = 'https://claude-mario-runner.vercel.app';

export function resolveEndpoint(): string {
  const fromEnv = process.env.CLAUDE_MARIO_API;
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv.replace(/\/+$/, '');
  return DEFAULT_ENDPOINT;
}
