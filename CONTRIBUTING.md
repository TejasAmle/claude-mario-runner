# Contributing to claude-mario-runner

Thank you for your interest in contributing! This guide will help you get up and running quickly.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Running the Game](#running-the-game)
- [Testing](#testing)
- [Linting & Formatting](#linting--formatting)
- [How to Add a New Obstacle](#how-to-add-a-new-obstacle)
- [Pull Request Checklist](#pull-request-checklist)

---

## Prerequisites

- **Node.js** ≥ 20 (check with `node --version`)
- **npm** ≥ 9 (bundled with Node.js)
- A terminal that supports ANSI escape codes (most modern terminals do)

---

## Development Setup

```bash
# 1. Fork the repo and clone your fork
git clone https://github.com/<your-username>/claude-mario-runner.git
cd claude-mario-runner

# 2. Install dependencies
npm install

# 3. Create a feature branch
git checkout -b feat/your-feature-name
```

---

## Project Structure

```
claude-mario-runner/
├── src/
│   ├── index.ts          # Entry point
│   ├── cli.ts            # CLI argument parsing
│   ├── app.ts            # Game loop & rendering
│   ├── game/
│   │   ├── obstacles.ts  # Obstacle types, specs & spawn logic
│   │   ├── physics.ts    # AABB collision & gravity
│   │   ├── runner.ts     # Player (mascot) state & movement
│   │   ├── score.ts      # Score tracking & local persistence
│   │   └── world.ts      # Tiers, speed progression & world state
│   ├── engine/           # Terminal rendering engine
│   └── net/              # Leaderboard API client
├── tests/                # Vitest unit tests
├── web/                  # Leaderboard web frontend
├── docs/                 # Screenshots & assets
└── scripts/              # Build & release helpers
```

---

## Running the Game

```bash
# Development mode (live reload, no build step)
npm run dev

# Build then run
npm run build
npm start
```

---

## Testing

```bash
# Run tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Type-check without building
npm run typecheck
```

Tests live in `tests/` and use [Vitest](https://vitest.dev/). Each game module should have a corresponding test file.

---

## Linting & Formatting

```bash
# Check for lint errors
npm run lint

# Auto-format all files
npm run format

# Check formatting without writing
npm run format:check
```

The project uses **ESLint** (typescript-eslint) and **Prettier**. Both run automatically in CI — make sure they pass before opening a PR.

---

## How to Add a New Obstacle

Obstacles are developer-themed (bug, conflict, wall, exception, drone). Here's how to add a new one:

### Step 1 — Define the kind in `src/game/obstacles.ts`

```ts
// Add your kind to the union type
export type ObstacleKind = 'bug' | 'conflict' | 'wall' | 'exception' | 'drone' | 'your-kind';

// Add a spec entry
export const OBSTACLE_SPECS: Record<ObstacleKind, ObstacleSpec> = {
  // ... existing specs ...
  'your-kind': {
    kind: 'your-kind',
    w: 3,       // width in terminal columns
    h: 2,       // height in terminal rows
    label: 'your-kind',
    aerial: false,  // true = floats above ground (like drone)
  },
};
```

### Step 2 — Add it to the appropriate tier(s) in `src/game/world.ts`

```ts
export const DEFAULT_TIERS: readonly Tier[] = [
  // ...
  {
    name: 'hard',
    // ...
    allowedKinds: ['bug', 'conflict', 'wall', 'exception', 'drone', 'your-kind'],
  },
];
```

### Step 3 — Write a test in `tests/`

```ts
import { describe, it, expect } from 'vitest';
import { OBSTACLE_SPECS } from '../src/game/obstacles.js';

describe('your-kind obstacle', () => {
  it('has correct dimensions', () => {
    const spec = OBSTACLE_SPECS['your-kind'];
    expect(spec.w).toBe(3);
    expect(spec.h).toBe(2);
    expect(spec.aerial).toBe(false);
  });
});
```

### Step 4 — Verify everything

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

---

## Pull Request Checklist

Before opening a PR, make sure:

- [ ] `npm run typecheck` — no TypeScript errors
- [ ] `npm run lint` — no lint warnings or errors
- [ ] `npm run format:check` — code is properly formatted (or run `npm run format`)
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — build succeeds
- [ ] New behavior is covered by tests
- [ ] `CHANGELOG` or PR description explains the change clearly
- [ ] Branch is up-to-date with `main`

---

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add timeout obstacle type
fix: correct drone hitbox calculation
docs: update CONTRIBUTING with obstacle guide
test: add tests for score normalization
```

---

## Questions?

Open a [GitHub Discussion](https://github.com/TejasAmle/claude-mario-runner/discussions) or file an issue — happy to help!
