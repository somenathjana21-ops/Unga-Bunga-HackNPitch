# WANT — Technical Decisions

Short, dated record of decisions that affect more than one area. If a decision
changes, add a new entry; do not silently rewrite history. The Guidebook and the
playthrough remain the source of truth for design.

---

## D-001 — Engine: vanilla JavaScript + Canvas 2D

**Date:** 2026-11-20 · **Phase:** 0 · **Owner:** Dev 3

WANT runs on **plain ES2022 JavaScript, the Canvas 2D API and the Web Audio
API**. No game framework, no runtime dependency, no bundler.

Why:

- The game is a 2D top-down pixel game with modest draw counts. Canvas 2D is
  enough for 60 fps on a mid-range desktop, and it keeps the whole renderer
  inspectable.
- The Guidebook requires a static site with no backend and no build server at
  play time. Native ES modules over a static file server satisfy that with zero
  tooling in the shipped path.
- Three developers plus AI agents work in parallel. Small modules with explicit
  imports are easier to review, merge and debug than framework-specific
  abstractions.
- Asset swapping is a first-class requirement. A manifest module plus plain
  image/audio objects is simpler than a framework asset pipeline.

Rejected for now:

- **Phaser** — capable, but adds a large engine API to learn, a bundled build
  step and a second asset system. Revisit only if the renderer becomes the
  bottleneck.
- **PixiJS** — WebGL power we do not need for a pixel top-down game.
- **Unity / Godot web export** — heavier workflow and export pipeline than a
  static site warrants.
- **React / Vue for HUD** — DOM overlays are not needed yet; the HUD can be
  drawn on canvas. Revisit for menus only if it clearly saves time.

Decision owner may revisit at Phase 7 (polish/performance) with measurements,
not vibes.

---

## D-002 — Module system and code conventions

**Date:** 2026-11-20 · **Phase:** 0

- Native **ES modules** (`import` / `export`). No CommonJS, no bundler, no
  import maps in Phase 0. Every file is loaded from a static server.
- One concern per module. Cross-area code goes through explicit imports; no
  implicit global registries.
- The only intentional global is `window.WANT`, a read-only debug handle
  (`game`, `audio`, `assets`, `version`) used by the headless check and manual
  testing.
- JavaScript + **JSDoc** for types. No TypeScript build step in Phase 0.
- Naming: files `kebab-case.js`, classes `PascalCase`, functions/variables
  `camelCase`, constants `UPPER_SNAKE_CASE`, asset IDs `dot.case`
  (`characters.k.sprites`).
- No runtime dependencies. `node_modules/` exists only for dev tooling
  (Playwright). The game itself must boot with `index.html` + `src/` + `assets/`.
- No hidden timers or uninterruptible animations (playthrough rule). Pause must
  stop simulation, not paper over it.

---

## D-003 — Folder conventions

**Date:** 2026-11-20 · **Phase:** 0

The tree follows Guidebook §5 exactly:

```
index.html
src/core/       engine loop, input, camera, collision, math
src/world/      scenes, tiles, props, interactables, objectives
src/story/      dialogue, portraits, cutscenes, flags, chapters
src/combat/     weapons, dodge, counter, enemies, damage, telegraphs
src/ui/         HUD, menus, pause, settings, game over, boot screen
src/systems/    saves, difficulty, audio, asset manifest
assets/
  characters/
  backgrounds/
  portraits/
  illustrations/
  audio/sfx/
  audio/music/
  vfx/
docs/           decisions.md, asset-ledger.md
tests/manual/   human checklists per phase
```

Rules:

- Empty directories carry a `.gitkeep` so the skeleton survives clone.
- New top-level folders or a change to ownership needs an entry here first.
- Existing character art currently lives in `assets/<character>/`. It is
  **provisional**: Group B moves/normalises it into the tree above and ledgers
  it before any scene uses it. The manifest reserves the destination paths.
- Generated/dev-only files go in `tests/artifacts/` (git-ignored).

---

## D-004 — Assets: one manifest, one ledger

**Date:** 2026-11-20 · **Phase:** 0

- `src/systems/asset-manifest.js` is the **only** module allowed to know an
  asset path or file extension. Everything else references assets by ID:
  `characters.k.sprites`, `audio.music.alleyCombat`.
