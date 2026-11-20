# WANT contributor instructions

## First moves
- Read `PROGRESS.md` first. It is the live source of truth for implementation status. Claim a concrete task there with agent/session, human owner, branch/worktree, owned files and acceptance criteria before changing implementation files. Do not overlap another agent's claimed work without a handoff.
- Inspect `git status` and the current branch before editing. The tree may contain another agent's uncommitted slice; never reset, clean, stash or overwrite it.
- Read `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, and the assigned phase in `docs/GUIDEBOOK.md`. For story work also read `docs/PLAYTHROUGH.md`; `Script (2).pdf` is the authoritative supplied script, while the playthrough records the approved direction and proposed connective dialogue.
- Implement only the assigned phase/task. This repository is a foundation preview, not a complete campaign.
- When the user types `/graphify`, load the `graphify` skill before doing anything else.

## Commands
- Use Node 24 LTS (`.nvmrc`) and install with `npm ci` from the committed lockfile.
- `npm run check` is the required gate for application changes: asset validation, strict TypeScript, Vitest, then a production build. `prebuild` also copies runtime assets.
- `npm test` runs all tests. Run one file with `npm test -- tests/rules.test.ts`; add `-t "case name"` for one case.
- `npm run dev` starts Vite on `127.0.0.1`; `predev` prepares runtime assets. `npm run build` then `npm run preview` serves the production build.
- Edit Markdown sources, then regenerate printable PDFs with `python scripts/build-pdfs.py` (requires ReportLab). Do not hand-edit PDFs.
- There is no lint or format script; do not add one casually.

## Toolchain and asset quirks
- `tsconfig.json` is strict with `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`: use `import type` for type-only imports, and expect unused symbols to fail the check.
- Phaser is intentionally lazy-loaded: `src/main.ts` owns the HTML menu and dynamically imports `src/game/create-game.ts` only when the player enters the preview. Do not statically import Phaser from the entry path. Vite splits it into a separate chunk; the resulting >500 kB chunk warning is expected.
- `public/assets/` is generated and Git-ignored. Never edit it. Runtime URLs are `/assets/<output>`, not `assets/` or `src/` paths.
- Only entries in `assets/runtime-manifest.json` are copied to `public/assets/`; declare each with `source`, `output`, exact `width`/`height`, and optional `frameWidth`/`frameHeight`. `npm run assets:check` rejects bad PNG signatures, changed dimensions, duplicate IDs, invalid frame grids and path escapes. It does not verify the declared `frames` count; check that manually.
- Record new source art in `assets/inventory.json` (dimensions, bytes, rights) and preserve the 55 supplied originals and the source PDFs. Derived revisions live under `assets/characters/_revisions/`.
- Vitest has no browser/DOM setup; it covers pure rules, save helpers and map collision. Phaser input, canvas rendering and menus need the manual checks in `README.md`'s Phase 0 checklist.

## Architecture
- `index.html` loads `src/main.ts`, which renders the title/controls HTML and starts Phaser on demand through `src/game/create-game.ts`. `PreviewScene` is the only playable scene; it is a movement/interaction proof, not the campaign.
- The preview collision grid and `canEnter` live in `src/game/maps/preview-room.ts`. Phase 1 campaign map data is planned for `src/content/maps/` with behavior in `WorldScene`; do not grow the preview map into the campaign implementation.
- Pure rules live in `src/game/rules.ts`; campaign state lives in `src/game/state.ts`; checkpoints, milestones and itinerary live in `src/content/campaign.ts`; local-save validation is in `src/services/local-save.ts`; the optional Supabase client factory is `src/services/supabase.ts`.
- State helpers are tested but not wired into the preview. `RunState` is schema version 1; health is campaign-global, not per scene. `enterCheckpoint` never heals, `completeMilestone` is the only in-run heal and rejects duplicates, and `restartRescue` only accepts a failed rescue. Save each validated damaging hit immediately when storage exists.
- Supabase is not connected: the migration under `supabase/migrations/` is not applied and the client makes no requests until explicitly called. Local play must remain fully offline.

## Game contracts
- Stack: Phaser 3, TypeScript, Vite; Vercel static hosting; optional Supabase saves. Desktop keyboard and mouse first; phone support is out of MVP scope.
- Exploration uses grid movement. Battle arenas use continuous movement, mouse aiming and timing. Never switch coordinate systems mid-step.
- Real Mode: two damaging hits from full health. Story Mode: half enemy health and incoming damage (25 vs 50 damage per hit at 100 health). Damage persists across encounters and scenes; only first-time named milestones heal during a run.
- Rescue failure kills K and ends the attempt. An explicit restart resets the rescue mission, restores health and clears the counter. The timed counter unlocks at Lina's shelter; a perfect dodge opens its brief firing window. No numeric levels in the campaign MVP.
- Horde progression is a separate later mode; never add it to the four-day critical path.
- Preserve source art and PDFs. Existing character sheets are interaction poses, not directional walk cycles; never present them as walk animations, and label missing art as temporary.
- Local play must work without credentials or network calls. Never put service-role/secret keys in browser code. `VITE_` values are public; a Supabase key must start with `sb_publishable_`.
- Keep dialogue, encounter tuning and milestones in content/rule files, not scattered through render code. Character IDs stay stable (`k`, `mai`, `isshin`, `lina`, etc.); display names may change.
- No new dependencies or shared-contract changes without explaining why to the task owner and following their authorization.

## Progress, git and finish
- `PROGRESS.md` is the single status record across AI tools. Update your entry after each meaningful slice, failed check, blocker or scope change, and before every final response or handoff: changed files, dated verification (or `Not run`), remaining work and the exact next action. Append a concise activity-log entry when finished.
- Re-read the tracker before saving and preserve other agents' entries. The file is not a real-time lock: separate clones synchronize only through Git, and interrupted work must be checked against the files and evidence. Do not invent commits, test results, deployments or teammate activity. Keep phase status honest: unfinished review/integration is `Ready for review`, not `Done`, and say whether work is local, branch only or integrated. `docs/TASK_BOARD.md` is the roadmap; placeholder screens do not complete a phase.
- Follow the documented branch workflow: feature branch, PR to `main`, teammate review. CI (`.github/workflows/ci.yml`) runs `npm ci && npm run check` on `main` pushes and PRs. Direct commits need the owner's authorization.
- Follow `.github/pull_request_template.md`: PROGRESS evidence, `npm run check`, phase-specific manual checks, both modes for combat/saving changes, screenshots for visual/input changes, and no credentials or generated folders. Keep commits small; never commit `node_modules/`, `dist/`, `public/assets/` or `tmp/`.
- Finish application work with `npm run check` plus the task's manual checks. Documentation-only changes need link/consistency checks, not unrelated game tests. State exactly what was tested and what was not.
