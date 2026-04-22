# I built and shipped a game this weekend. That's not the interesting part.

*A PM's notes from the other side of the keyboard.*

> **Published on Medium:** [I built and shipped a game this weekend. That's not the interesting part.](https://medium.com/@tejas_amle/i-built-and-shipped-a-game-this-weekend-thats-not-the-interesting-part-11f4be3d7854)

---

I spent a weekend building `claude-mario-runner` — a Chrome-dino-style infinite runner that lives in your terminal, plus a global leaderboard at [claude-mario-runner.vercel.app](https://claude-mario-runner.vercel.app). You install it with `npx claude-mario-runner`, press space to jump, and your best score ends up on a public board.

![CLAUDE MARIO RUNNER leaderboard](./docs/leaderboard.png)

Cute project. That's not what this post is about.

## What actually happened

I'm a product manager. I don't ship production code for a living. But in one weekend, here's what landed:

- A real-time terminal game with physics, sprites, collision detection, seeded RNG for reproducible runs, and a deterministic 30 Hz fixed timestep
- A public Next.js leaderboard on Vercel's Fluid Compute
- An Upstash Redis backend with `ZADD GT` for atomic max-only writes, rate limiting, and reserved handles
- GitHub device-flow OAuth for verified handles
- An offline queue that retries submissions the next time you launch the game
- A CI pipeline. Tests. A published npm package. Light/dark mode. Pixel cursors. A retro font stack modeled after Claude's design system.

The last time I tried to build something half this ambitious, I spent three weekends fighting TypeScript configs and gave up on the API route.

## The PM-to-SDE distance is collapsing

Here's the thing I can't stop thinking about.

For a decade, the PM job has been about specifying intent — writing PRDs, drawing Figmas, arguing in reviews — and then handing that intent to engineers who translate it into code. The handoff was the job. The handoff was the *entire* job, really. Most of what a PM does is reduce the cost of a handoff that shouldn't have needed to happen.

That cost is now approaching zero.

I'm not saying PMs will replace engineers. I'm saying the two jobs are going to merge into something new. The person who owns a feature will increasingly be the person who builds a first working version of it. Not because "everyone will code" — that tired prediction has been wrong for thirty years — but because the *description* of software and the *execution* of software are becoming the same artifact. When I said "add a light/dark toggle that persists, no FOUC on reload," what came back was production-grade TypeScript with a blocking inline head script. I didn't write TypeScript. I wrote a spec. The spec shipped.

The next few years, the title on my LinkedIn might not be PM or SDE. It'll be something in between. People who can hold a product in their head and also type into a terminal. The boundary wasn't natural — it was a function of how expensive the translation step used to be.

## Claude is shipping at a pace I've never seen

Half the reason the above even works is that the tooling is sprinting. Every other day there's another release — better tool use, better agents, new skills, background tasks, the IDE integration, prompt caching improvements. I'm not a fanboy. I'm just stating what I'm observing: the release velocity is compressing what used to be quarterly roadmap items into weekly drops.

For a PM, this is both thrilling and uncomfortable. Thrilling because leverage. Uncomfortable because if your moat was "I know how to scope a 6-week project," that moat is being refilled with concrete.

My take: bet on the compression. Build things. Ship small. The gap between "I have an idea" and "someone in Bangalore just typed their name into my leaderboard" used to be a quarter. For me, it was Saturday afternoon.

## Try it

```
npx claude-mario-runner
```

Leaderboard: [claude-mario-runner.vercel.app](https://claude-mario-runner.vercel.app)
Source: [github.com/TejasAmle/claude-mario-runner](https://github.com/TejasAmle/claude-mario-runner)

If you beat my score, I'll be annoyed, which is its own kind of feature.

---

*— Tejas Amle, a PM who spent the weekend as an SDE and isn't sure there's a difference anymore.*
