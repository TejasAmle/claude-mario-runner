export const STEP_MS = 1000 / 30;
const MAX_CATCHUP_STEPS = 5;
const EPSILON = 1e-6;

export interface LoopHandle {
  stop(): void;
}

export interface LoopHooks {
  update(dtMs: number): void;
  render(): void;
  now?: () => number;
}

export function runLoop(hooks: LoopHooks): LoopHandle {
  const now = hooks.now ?? (() => performance.now());
  let running = true;
  let last = now();
  let acc = 0;

  const tick = () => {
    if (!running) return;
    const t = now();
    let delta = t - last;
    last = t;
    if (delta > STEP_MS * MAX_CATCHUP_STEPS) delta = STEP_MS * MAX_CATCHUP_STEPS;
    acc += delta;

    let steps = 0;
    while (acc + EPSILON >= STEP_MS && steps < MAX_CATCHUP_STEPS) {
      hooks.update(STEP_MS);
      acc -= STEP_MS;
      steps++;
    }

    hooks.render();

    const delay = Math.max(1, STEP_MS - acc);
    setTimeout(tick, delay);
  };

  setImmediate(tick);

  return {
    stop() {
      running = false;
    },
  };
}

export interface StepResult {
  updates: number;
  accAfter: number;
}

export function simulateStep(
  accBefore: number,
  deltaMs: number,
  stepMs: number = STEP_MS,
  maxCatchup: number = MAX_CATCHUP_STEPS,
): StepResult {
  let delta = deltaMs;
  if (delta > stepMs * maxCatchup) delta = stepMs * maxCatchup;
  let acc = accBefore + delta;
  let updates = 0;
  while (acc + EPSILON >= stepMs && updates < maxCatchup) {
    acc -= stepMs;
    updates++;
  }
  return { updates, accAfter: acc };
}
