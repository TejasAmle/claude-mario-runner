import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export function distanceToScore(distance: number): number {
  return Math.floor(distance);
}

const SCORE_DIR = path.join(os.homedir(), '.claude-mario-runner');
const SCORE_FILE = path.join(SCORE_DIR, 'scores.json');

interface ScoresFile {
  highScore: number;
}

export function loadHighScore(): number {
  try {
    const raw = fs.readFileSync(SCORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ScoresFile>;
    const n = Number(parsed.highScore);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    fs.mkdirSync(SCORE_DIR, { recursive: true });
    const tmp = SCORE_FILE + '.tmp';
    const data: ScoresFile = { highScore: Math.floor(score) };
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, SCORE_FILE);
  } catch {
    // best-effort; silent failure is acceptable for local score file
  }
}
