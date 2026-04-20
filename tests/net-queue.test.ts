import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * queue.ts + config.ts hardcode paths under os.homedir() at module-load time.
 * We redirect HOME to a scratch dir BEFORE importing those modules, then
 * wipe the dir between tests rather than re-importing the modules.
 */
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cmr-test-'));
const originalHome = process.env.HOME;
// Set HOME before the top-level dynamic imports below resolve.
process.env.HOME = tmpHome;

afterAll(() => {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});
beforeEach(() => {
  // Wipe everything under ~/.claude-mario-runner to isolate tests.
  const dir = path.join(tmpHome, '.claude-mario-runner');
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
});

// Dynamic imports after HOME is set. Vitest's top-level beforeAll runs
// before these awaits resolve, but to be safe we await here.
const queue = await import('../src/net/queue.js');
const config = await import('../src/net/config.js');

describe('queue', () => {
  it('enqueue + readQueue round-trips', () => {
    queue.enqueue(samplePayload('a', 100));
    queue.enqueue(samplePayload('b', 200));
    const q = queue.readQueue();
    expect(q.length).toBe(2);
    expect(q[0]!.payload.username).toBe('a');
    expect(q[1]!.payload.score).toBe(200);
  });

  it('caps at 50 entries, dropping oldest', () => {
    for (let i = 0; i < 55; i++) queue.enqueue(samplePayload(`u${i}`, i));
    const q = queue.readQueue();
    expect(q.length).toBe(50);
    expect(q[0]!.payload.username).toBe('u5');
    expect(q[49]!.payload.username).toBe('u54');
  });

  it('skips corrupt lines in readQueue', () => {
    queue.enqueue(samplePayload('good', 1));
    fs.appendFileSync(queue.queueFilePath(), 'this-is-not-json\n');
    queue.enqueue(samplePayload('also-good', 2));
    const q = queue.readQueue();
    expect(q.length).toBe(2);
    expect(q.map((e) => e.payload.username)).toEqual(['good', 'also-good']);
  });

  it('clearQueue removes the file', () => {
    queue.enqueue(samplePayload('x', 1));
    queue.clearQueue();
    expect(queue.readQueue()).toEqual([]);
  });
});

describe('config', () => {
  it('loadProfile returns defaults when no file exists', () => {
    expect(config.loadProfile()).toEqual({ handle: '', identityType: 'local' });
  });

  it('saveProfile persists and loadProfile reads back', () => {
    config.saveProfile({ handle: 'tejas', identityType: 'github', githubToken: 'ghp_x' });
    const p = config.loadProfile();
    expect(p.handle).toBe('tejas');
    expect(p.identityType).toBe('github');
    expect(p.githubToken).toBe('ghp_x');
  });

  it('saves profile.json with 0600 mode', () => {
    config.saveProfile({ handle: 'tejas', identityType: 'local' });
    const stat = fs.statSync(config.profileFilePath());
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it('clearProfile removes file', () => {
    config.saveProfile({ handle: 'tejas', identityType: 'local' });
    config.clearProfile();
    expect(config.loadProfile().handle).toBe('');
  });

  it('rejects malformed identityType', () => {
    fs.mkdirSync(path.dirname(config.profileFilePath()), { recursive: true });
    fs.writeFileSync(
      config.profileFilePath(),
      JSON.stringify({ handle: 'x', identityType: 'bogus' }),
    );
    expect(config.loadProfile().identityType).toBe('local');
  });
});

function samplePayload(username: string, score: number) {
  return {
    username,
    score,
    tier: 'easy' as const,
    version: '0.2.0',
    playTimeSec: 10,
  };
}
