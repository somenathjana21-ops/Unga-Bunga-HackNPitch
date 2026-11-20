# WANT — Project Brief

**Use this file as shared context for AI models and new humans.** It summarizes what the project is, where it stands, and how the phases fit together. It is a snapshot, not the live tracker: for current status always check [PROGRESS.md](PROGRESS.md), and for rules the sources listed in the last section. Last updated: 14 November 2026.

---

## 1. What the project is

**WANT** is a story-led browser game about "the wrong person choosing to help." The player controls **K**, a survivor who arrives in the year 2085 at a ruined settlement and is drawn into a civilian-rescue mission where he is fundamentally out of his depth — he helps anyway, and grows through action rather than by acquiring unexplained power.

- **Authoritative script:** `Script (2).pdf` (supplied). The other two supplied PDFs (`Game_Idea_Want.pdf`, `Story_Want_.pdf`) are background only.
- **Format:** single-player, desktop keyboard + mouse, browser game. Top-down **grid-based exploration** that makes sudden transitions into **real-time battle arenas** (continuous movement, mouse aim, timing-based dodge/counter).
- **Campaign:** one complete **20–25 minute** opening-to-ending arc with **one success ending** and **two difficulties**. No numeric levels, no XP, no endless hordes in the campaign. Phone support is out of MVP scope. Horde progression is a separate later mode, never part of the four-day critical path.
- **Characters:** stable IDs `k`, `mai`, `isshin`, `lina` (etc.); display names may change. The rescue civilian is **Lina, 19**, a local courier carrying medical supplies — she has agency and no secret genetic connection to K. There is **no branch** where Lina dies and the story continues.

## 2. Tech stack and architecture

- **Game:** Phaser 3 + TypeScript + Vite. Menus are plain HTML/CSS; Phaser is lazily loaded only when the player enters the game (`src/main.ts` dynamically imports `src/game/create-game.ts`).
- **Hosting:** Vercel static build.
- **Saves:** local saves first (validated, offline-capable). Supabase is **optional** cloud auth/save — the migration is not applied and the client makes no requests until explicitly called. Never put secrets in browser code; `VITE_` values are public, a Supabase key must start with `sb_publishable_`. Local play must remain fully offline.
- **Layout highlights:**
  - `src/game/rules.ts` — pure rules (difficulty/tuning). `src/game/state.ts` — pure campaign state. `src/content/campaign.ts` — checkpoints, milestones, itinerary.
  - `src/services/local-save.ts` — save validation. `src/services/supabase.ts` — optional client factory.
  - `src/game/maps/preview-room.ts` + `src/game/scenes/PreviewScene.ts` — the current playable proof (movement/interaction only).
  - `assets/inventory.json` / `assets/runtime-manifest.json` + `scripts/prepare-assets.mjs` — reproducible asset copying. `public/assets/` is generated and Git-ignored; never edit it.
  - `docs/` — decisions, guidebook, playthrough, task board, verification.

## 3. Current status (summary — verify in PROGRESS.md)

- **Done:** Phase 0 foundation — runnable title/exploration preview, campaign-state and save helpers (tested but not wired into the preview), asset inventory and manifest pipeline, guides/PDFs, CI workflow. Last full verification: 9 November 2026 (`npm run check`, seven tests, Chromium production preview, no credentials needed).
- **Not implemented:** full story scenes, real-time combat, rescue mission, cutscenes/audio, campaign Continue UI, cloud sync, deployment. Existing character sheets are **interaction poses, not directional walk animations**; missing art must be labeled temporary.
- **In flight at snapshot time:** the ART-REV-001 character-art revision (22 revised PNGs under `assets/characters/_revisions/`, manifest/checklist/prompt-guide updates) is Ready for review and uncommitted — this working tree is not clean; see [PROGRESS.md](PROGRESS.md).
- **Working methods:** feature branch → PR → teammate review; `PROGRESS.md` is the single cross-agent status record; claim tasks in `docs/TASK_BOARD.md` before editing.

## 4. Phase map

The plan is a four-working-day delivery map (Phases 0–7) followed by optional post-campaign work.

