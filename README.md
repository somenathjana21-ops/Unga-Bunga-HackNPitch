# WANT

**Chapter One — The Wrong Person.** A story-driven 2D top-down browser game
with real-time combat. This repository is currently at **Phase 0: shell and
scaffold only** — there is no gameplay yet.

Source of truth: `Guidebook.md`, `WANT-Playthrough.pdf` and `Prompts.md`.
Technical history lives in `docs/decisions.md`; every asset must be recorded in
`docs/asset-ledger.md`.

## Requirements

- **Node.js 20+** (dev tooling only — the game itself has no runtime
  dependencies and no build step)
- A current desktop browser (Chrome/Edge for development; one other browser for
  Phase 0 sign-off)

## Quick start

```bash
npm install
npx playwright install chromium   # one-time, for npm run check
npm run dev
```

Open the URL the server prints (default `http://127.0.0.1:5173/`). If the port is
busy it automatically tries the next one.

```bash
npm run check
```

Boots the shell in headless Chromium and verifies: ready flag, live loop, fixed
timestep constants, resize/letterboxing, non-blank render, manual pause, tab-hide
pause/resume, asset manifest resolution, the "no asset paths outside the
manifest" rule, audio buses/mute, and **zero console errors / page errors /
failed requests**. A screenshot lands in `tests/artifacts/phase-0-boot.png`
(git-ignored).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Zero-dependency static server on 127.0.0.1 (port 5173+) |
| `npm run check` | Headless Phase 0 shell check; fails on any console or network error |
| `npm run check:shell` | Alias for `npm run check` |

## Project layout

```
index.html                  entry point (static, no build)
src/
  main.js                   composes shell + systems
  core/                     game loop, input, camera, collision, math
  world/                    scenes, tiles, props, objectives      (Phase 2)
  story/                    dialogue, portraits, cutscenes        (Phase 3)
  combat/                   weapons, enemies, damage              (Phase 4)
  ui/                       HUD, menus, boot screen
  systems/                  asset-manifest.js, audio.js, saves    (Phase 6)
assets/
  characters/ backgrounds/ portraits/ illustrations/
  audio/sfx/ audio/music/
  vfx/
docs/
  decisions.md              dated technical decisions
  asset-ledger.md           source + license for every asset
tests/manual/               human checklists per phase
scripts/                    dev server + headless check (not shipped)
```

Empty folders are kept in git with `.gitkeep`. Existing character art in
`assets/<character>/` is provisional reference material until Group B normalises
and ledgers it.

## Non-negotiable conventions

1. **Assets are referenced by ID only.** `src/systems/asset-manifest.js` is the
   single place that knows paths. Do not write `assets/...` or a file extension
   anywhere else in `index.html` or `src/`. `npm run check` enforces this.
2. **No unledgered assets.** Group B adds the ledger row before the file is
   merged. The manifest reserves path and ID.
3. **ES modules, no bundler, no backend.** The shipped game is a static site.
4. **No gameplay in Phase 0.** The boot screen is a status board.
5. **Phase rhythm:** Build → Check → Report → Orchestrate. A phase is not done
   until the orchestrator merges to the integration branch and tags `v0.<n>`.
6. **Pause is real:** tab hide/window blur stops simulation, resume has no time
   jump. No hidden timers or uninterruptible animations.

See `docs/decisions.md` for the reasoning and `docs/asset-ledger.md` for the
asset gate.

## Debug handle

`window.WANT` is a read-only handle for checking and manual testing:

```js
WANT.version                 // "v0.0.0-phase0"
WANT.game.stats              // { fps, frames, updates, droppedSeconds, lowFps, ... }
WANT.game.viewport           // letterbox rect, scale, DPR, CSS size
WANT.game.pause('manual')    // add a pause reason
WANT.game.resume('manual')   // remove it; resumes when none remain
WANT.audio.getState()        // context state, volumes, buses, current music
WANT.audio.toggleMute()
WANT.assets.summary()        // ids/planned/loaded/failed counts
WANT.assets.resolve('characters.k.sprites')
```

## Worktree workflow

Each developer uses their own worktree on `phase/<n>-<name>` (for example
`phase/0-scaffold`). The integration branch is currently `master`; Guidebook
language says `main` — see D-005 in `docs/decisions.md`. Orchestration merges the
phase branches, runs the merged build and tags `v0.<n>`.

Phase 0 manual sign-off: `tests/manual/PHASE-0.md`.

## Troubleshooting

- **Port in use** — the dev server tries the next 11 ports automatically; use the
  printed URL. Or set `PORT=6000 npm run dev` (PowerShell: `$env:PORT=6000; npm run dev`).
- **`npm run check` cannot launch Chromium** — run
  `npx playwright install chromium`.
- **Blank canvas** — the page shows a red boot-error panel; open the console and
  check the failing module import or syntax error.
- **Low FPS warning** — `[WANT] FPS guard` is a warning after 3 sustained seconds
  below 50 fps. Check DevTools performance before changing render code.