- Loading is lazy and tolerant: a missing planned file logs one warning and
  resolves to `null`, so scenes can boot with placeholders while Group B
  delivers. Nothing is eagerly loaded at boot.
- Asset paths are relative to `assets/` and validated at module load. `..`,
  absolute paths and backslashes are rejected.
- Group B updates `docs/asset-ledger.md` **before** a file is merged. No ledger
  entry, no merge. Group A refuses to wire unledgered files.
- Renaming or replacing a delivered file is a manifest edit (one line), never a
  search-and-replace through gameplay code.
- The headless check scans `index.html` and `src/` for path strings and fails if
  they appear outside the manifest.

---

## D-005 — Git worktree workflow

**Date:** 2026-11-20 · **Phase:** 0

- Each developer works in their **own worktree**, on a branch named
  `phase/<n>-<short-name>` (for example `phase/0-scaffold`,
  `phase/4-combat-core`).
- Rhythm per Guidebook §4: **Build → Check → Report → Orchestrate**. The agent's
  "done" is unverified until the matching check prompt and manual checklist
  pass.
- Orchestration is mandatory: any member merges all three phase branches into
  the integration branch, resolves conflicts, runs the merged build and tags
  `v0.<n>`. The next phase does not start before that.
- Never commit directly to the integration branch; never force-push a shared
  branch.
- **Repo note:** the default branch is currently `master`. Guidebook language
  says `main`; treat `master` as the integration branch until the team renames
  it, then update this entry.
- This scaffold was built on `phase/0-scaffold` from `master`.
- Horde Mode uses `phase/horde-mode`, imports the combat core and never forks it.

---

## D-006 — Shell timing, pause and display rules

**Date:** 2026-11-20 · **Phase:** 0

- **Fixed timestep:** simulation updates at 60 Hz (`1/60 s`). Frame deltas are
  clamped to 250 ms, with at most 8 steps per rendered frame. If the cap is hit,
  the backlog is discarded (spiral-of-death guard). Rendering receives an
  interpolation `alpha`.
- **Pause:** tab hide and window blur add independent pause reasons; the loop
  resumes only when every reason is removed. Manual pause is its own reason.
  Resuming resets the clock so there is no simulation jump. Pausing stops
  `requestAnimationFrame`; one paused frame is rendered for the overlay.
- **Display:** design resolution is 1280×720. The canvas backing store follows
  CSS size × device pixel ratio (capped at 2), and the design area is letterboxed
  to preserve 16:9. Rendering code always uses 1280×720 coordinates.
- **FPS guard:** warn via `console.warn` when measured FPS is below 50 for 3
  sustained one-second windows, at most once every 10 seconds. It is a warning,
  never an error, and it is suspended while paused.
- **Input:** actions map to physical `event.code` values (layout independent).
  Mouse buttons bind as `Mouse0`–`Mouse2`. Pointer coordinates are mapped from
  CSS pixels into the letterboxed design viewport.
- **Audio:** the Web Audio context is created lazily on the first user gesture.
  Buses are `music` and `sfx` into `master`; mute sets the master target to 0.
  Missing files are silence, not exceptions.

---

## D-007 — Dev tooling

**Date:** 2026-11-20 · **Phase:** 0

- **Node.js ≥ 20** is required for dev tooling only.
- `npm run dev` starts a **zero-dependency static server** on
  `http://127.0.0.1:5173/` (next free port if busy). No watch/build step: reload
  the browser.
- `npm run check` boots the shell in headless Chromium via **Playwright**
  (devDependency only), exercises boot, resize, pause, manifest and audio, and
  fails on console errors, page errors, failed requests or 4xx/5xx.
- A screenshot is written to `tests/artifacts/phase-0-boot.png` (git-ignored).
- Checks must run from a clean clone state: `npm install`, then
  `npx playwright install chromium` once.
- Target browsers: current Chrome/Edge, plus one other (Firefox or a
  Chromium-based alternative) for Phase 0 manual sign-off.

---

## D-008 — Phase 0 scope

**Date:** 2026-11-20 · **Phase:** 0

Phase 0 ships **no gameplay**: no player, no scenes, no combat, no dialogue, no
story flags. The boot screen is a status board only. Its job is to prove the
shell, conventions and tooling are sound before Phase 1 adds the controller.

The canvas is intentionally not a DOM-heavy HUD. Phase 1 may add DOM overlays
for text-heavy UI if that proves cheaper, but it must be recorded here first.