| Phase | Work | Key contents | Depends on |
| --- | --- | --- | --- |
| **P0** | Foundation (verify and assign) | Supplied starter: title menu, exploration preview, rules/state helpers, asset pipeline. Verify on each machine, assign owners. | — |
| **P1** | Exploration world | Real campus/dorm/camp maps in `src/content/maps/`, behavior in `WorldScene` (grid movement, collisions, NPC positions, interaction triggers). **Do not grow the preview room into this.** | P0 |
| **P2** | Dialogue and opening story | `src/content/dialogue/`, `DialogueScene` — playable opening through the settlement, readable typed dialogue, skip/read paths. | P1 contract |
| **P3** | Real-time combat | `CombatScene`, `src/game/combat/` — continuous movement, bullets, telegraphs, dodge/counter windows, enemy caps, both difficulties, fair damage. | P0 |
| **P4** | Cutscenes, audio, settings | Still-image cutscene tracks, captions, mute, reduced motion, reliable skip; sound only after user gesture. | P2 IDs |
| **P5** | Rescue and ending | `src/content/encounters/`, campaign controller — complete rescue route, all failure/retry paths, milestone recovery, ending. | P1–P3 |
| **P6** | Saves and release | Local Continue UI + Vercel deployment. Optional Supabase cloud saves are **deferred** until local works. | P5 |
| **P7** | Freeze and QA | Fresh-player timed runs, issue log, release evidence. | P5/P6 |
| Later | Horde mode | Separate run state/progression in `src/game/horde/`; own guide. | Post-campaign |

**Cut order when time is tight** is documented in `docs/GUIDEBOOK.md` — cut breadth, not the rescue.

## 5. Commands and verification

- **Node 24 LTS** (`.nvmrc`; `engines` floor 22.12). Install with `npm ci` from the committed lockfile.
- **`npm run check` is the required gate for any application change:** asset validation, strict TypeScript, Vitest, then a production build. `prebuild`/`predev` copy runtime assets first.
- **Tests:** `npm test` runs all tests (Vitest). One file: `npm test -- tests/rules.test.ts`; one case: add `-t "case name"`.
- **Run:** `npm run dev` starts Vite on `127.0.0.1`; `npm run build` then `npm run preview` serves the production build.
- **PDFs:** edit the Markdown sources, then regenerate with `python scripts/build-pdfs.py` (needs ReportLab). Never hand-edit PDFs.
- Toolchain versions: Phaser 3.90, TypeScript 5.9, Vite 8, Vitest 5, `@supabase/supabase-js` (installed but never called until explicitly wired).
- There is **no lint or format script** — do not add one casually.

## 6. Toolchain and asset quirks

- `tsconfig.json` is strict with `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`: use `import type` for type-only imports; unused symbols fail the check.
- Phaser is **lazily loaded**: `src/main.ts` owns the HTML menu and dynamically imports `src/game/create-game.ts` only when the player enters the preview. Never statically import Phaser from the entry path. The >500 kB chunk warning in builds is expected.
- `public/assets/` is **generated and Git-ignored — never edit it**. Runtime URLs are `/assets/<output>`, not `assets/` or `src/` paths.
- Only entries in `assets/runtime-manifest.json` are copied; each declares `source`, `output`, exact `width`/`height`, optional `frameWidth`/`frameHeight`. `npm run assets:check` rejects bad PNG signatures, changed dimensions, duplicate IDs, invalid frame grids and path escapes — but does **not** verify the declared `frames` count; check that manually.
- Record new source art in `assets/inventory.json` (dimensions, bytes, rights). **Preserve the 55 supplied originals and the source PDFs**; derived revisions live under `assets/characters/_revisions/`.
- Vitest has no browser/DOM setup — it covers pure rules, save helpers and map collision only. Phaser input, canvas rendering and menus need the manual checks in [README.md](README.md)'s Phase 0 checklist.

## 7. Game contracts (do not break)

- Exploration uses grid movement; battle arenas use continuous movement, mouse aiming and timing. Never switch coordinate systems mid-step.
- **Damage:** Story Mode halves enemy health and incoming damage (25 vs 50 per hit at 100 health); Real Mode kills K in two damaging hits from full health. Wounds persist across fights and scenes. Enemy speed, counts and attack patterns are identical across difficulties.
- **Healing:** `RunState` is schema version 1 with campaign-global health. `enterCheckpoint` never heals; `completeMilestone` is the only in-run heal and rejects duplicates (shipped milestone: `girl-rescued`); no passive, food, scene-load or kill healing. Save each validated damaging hit immediately when storage exists.
- **Rescue stakes:** a failed rescue kills K and ends the attempt. Game Over offers an explicit restart of the rescue mission that restores health and clears the counter — the entire opening need not replay. The timed counter unlocks at Lina's shelter; a narrow successful dodge opens its brief firing window (same attack control on the next click).
- **Controls:** exploration WASD/arrows + `E` to interact; combat WASD, mouse aim, left click fire/counter, Space dodge (no dodging through solid walls); Esc pauses in the finished campaign.
- Local play must remain **fully offline** — no credentials or network calls. Never put service-role/secret keys in browser code; `VITE_` values are public and a Supabase key must start with `sb_publishable_`. Cloud saves are an explicit, optional passwordless email sign-in, only after local play works.
- Keep dialogue, encounter tuning and milestones in content/rule files, not scattered through render code. Character IDs stay stable (`k`, `mai`, `isshin`, `lina`, …); display names may change.
- No numeric levels or XP in the campaign MVP; horde progression is a separate later mode (`src/game/horde/`), never on the four-day critical path.
- Character sheets are interaction poses, **not directional walk cycles** — never present them as walk animations, and label missing art as temporary.
- No new dependencies or shared-contract changes without explaining why to the task owner and following their authorization.

## 8. Progress, git and finish

- [PROGRESS.md](PROGRESS.md) is the single cross-agent status record. Claim a concrete task there (agent/session, human owner, branch/worktree, owned files, acceptance criteria) before changing implementation files; update after each meaningful slice, blocker or scope change and before every handoff. Preserve other agents' entries — separate clones synchronize only through Git.
- Agreed game-rule changes go in [docs/DECISIONS.md](docs/DECISIONS.md) first. Unfinished review/integration is `Ready for review`, not `Done`; always say whether work is local, branch-only or integrated.
- Workflow: feature branch → PR to `main` → teammate review. CI (`.github/workflows/ci.yml`) runs `npm ci && npm run check` on `main` pushes and PRs. Direct commits need the owner's authorization.
- Follow `.github/pull_request_template.md`: progress evidence, `npm run check`, phase-specific manual checks, **both modes** for combat/saving changes, screenshots for visual/input changes, and no credentials or generated folders. Keep commits small; never commit `node_modules/`, `dist/`, `public/assets/` or `tmp/`.
- Finish application work with `npm run check` plus the task's manual checks; documentation-only changes need link/consistency checks, not unrelated game tests. Always state exactly what was tested and what was not.

## 9. Where to look (sources)

| Source | What it holds |
| --- | --- |
| [PROGRESS.md](PROGRESS.md) | Live status, task claims, handoffs, activity log — read first, always |
| [docs/DECISIONS.md](docs/DECISIONS.md) | The agreed game rules and their change policy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layout, ownership and state boundaries |
| [docs/GUIDEBOOK.md](docs/GUIDEBOOK.md) | Phase-by-phase build guide, including what to cut when time is tight |
| [docs/PLAYTHROUGH.md](docs/PLAYTHROUGH.md) | Approved story direction and connective dialogue |
| [docs/TASK_BOARD.md](docs/TASK_BOARD.md) | Roadmap and role ownership |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | Dated test and release evidence |
| [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) | Four-person split, branch and review process |
| [docs/COMBAT_DESIGN.md](docs/COMBAT_DESIGN.md) | Combat scene design |
| [docs/ASSET_CHECKLIST.md](docs/ASSET_CHECKLIST.md) | Asset audit and production gaps |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel and Supabase setup |
| [docs/OPTIONAL_HORDE_GUIDE.md](docs/OPTIONAL_HORDE_GUIDE.md) | Later horde/leveling mode |
| [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) | Contributor and agent entry instructions |
| [README.md](README.md) | Setup and the Phase 0 manual checklist |
| [WANT-Asset-Generation-Prompts.md](WANT-Asset-Generation-Prompts.md) | Copy-ready asset generation prompt pack |
| `Script (2).pdf` | **Authoritative script.** `Game_Idea_Want.pdf` and `Story_Want_.pdf` are background only. |
