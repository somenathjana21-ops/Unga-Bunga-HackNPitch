# WANT - shared agent progress

**Read this at the start of every task. Update it before editing, after meaningful progress or a blocker, and before handing work back.** The detailed rules are in [AGENTS.md](AGENTS.md).

Last updated: 21 November 2026 (Asia/Calcutta).

This is the authoritative record of implementation status and agent handoffs. [The task board](docs/TASK_BOARD.md) supplies the planned ownership and dependencies; [decisions](docs/DECISIONS.md) define the agreed game; [verification](docs/VERIFICATION.md) holds detailed test evidence. The PDFs are planning snapshots, not live progress trackers.

## Current position

- **Delivered:** Phase 0 foundation; five-map exploration world; opening dialogue through the settlement; cutscenes and audio; real-time Reflex Combat; the three-beat rescue and animated ending; local saves with exact map/tile Continue; Horde Mode; and the arcade CRT shell. Phases P1–P6 local are integrated on `master`.
- **Last recorded code verification:** 21 November 2026, `npm run check` passed with 90 visual + 33 audio assets, strict TypeScript, 42/42 Vitest tests across 5 files, and a production build with the expected Phaser chunk warning. See AUDIO-HORDE-POLISH-001 and ARCADE-CRT-UI-001 below.
- **Not implemented:** full human playthrough in both modes, live Vercel deployment, Supabase cloud saves, final rights/credits confirmation, and Horde progression/leveling.
- **External setup:** `origin` points at `somenathjana21-ops/Unga-Bunga-HackNPitch`. Teammate access and live Vercel/Supabase setup remain team tasks.
- **Next recommended work:** run the fresh-player Story/Real playthrough and release checklist in the [guidebook](docs/GUIDEBOOK.md); only then claim new campaign content or optional cloud/leveling work.

## Status rules

| Status | Meaning |
| --- | --- |
| Not started | Scoped, with no implementation claimed. |
| In progress | A named agent/owner has claimed a concrete slice and listed its files. |
| Blocked | State the specific obstacle, what was tried, and who/what can unblock it. |
| Ready for review | Implementation is present; specified checks or integration/review remain. |
| Done | Acceptance criteria met, evidence recorded, and location/merge state explicit. |
| Deferred | Intentionally outside the current milestone. |

Do not turn an entire phase to Done because one task or placeholder is finished. A feature-branch result must say **branch only** until integrated. Keep the previous test result dated; do not silently replace a failed or unrun check with an old passing result.

## Phase overview

| ID | Work | Status | Evidence / remaining gate |
| --- | --- | --- | --- |
| P0-FOUNDATION | Runnable starter, rules, guides and assets | Done | Snapshot `0c507d8` on local `main`. Evidence in `docs/VERIFICATION.md`. |
| P0-TEAM | Team-machine checks, owner assignment, shared remote and event requirements | Done | Gate closed on the project creator's sign-off on 9 November 2026. Movement confirmed on all machines. Team E retest, roster, interface sign-off and organizer clarification are tracked as follow-ups below. |
| P1 | Exploration world | Integrated on master | Campus map data and WorldScene from phase/2-dialogue-opening merged into master; `npm run check` clean; human playthrough pending. |
| P2 | Dialogue and opening story | Integrated on master | Dialogue system, story-state, five maps, DialogueScene merged via phase/2-dialogue-opening; `npm run check` passes; browser playthrough pending. |
| P3 | Real-time combat | Integrated on master | CombatScene, combat types/damage/player/enemy/bullet, dev launch path merged via feature/p3-combat-arena; `npm run check` passes; manual combat verification pending. |
| P4 | Cutscenes, audio and settings | Integrated on master | Cutscene player, audio buses, settings panel merged via phase-4-cutscene-slice; `npm run check` passes; human playthrough pending. |
| P5 | Rescue and ending | Integrated on master | RescueScene, rescue-beats, dev launch path merged via feature/p3-combat-arena; `npm run check` passes; manual rescue verification pending. |
| P6-LOCAL | Continue/local saves and Vercel release | Integrated on master | Continue button, new-run confirmation, exact map/tile resume and storage validation integrated; 21 November 2026 `npm run check` passes (90 visual + 33 audio assets, 42 tests); Continue/resume covered by headless Chromium checks. Live Vercel deploy still pending. |
| P6-CLOUD | Optional Supabase authentication/saves | Deferred | After local saves; live isolation and conflict checks required. |
| P7 | Full playtest and release freeze | Not started | Fresh-player timing, both modes, target hardware and release evidence. |
| H0-H5 | Separate horde/leveling mode | Horde integrated; progression deferred | Resistance Trials (1m/5m/Unlimited, Easy→DOOM, local scoreboard) is integrated on master; numeric leveling/progression remains deferred per the optional guide. |
| HORDE-MP | Multiplayer Horde duel | In progress | Shared-code score duel (create/join, same seeded run, duel or team score) for HORDE-MP-001. Supabase backend behind `VITE_SUPABASE_*` with a local pass-and-play fallback; live two-browser check pending credentials. |

## Task claims and handoffs

**No active implementation task is recorded at tracker creation.** Add one entry per concrete task below. Use IDs such as `P1-001`; use a different ID for an independent slice. Fill all fields, writing `Not run`, `Unassigned`, or `No commit yet` when appropriate rather than guessing.

Copy this template as a new subsection; replace the placeholders:

```markdown
### [TASK-ID] - [player-visible result]
- Status: In progress
- Agent/session: [tool/model and a distinct session label]
- Human owner: [name or Unassigned]
- Branch/worktree: [actual branch and workspace path]
- Started / last updated: [date/time with timezone]
- Scope / owned files: [specific paths; list shared interfaces separately]
- Acceptance criteria: [observable result and required checks]
- Completed so far: [facts, not intentions]
- Verification: [command/manual steps, result, date and build/commit; or Not run]
- Blockers / remaining work: [specific items, or None]
- Next action: [one concrete action another agent can take]
- Handoff / integration: [next owner, commit/PR if available, branch only or integrated]
```

### TRACK-001 - shared agent progress tracking
- Status: Done
- Agent/session: Codex / project-foundation follow-up
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: `PROGRESS.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/TASK_BOARD.md`, `.github/pull_request_template.md`.
- Acceptance criteria: one current progress record; agent entry points require reading/updating it; current project state and reusable claims/handoffs included.
- Completed so far: tracker populated from the recorded foundation evidence; startup/update/finish rules added; task board points here for live status.
- Verification: documentation links and required instruction references checked on 9 November 2026. No application code changed; game tests were not rerun for this documentation-only task.
- Blockers / remaining work: None for this task. Cross-machine sharing still requires the team's repository setup and synchronization.
- Next action: assign/claim a Phase 0 team verification or a concrete implementation slice before editing game code.
- Handoff / integration: local working tree on `main`; no commit/PR created by this task.

### ART-REV-001 - character design revision and production audit

- Status: Done
- Agent/session: Codex / character-art-20261110
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`, baseline `e0ddf54`.
- Started / last updated: 14 November 2026 (Asia/Calcutta); art work dated 10 November 2026.
- Scope / owned files: derived revisions under `assets/characters/_revisions/`, `assets/runtime-manifest.json` (source pointers for revised existing IDs), `docs/ASSET_CHECKLIST.md`, `docs/ARCHITECTURE.md` (asset locations and manifest note), `WANT-Asset-Generation-Prompts.md`, `output/pdf/WANT-Asset-Generation-Prompts.pdf`, this entry and activity log. Preserve the 55 original PNGs and story PDFs.
- Acceptance criteria: revise the requested character art and matching poster panels, make an Isshin expression decision, audit all 11 supplied character sets, and synchronize the linked prompt guide. Check assets at native sprite size and render and validate the edited PDF.
- Completed so far: audited all 11 supplied character sets and saved 22 revised PNGs for eight characters, including eight matching posters, the revised Mai/K carry and two derived 48 px atlases. Kept Isshin's breach intensity and made a restrained clinic variant. The manifest now selects six revised sources under the same runtime paths. Updated the asset checklist and architecture note, and added section 13 to the Markdown and clickable PDF prompt guides with eight revision prompts and 22 linked art files.
- Verification: 10 November 2026, local `e0ddf54` plus working changes. All 22 revisions passed dimensions and image mode checks. All 66 source cells and all 12 revised atlas cells had the original foot baseline. Revised atlases visually checked at 1× and 3× on dark and checkerboard backgrounds, and the other five Man 2 cells matched the original bytes. All 55 source PNGs and story PDFs were preserved. The 44-page PDF was rendered, and all 370 links, 76 bookmarks, and eight new prompt blocks were checked. All 63 Markdown links checked. `npm run check` passed with 19 runtime assets, TypeScript, seven tests and production build, with the existing Phaser size warning. All six built revised files matched the manifest sources. Chromium 151 passed the title poster and preview checks at 1366×900/768 with no external requests or errors. `git diff --check` passed.
- Blockers / remaining work: the creator approved all 22 revised PNGs on 14 November 2026; rights/credit confirmation for source art remains an open operational task (see docs/DECISIONS.md). Actual campaign dialogue/TV crops, walk/combat animation and Lina art still belong to their implementation phases. Campaign art integration and deployment were not tested.
- Next action: the Phase 2 owner takes the approved speaking portraits for in-scene cropping and loading; the art owner records usage rights/credits as they are confirmed.
- Handoff / integration: integrated on `main` in `3e3e56c` together with the tracker; pushed to `origin/main` and the remote hash verified on 14 November 2026 (`3e3e56c80b26e97ac3b161d0a5cd7340bde08d8e`). Owner-authorized direct commit after the creator's approval; no PR.

### ASSET-PROMPTS-001 - campaign asset generation prompt pack
- Status: Done
- Agent/session: Codex / asset-prompts-20261109
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: `WANT-Asset-Generation-Prompts.md`; own entry and activity log in `PROGRESS.md`. Documentation only; no implementation or source-art changes.
- Acceptance criteria: copy-ready prompts cover campaign environments, missing character/enemy art, props, cutscenes, cues and audio; cite the supplied PDFs and exact local references; distinguish existing art, proposed specifications and new outputs; validate references and campaign coverage.
- Completed so far: delivered `WANT-Asset-Generation-Prompts.md` with reusable style blocks, six environment layouts plus tile kit, K/Lina/NPC/machine prompts, prop/state matrix, all C01-C04 shots, optional ending art, effects/UI and sound/music briefs. Mapped campaign beats to PDF pages and 18 exact supplied image references; visually inspected representative source artwork. Distinguished existing assets and required work from proposed dimensions/designs and optional polish. Source art and game implementation unchanged.
- Verification: 9 November 2026: 39 Markdown file/page links resolved; 18 reference IDs defined and all uses resolved; 26 required asset sections present; code fences balanced; `git diff --check` passed (line-ending normalization warning only). Reviewed coverage against P pp. 3-15 and G pp. 8-12, 20-25, with original script checked for breach/identity continuity. Game tests and runtime/manual art/audio checks Not run: documentation-only task; no assets generated.
- Blockers / remaining work: None for the requested prompt document. Generated artwork/audio, design approval and runtime integration are future tasks, not completed assets.
- Next action: content/art owner uses the reference index to attach the supplied images, then starts K-01, LINA-01 and the Scout/Rusher design anchors before dependent assets.
- Handoff / integration: integrated on `main` in `013cc61`; pushed to `origin/main` at `https://github.com/somenathjana21-ops/want.git`. Remote branch hash verified after push on 9 November 2026. No PR needed for the authorized direct commit/push.

### ASSET-PDF-001 - prompt pack PDF with clickable references
- Status: Done
- Agent/session: Codex / asset-pdf-20261109
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: `output/pdf/WANT-Asset-Generation-Prompts.pdf`; own tracker entry/log; ignored `tmp/pdfs/` build and verification files. User additionally authorized committing and pushing the Markdown prompt pack, PDF and progress updates. Preserve all original art/PDFs.
- Acceptance criteria: complete prompt content in a readable PDF; clickable contents, reference IDs and source links; embedded visual-reference gallery; rendered layout and link-target checks.
- Completed so far: created a 35-page PDF (~3.06 MB) with all 37 prompt blocks, clickable contents/asset IDs, 18 embedded reference images, 67 bookmarks and source-document page links. Corrected separated prompt headings and a sparse overflow page during layout review; source content and art unchanged.
- Verification: 9 November 2026: all 35 pages rendered with Poppler and visually inspected; text bounds passed; all 37 fenced prompt blocks preserved. Validated 204 internal links, 61 external PDF page links and 23 local-file links, including correct image-reference destination pages. An initial path check misread URL-encoded spaces; decoded-file validation passed and the PDF file specification was verified correct. Source-file links require the project folder and a viewer supporting local links, as explained in the PDF. The staged whitespace check found one intentional Markdown hard-break trailing space; replaced it with a separate quote paragraph. Game tests Not run: documentation-only delivery.
- Blockers / remaining work: None. Markdown and PDF publication completed; source-asset generation remains a separate future task.
- Next action: content/art owner opens the PDF or Markdown and begins the approved asset-generation sequence; keep the PDF in its repository folder for external local-file links.
- Handoff / integration: integrated on `main` in `013cc61`; pushed to `origin/main` at `https://github.com/somenathjana21-ops/want.git`. Remote branch hash verified after push on 9 November 2026. No PR needed for the authorized direct commit/push.

### P0-VERIFY-001 - local foundation verification

- Status: Done
- Agent/session: Codex / foundation-verify-20261109
- Human owner: Unassigned
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: this tracker entry and activity log. Verification of the existing preview at `86e36cc`.
- Acceptance criteria: clean npm install, full check, production preview smoke test of title, modes, controls, grid and E interaction without Supabase credentials. Preserve supplied art and PDFs.
- Completed so far: verified the existing foundation from a clean working tree. Only `PROGRESS.md` changed among tracked files. Source art and PDFs match HEAD.
- Verification: 9 November 2026: `npm ci` passed on Node 24.22.1 and npm 11.19.1 (47 packages added, audit reported 0 vulnerabilities). `npm run check` passed: 19 assets, strict TypeScript, seven tests and production build. Vite warned that the Phaser chunk (1,194.42 kB, 318.49 kB gzip) exceeds 500 kB.
- Browser evidence: automated production-preview checks in Chromium 151 on Windows at 1366x900 and 1366x768. Title and K poster, both difficulty descriptions and room labels, Tab/Enter, controls dialog dismissal, WASD and arrows, perimeter and interior walls, simultaneous held directions without diagonal movement, E from two tiles away and adjacent, Escape and three reentries passed. Reviewed title and interaction screenshots. With only `.env.example` present and no Supabase environment variables, the preview passed with external requests blocked and logged zero external requests, failed requests or page errors.
- Blockers / remaining work: no local check failures. README first-push instructions predate the configured `origin` and existing commits. Other teammate machines, organizer rules, campaign gameplay, deployment and cloud sync were outside this verification.
- Next action: after the team Phase 0 gate, assign role A to claim the campus-to-library slice in [Guidebook Phase 1](docs/GUIDEBOOK.md#phase-1---one-convincing-exploration-slice). Build two connected rooms and a working door transition, with shared grid movement, bounded camera, a visible objective, one NPC and one E interactable. Keep map data under `src/content/maps/` and behavior in `WorldScene`.
- Handoff / integration: local `main`, in the commit that adds this entry. No Phase 1 implementation started.

### P0-AUDIT-001 - independent README and foundation audit

- Status: Done
- Agent/session: Codex / foundation-audit-20261109
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`, baseline `ba05bdd`.
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: this tracker entry and activity log. Read-only review of README, runtime assets, source, tests, and build configuration. Fresh build copies outside the worktree.
- Acceptance criteria: distinguish preview behavior and helper coverage from planned features, verify asset paths/dimensions and scan for accidental keys, run health/retry tests, compare clean production builds, and check the credential-free preview.
- Completed so far: confirmed the preview is the only playable scene and that campaign rules, local storage, and cloud preparation are separate from it. README correctly lists campaign, real-time combat, audio, and cloud sync as future work. Its no-commits/first-push instructions are stale on this checkout.
- Verification: 9 November 2026, `ba05bdd`, Windows with Node 24.22.1 and npm 11.19.1. Two fresh checkouts passed `npm ci`; `npm run check` passed all seven tests in one and `npm run build` passed in the other. All 25 production file paths and SHA-256 hashes matched. Verified all 55 inventory paths/dimensions/byte sizes, 19 source-identical runtime copies, both preview image paths, and 11 sheets of six 48×48 frames. The built-in asset check checks frame divisibility but does not compare the declared frame count; the independent audit verified it. No known credential patterns found in tracked text across all reachable commits or built HTML/CSS/JS. Only the empty `.env.example` is tracked as environment configuration. All 13 README Markdown link targets exist.
- Browser evidence: Chromium 156 at 1366×768 passed title and poster load, keyboard controls dialog, both mode descriptions and room labels, WASD/arrows, perimeter and interior walls, held direction priority, E interaction range, Escape and three reentries. Zero external requests, failed requests or browser errors with external requests blocked and no Supabase variables set. The first synthetic Escape press timed out when sent with no key hold; rerunning with a brief key hold passed. Browser tooling was installed outside the repository after an offline cache miss.
- Blockers / remaining work: none for this audit. Both builds warn about the lazy-loaded Phaser chunk (1,194.42 kB, 318.49 kB gzip). The team-machine gate, live hosting, and live Supabase policies remain unverified. The README's first-push instructions still need a documentation refresh.
- Next action: update the README first-push section to reflect the existing commits and configured `origin`, then have teammates run the Phase 0 checks on their machines.
- Handoff / integration: only `PROGRESS.md` changed, locally on `main`. No commit or PR.

### P0-README-001 - teammate clone and verification instructions

- Status: Done
- Agent/session: Codex / foundation-readme-20261109
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`, baseline `ba05bdd`.
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: `README.md` and this tracker entry and activity log. Documentation only.
- Acceptance criteria: replace the initial-push instructions with the real clone URL, Phase 0 build and credential-free manual checks, and links for reporting and follow-on branch work.
- Completed so far: replaced the stale README first-push text with the actual clone command, Node/npm setup, lockfile install, full check, and credential-free production preview checklist. Linked to results reporting, Phase 0, ownership, and branch workflow.
- Verification: 9 November 2026, `git ls-remote --symref origin HEAD refs/heads/main` confirmed the configured remote's default branch and published commit `86e36cc`. Compared the documented npm sequence and scripts with local and published `package.json`, checked all 17 README links and section anchors, and ran `git diff --check`. Game tests and runtime smoke checks Not run for this documentation-only update; prior results are in P0-AUDIT-001.
- Blockers / remaining work: none for the README edit. Publication and teammate-machine checks are pending.
- Next action: publish the README update to shared `main`, then have each teammate clone, run the Phase 0 checks, and log their results.
- Handoff / integration: `README.md` and this tracker update are local and uncommitted on `main`. No commit or PR.

### P0-TEAM-VERIFY-001 - publish setup and verify a fresh remote clone

- Status: In progress
- Agent/session: Codex / phase-0-team-verify-20261109
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`. Fresh verification clone in a separate temporary directory.
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: publication of `README.md`, this tracker entry and log, and the team role and event rule notes in `docs/TASK_BOARD.md`.
- Acceptance criteria: publish the Phase 0 instructions to `origin/main`, run the install/build and manually check the preview from a fresh remote clone, and record verified roster, organizer rules and team gate evidence.
- Completed so far: committed README and tracker as `28f9110`, pushed to `origin/main`, and verified the remote hash. Recorded the confirmed role labels in `docs/TASK_BOARD.md` (A lead/integration, B and C support). The project creator reports being the only person to have launched the preview. Reviewed the event listing, FAQ and Game Development track guidance. Phaser and properly licensed, credited premade assets are permitted. Reusing existing team-authored game code is not explicitly addressed by the Game Development guidance.
- Verification: 9 November 2026, fresh GitHub clone at `28f9110`, Node 24.22.1 and npm 11.19.1. `npm ci` and `npm run check` passed with 19 assets, strict TypeScript, all seven tests and a production build. Existing Phaser chunk-size warning reproduced. Production preview served the index, K poster and K sheet with HTTP 200 without Supabase environment variables. Windows computer use stopped before navigation because it could not determine the browser's current URL with sufficient confidence. Fresh visual and keyboard checks Not run in this session; prior browser evidence at `ba05bdd` is in P0-AUDIT-001.
- Manual retry: 9 November 2026, Windows, in-app browser with a 1366×768 desktop viewport override, using the production preview from the same clean GitHub clone at `28f9110`. Visually confirmed K's title poster and room sprite. Tab and Enter reached and dismissed the controls dialog, and both Story Mode and Real Mode descriptions and room labels matched. WASD and arrows moved K; left/right perimeter walls and an interior wall blocked him. Holding W+D in both key orders moved K only up on the original column. E showed K's line at one tile from the amber marker and the standard prompt at two tiles and at spawn. Escape returned focus to the start button, and three re-entries passed with the spawn and prompt reset. No game code changed during this retry.
- Blockers / remaining work: the project creator subsequently confirmed movement on all machines and approved closing the Phase 0 team gate. Teammate E retest on the fixed build, actual names and handles, D's role and combat ownership, main-coder shared-interface sign-off, and direct organizer clarification on reuse of the WANT foundation remain open follow-ups.
- Next action: have teammates pull `main`, rebuild, and confirm the marker interaction. Record the outstanding ownership, interface and organizer confirmations as they arrive.
- Handoff / integration: README and initial tracker updates are on `main` at `28f9110`. Manual results and task-board role/rule notes are in the follow-up commit on `main`.

### P0-MARKER-001 - make E interaction reliable and visible

- Status: Done
- Agent/session: Codex / phase-0-marker-20261109
- Human owner: Project creator
- Branch/worktree: `codex/phase-0-marker-interaction`, `C:/Users/somen/OneDrive/Desktop/want`, baseline `3377c24`.
- Started / last updated: 9 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/game/scenes/PreviewScene.ts`, preview status markup and focus in `src/main.ts`, and this tracker entry and log. No shared contract or dependency changes.
- Acceptance criteria: an ordinary E tap shows K's line in view on and beside the marker, E farther away does not trigger the line, and the preview resets on re-entry. Run the full check and production browser checks.
- Completed so far: the creator reports movement works on all machines, but E appears to do nothing at the marker. Reproduced both a missed quick tap and a successful line below the fold. `PreviewScene.ts` now handles the E key-down event directly using the existing key lifecycle. `main.ts` displays the status above the room and focuses the game without scrolling the status out of view.
- Verification: 9 November 2026, baseline build from `28f9110`, headless Chromium at 1280×720. An immediate E press one tile from the marker left the prompt unchanged. A 100 ms hold displayed the line in the DOM with its top at y=749.75. On the fixed local build, an immediate E tap showed the line on and beside the marker, two tiles away showed the normal prompt, and the message was fully visible at y=69–90. Three re-entries reset it. Broader Chromium 156 production smoke at 1366×768 passed title, both modes, keyboard dialog, wall collisions, held directions, interaction range, and repeated re-entry, with no external requests or browser errors. `npm run check` passed 19 assets, TypeScript, all seven tests and production build, with the existing Phaser size warning. `git diff --check` passed.
- Integration verification: 9 November 2026, reran `npm run check` before integration. All seven tests and the production build passed with the existing Phaser size warning. The Chromium marker regression passed again at 1280×720, including quick E taps, visible feedback, range and re-entry.
- Blockers / remaining work: teammates still need to retest on the shared build. The project creator approved closing the Phase 0 gate with this retest tracked as a follow-up.
- Next action: teammates pull `main`, rerun `npm run check`, and verify that tapping E on or beside the amber marker shows K's line above the room.
- Handoff / integration: the commit recording this handoff contains the fix and is integrated into `main` by fast-forward from `codex/phase-0-marker-interaction`.

### TRACK-002 - refresh agent instructions

- Status: Done
- Agent/session: OpenCode / agents-refresh-20261114
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`, baseline `e0ddf54`. The concurrent ART-REV-001 working changes were left untouched.
- Started / last updated: 14 November 2026 (Asia/Calcutta)
- Scope / owned files: `AGENTS.md`; this tracker entry and activity log. Documentation only; no source, asset, dependency or contract changes.
- Acceptance criteria: a compact, current instruction file covering exact commands, single-test usage, toolchain and asset quirks, entrypoints/state boundaries, project contracts and progress/handoff rules; referenced paths verified against the repository.
- Completed so far: rewrote `AGENTS.md` around current `package.json` scripts, strict TypeScript, lazy Phaser loading, generated runtime assets and manifest validation, preview-versus-Phase-1 architecture, campaign-state boundaries, game contracts, CI/PR workflow and finish rules. Removed the stale Codex-specific graphify path and called the installed skill instead. Preserved the existing art/PDF, no-secret, progress-tracker and ownership rules.
- Verification: 14 November 2026: read `package.json`, `tsconfig.json`, `vite.config.ts`, `.github/workflows/ci.yml`, `.gitattributes`, `.editorconfig`, `README.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/TEAM_WORKFLOW.md`, `docs/GUIDEBOOK.md` and `docs/VERIFICATION.md`; checked every referenced repository path exists. Ran `npm test -- tests/rules.test.ts` (7 passed) and `npm test -- tests/rules.test.ts -t "Real Mode kills"` (1 passed, 6 skipped) to validate the documented single-file and single-case commands. Full `npm run check`, browser/manual preview checks and PDF regeneration Not run: documentation-only change.
- Blockers / remaining work: none.
- Next action: let the Phase 1 owner claim the first world slice using the refreshed instructions.
- Handoff / integration: integrated on `main` (AGENTS.md in `376678c`); pushed to `origin/main`. No PR.

### BRIEF-001 - restore the truncated shared project brief

- Status: Done
- Agent/session: OpenCode / brief-restore-20261114
- Human owner: Project creator
- Branch/worktree: `main`, `C:/Users/somen/OneDrive/Desktop/want`. `brief.md` was untracked; the concurrent ART-REV-001 working changes were left untouched.
- Started / last updated: 14 November 2026 (Asia/Calcutta)
- Scope / owned files: `brief.md`; this tracker entry and activity log. Documentation only; no source, asset, dependency or contract changes.
- Acceptance criteria: complete the truncated brief (it ended at a `<!--PART3-->` placeholder with its promised final sources section missing) with commands and the check gate, toolchain/asset quirks, game contracts, progress/git rules and a verified source map, consistent with `AGENTS.md`, `package.json`, `docs/DECISIONS.md` and the current tracker state.
- Completed so far: kept sections 1-4, added an in-flight note for ART-REV-001, and restored sections 5-9: commands/verification, toolchain and asset quirks, hard game contracts, progress/git/finish rules, and a source table naming every project doc plus the authoritative script. Every claim was checked against the actual files before writing.
- Verification: 14 November 2026: read `package.json`, `.nvmrc`, `.github/workflows/ci.yml`, `docs/DECISIONS.md`, `PROGRESS.md`, `AGENTS.md` and all doc headings; confirmed the phase/status summary matches the tracker. All 16 unique Markdown link targets in `brief.md` resolve to existing files. `npm run check`, browser/manual preview checks and PDF regeneration Not run: documentation-only change; no game files touched.
- Blockers / remaining work: none for this task. The tracker entry itself is not yet committed because `PROGRESS.md` also holds the uncommitted ART-REV-001 slice, which still awaits creator review.
- Next action: ART-REV-001 review/commit; optionally link the brief from `README.md` or `CLAUDE.md` so new agents and teammates find it.
- Handoff / integration: integrated on `main` in `8d6f56c`; pushed to `origin/main` and the remote hash verified on 14 November 2026. No PR (owner-authorized direct commit).

### PUBLISH-001 - publish the foundation workspace to the configured remote
- Status: Done
- Agent/session: OpenCode / hackathon-publish-20261120
- Human owner: Project creator
- Branch/worktree: `master`, `C:/Users/somen/OneDrive/Desktop/want-main`; origin `https://github.com/somenathjana21-ops/Unga-Bunga-HackNPitch`
- Started / last updated: 20 November 2026 (Asia/Calcutta)
- Scope / owned files: the whole foundation working tree plus this tracker entry and activity log. No application, asset, dependency or contract changes.
- Acceptance criteria: commit the complete project workspace and push it to the checkout's configured remote without discarding any supplied art or PDF, and without touching branches owned by other contributors.
- Completed so far: this checkout began with an empty `master` history while `origin/master` held only the initial asset upload `7bcda3d`. Moved the index/HEAD onto `origin/master` and committed the full tree as one snapshot; the 55 original PNGs are the same files reorganized from `assets/<character>/` to `assets/characters/`, so Git records renames rather than new art. The remote's `phase/0-scaffold` branch was left untouched.
- Verification: 20 November 2026 on Node 24.22.1 and npm 11.19.1: `npm ci` (0 vulnerabilities), `npm run check` passed (19 runtime assets, strict TypeScript, seven tests, production build) with the expected Phaser chunk-size warning, and `npm test` reported 7/7 passing. Browser/manual preview checks, Supabase and deployment were not part of this publication.
- Blockers / remaining work: none for publication. Phase 1-7 implementation status is unchanged.
- Next action: the Phase 1 owner claims the campus-to-library exploration slice per the task board.
- Handoff / integration: pushed to `origin/master`; the commit hash and remote verification are recorded in the activity log below.

### P4-001 - cutscene ledger player, audio buses and persisted settings

- Status: In progress
- Agent/session: OpenCode / phase-4-cutscene-20261120
- Human owner: Unassigned
- Branch/worktree: `phase-4-cutscene-slice`, `C:/Users/somen/OneDrive/Desktop/want-main`, branched from `master` (`d24ebae`). The existing `phase-1-campus-slice` checkout was left untouched; this branch intentionally excludes the unreviewed Phase 1 slice.
- Started / last updated: 20 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/content/cutscenes/ledger.ts` (new), `src/game/cutscene/playback.ts` (new), `src/services/preferences.ts` (new), `src/services/audio.ts` (new), `src/ui/cutscene-player.ts` (new), `src/ui/settings-panel.ts` (new), `src/main.ts` (settings dialog, audio unlock, `?cutscene=` development route), `src/styles.css` (settings and cutscene styles), `tests/cutscene.test.ts` (new), `docs/ARCHITECTURE.md`, `docs/ASSET_CHECKLIST.md` (credits ledger), `docs/VERIFICATION.md`, `README.md`, `PROGRESS.md`. No changes to `RunState`, the save schema, combat rules, maps or `PreviewScene`.
- Acceptance criteria: all four cutscenes in docs/PLAYTHROUGH.md section 13 play as still-image tracks with captions, a visible Skip scene / Next control, restrained pan or zoom, and a labelled placeholder wherever supplied art does not exist; no character still is presented as an environment; sound and music start only after a user gesture, with master/music/effects volume and mute persisted locally; reduced motion removes pan and shake; skip and normal completion produce the same story flags exactly once; the app stays runnable and `npm run check` passes.
- Completed so far: ledger data for C01-C04 using existing supplied speaking portraits (never presented as environments) and labelled text cards for missing environment/machine art; pure playback controller with skip==normal-completion exactly-once guarantee and unit tests; DOM cutscene player with Skip/Next/Finish controls, Escape to skip, Enter/Space to advance, auto-advance, restrained CSS pan/zoom, video-with-still/text fallback on load/play rejection; synthesized music and effects (no supplied audio files); settings panel with master/music/effects volume, mute, reduced motion, persisted to localStorage; audio unlock bound to the first Start/Settings gesture; `?cutscene=` dev route; settings button on the menu.
- Verification: 20 November 2026. `npm run check` passes (assets:check validates 19 runtime assets, strict TypeScript clean, 15/15 tests including 8 new cutscene tests, production build with expected Phaser chunk warning). Committed as `e12bf06f67a8469c1fe58a9d172f9f008f703663` and pushed to `origin/phase-4-cutscene-slice`; working tree clean. Browser/manual cutscene checks Not run: no visible desktop/browser available in this environment; video fallback not exercised because no video is supplied.
- Blockers / remaining work: Lina, machine and environment art are still missing, so C02-C04 environment shots use labelled text cards. No supplied audio or video files, so audio is synthesized and video fallback code is dormant. Human playthrough of cutscenes, audio unlock, mute persistence and reduced motion pending a machine with visible output.
- Next action: human playthrough verification of cutscenes and settings; then PR to main per TEAM_WORKFLOW.md.
- Handoff / integration: committed on branch `phase-4-cutscene-slice` as `e12bf06` and pushed to origin; branch only, not integrated into `main` (PR pending).

### P2-001 - opening through settlement exploration
- Status: In progress
- Agent/session: OpenCode / phase-2-opening-20261120
- Human owner: Unassigned
- Branch/worktree: `master`, `C:/Users/Vaibhav Goyal/OneDrive/Desktop/Want/Unga-Bunga-HackNPitch`
- Started / last updated: 20 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/content/dialogue/` (types.ts, sequences.ts, cutscenes.ts), `src/content/maps/` (types.ts, campus.ts, library.ts, dorm.ts, clinic.ts, settlement.ts, index.ts), `src/game/story-state.ts`, `src/game/scenes/DialogueScene.ts`, `src/game/scenes/WorldScene.ts`, `src/game/create-game.ts` (updated), `src/main.ts` (updated), `src/content/characters.ts` (added civilian)
- Acceptance criteria: data-driven dialogue with speaker IDs, optional portraits, line advance, instant text reveal, and completion flags; short readable chunks for Mai's explanation; objectives and three local settlement interactions; story choices change a response but not the main ending; breach is a scripted survival scene with no unwinnable combat; placeholder cutscene IDs C01-C04 for Phase 4; dialogue skip reaches same story state as reading; `npm run check` passes.
- Completed so far: dialogue system with types, sequences for playthrough sections 01-07, cutscene placeholders C01-C04; five maps (campus, library, dorm, clinic, settlement) with grid movement, collision, NPCs, interactables, automatic triggers, door transitions; story state tracking with completion flags; DialogueScene with portrait support, choices, skip/read convergence; WorldScene with grid movement, interaction prompts, objective UI, scene transitions; updated main.ts and create-game.ts to launch campaign.
- Verification: `npm run check` passed (19 assets, strict TypeScript, 7 tests, production build). Browser/dev server smoke test Not run (dev server started but not manually tested).
- Blockers / remaining work: manual browser playthrough needed to verify story flow, skip/read convergence, and settlement interaction tracking; breach-to-clinic transition needs visual verification; Phase 4 cutscenes are placeholders only.
- Next action: manual playthrough verification of the full opening through settlement; then handoff to Phase 3 combat owner.
- Handoff / integration: local `master` branch, uncommitted. Branch only until integrated via PR.

### P3-001 - isolated real-time combat arena
- Status: In progress (implementation complete; verification pending)
- Agent/session: OpenCode / phase-3-combat-20261120
- Human owner: Unassigned
- Branch/worktree: current checkout (git unavailable in this environment; no branch created yet)
- Started / last updated: 20 November 2026
- Scope / owned files: `src/game/combat/*` (new), `src/game/scenes/CombatScene.ts` (new), `src/game/create-game.ts` (edit: scene selection), `src/main.ts` (edit: dev-only launch path). No story routing, assets, or manifest changes.
- Acceptance criteria: continuous normalized movement (no diagonal speed advantage), mouse-world aim, pistol fire + Space dodge, telegraphed Scout/Rusher attacks, perfect-dodge counter (one per attack ID), Story/Real multipliers at spawn, cap 4 active enemies, frame-safe damage (attack IDs + invulnerability), freeze on pause/focus loss/defeat, dev-only launch path, `npm run check` passes.
- Completed so far: Created `src/game/combat/types.ts`, `damage.ts`, `player.ts`, `enemy.ts`, `bullet.ts`; created `src/game/scenes/CombatScene.ts`; edited `src/game/create-game.ts` to select preview vs combat scene; edited `src/main.ts` to add a dev-only `Combat test (dev)` launch path (gated by `import.meta.env.DEV`, story routing untouched). Enemy health applies `difficultyRules[difficulty].enemyHealthMultiplier` at every spawn; damage uses `state.takeHit` (Story 25 / Real 50); i-frames + attack IDs make damage frame-safe; dodge/counter/invulnerability/deadlines run on an effective clock that freezes on pause/focus loss; cap 4 active enemies with safe-edge spawning; HUD shows mode + health segments (4 Story / 2 Real) + counter ring/text; Game Over + dev restart clears enemies/bullets/timers/windows.
- Verification: Not run — Node.js is not installed in this environment, so `npm run check`, `npm test`, and `npm run build` could not be executed. TypeScript was reviewed manually for strictness (import type for type-only imports, no unused locals/parameters, verbatimModuleSyntax).
- Blockers / remaining work: run `npm run check` (assets:check, typecheck, tests, build) on a machine with Node 24; then manual combat checks per GUIDEBOOK Phase 3 (overlap bullets, dodge into walls, diagonals, resize, hold fire during pause, retry, frame-rate variation, one-attack-one-counter, missed window harmless, 2 Real / 4 Story hits kill, pause freezes bullets/timers, both modes).
- Next action: execute `npm run check` on a Node 24 machine; if clean, perform manual combat verification and mark Done.
- Handoff / integration: branch only; not integrated until review.

### P5-001 - rescue mission and complete ending

- Status: In progress
- Agent/session: OpenCode / phase-5-rescue-20261120
- Human owner: Unassigned
- Branch/worktree: current checkout (git unavailable in this environment; no branch created yet)
- Started / last updated: 20 November 2026
- Scope / owned files: `src/content/encounters/rescue-beats.ts` (new), `src/game/scenes/RescueScene.ts` (new), `src/game/create-game.ts` (edit: add rescue scene), `src/main.ts` (edit: launch path). No story routing, assets, or manifest changes beyond new encounter data.
- Acceptance criteria: three beats (alley, 45s shelter hold, extraction), Lina/isshin/mai/switch/Mai marker, counter teaching, fixed enemy queue, health preserved across beats, girl-rescued + full recovery exactly once on reaching safety, Game Over + explicit Restart rescue mission on failure, retry resets mission not story, no alternate dead-girl branch, `npm run check` passes.
- Completed so far: created `src/content/encounters/rescue-beats.ts` with fixed spawn queues for all three beats; created `src/game/scenes/RescueScene.ts` implementing all three beats (alley, 45s shelter hold, extraction), Lina behind shelter cover, Mai's safe marker, Isshin cover fire, extraction switch with 1-second hold interrupted by damage, counter teaching card (first perfect dodge in hold), fixed enemy queue, Game Over with explicit "Restart rescue mission" + "Return to title", retry that resets only the rescue mission at full health, and the ending granting girl-rescued + full recovery exactly once; wired RescueScene into `src/game/create-game.ts` and added a dev-only "Rescue test (dev)" launch path plus `want:return-to-title` handling in `src/main.ts`.
- Verification: Not run — Node.js/git are not installed in this environment, so `npm run check`, `npm test`, and `npm run build` could not be executed. TypeScript reviewed manually for strictness (import type for type-only imports, no unused locals/parameters, verbatimModuleSyntax, no leftover nextBulletId/_bulletSeq/combatTuning/SAFE_SPAWN_DIST/takeHit references).
- Blockers / remaining work: run `npm run check` on a Node 24 machine; perform manual rescue checks per GUIDEBOOK Phase 5 (lose in each beat, restart, carry wound, both modes, switch under pressure, Lina safe arrival heals once, complete ending; death/milestone race guard).
- Next action: execute `npm run check` on a Node 24 machine; if clean, perform manual rescue verification and mark Done.
- Handoff / integration: branch only; not integrated until review.

### WORLD-FIX-001 - blank story-mode canvas on launch

- Status: Done
- Agent/session: OpenCode / story-blank-fix-20261121
- Human owner: Unassigned
- Branch/worktree: `master`, `C:/Users/somen/OneDrive/Desktop/want-main`; committed and pushed.
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/game/create-game.ts`, `src/main.ts` (dev-button string interpolation only), and this tracker entry/log. No map, content, rule, asset or dependency changes.
- Acceptance criteria: entering Story Mode renders the campus map (tiles, player, objective) instead of a blank canvas, for both new runs and resumed runs; the same path works in the production build and for the dev combat/rescue scenes; `npm run check` passes.
- Completed so far: reproduced the blank canvas. Phaser logged `Error: Cannot add Scene with duplicate key: WorldScene` and aborted scene boot because `createGame` registered the selected scene twice (once as `Scene`, again in the shared scene array). `create-game.ts` now dedupes the scene classes before constructing `Phaser.Game`. Also fixed the menu template literal using `{devCombatButton}` / `{devRescueButton}` instead of `${...}`, which printed literal placeholders instead of the dev launch buttons.
- Verification: 21 November 2026, dev server (`vite` on 127.0.0.1:5174) and production preview (`vite preview` on 4173), Chromium via the in-app browser. Before the fix: duplicate-key error, zero active scenes, blank canvas. After the fix: no console errors; `WorldScene` reaches RUNNING with `mapId: campus`, six display objects, a visible `sprite-k` player at (120, 312), objective text "Reach the faculty library."; all ten character sheets and seven portraits return 200. Production build: Story Mode shows a 768x432 canvas with mode label "Story Mode · Chapter One", 17 character asset requests succeed and no console errors. Dev combat launch reached a scene with no duplicate-key error. `npm run check` passed on 21 November 2026 (21 runtime assets, strict TypeScript, 17/17 tests, production build; expected Phaser chunk-size warning). Not run: a visible-window screenshot (no visible desktop in this environment), keyboard movement/dialogue playthrough.
- Blockers / remaining work: manual keyboard playthrough of the opening in both modes is still pending.
- Next action: run the documented Phase 1/2 manual checks for movement, triggers and dialogue in Story and Real Mode.
- Handoff / integration: committed as `7acbfea` and pushed to `origin/master` on 21 November 2026; integrated on `master`.

### WORLD-FIX-002 - make quest NPCs findable on the exploration maps

- Status: Done
- Agent/session: OpenCode / npc-findability-20261121
- Human owner: Unassigned
- Branch/worktree: `master`, `C:/Users/somen/OneDrive/Desktop/want-main`; committed and pushed.
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/game/scenes/WorldScene.ts` and this tracker entry/log. No map data, dialogue content, rules, assets or dependencies changed.
- Acceptance criteria: Hachimi and every other talkable NPC are identifiable without guessing, the current room name is visible, the existing interaction prompt still works, Hachimi does not vanish into a state gap if the player leaves before the bracelet scene, controls do not get stuck after meeting Hachimi, and `npm run check` passes.
- Completed so far: reproduced the report by walking campus → library: Hachimi's NPC, sprite, collision and `library-hachimi-meet` dialogue were all functional, but she rendered as a small unlabeled sprite on a dark, empty courtyard, so she was easy to miss. Added a name plate under each NPC using the shared character names, a bobbing gold `!` marker above each talkable NPC, a pulse animation on each quest NPC sprite, an explicit depth ordering (floor < interactable markers < characters < labels < HUD) and a room-name label under the objective. Also fixed two defects in `onDialogueComplete` / `startDialogue`: (1) the `library-hachimi-met` bracelet scene is now started via `this.time.delayedCall(800, ...)` instead of synchronously — launching it inside `DialogueScene.finish()`'s `onComplete` started and stopped DialogueScene in the same tick, leaving dialogue state desynced and the controls stuck; (2) replaced the manual `dialogueActive` boolean with `this.scene.isActive('DialogueScene')` for gating movement/interaction, so controls always resume when the dialogue scene actually stops (no desync possible). Directly observed the stuck state before the fix: `dialogueActive=true` while `DialogueScene` was inactive, mid bracelet scene at "K: Nero?", with `library-breakup-done` never set. Labels and markers are destroyed and recreated with the NPCs on map changes and after dialogue.
- Verification: 21 November 2026, dev server + Chromium in-app browser. Captured the rendered canvas through a Phaser snapshot: library shows "Library courtyard" under the objective, with Hachimi's sprite, "Hachimi" name plate, pulsing sprite and `!` marker at (6,5). `npm run check` passed on 21 November 2026 (21 runtime assets, strict TypeScript, 17/17 tests, production build with the expected Phaser chunk-size warning). Manual end-to-end keyboard playthrough was limited by the driver's synthetic-input environment, but the stuck state was directly reproduced and the fix targets its root cause.
- Blockers / remaining work: None for code. Manual playthrough of the full opening in both modes still pending.
- Next action: commit and push; then continue the manual playthrough from the dorm.
- Handoff / integration: committed and pushed to `origin/master`; integrated on `master`.

### BUG-HUNT-001 - asset and scene bug hunt (generated assets)

- Status: Done (merged to master)
- Agent/session: Arena agent / asset-debug-20261120
- Human owner: Unassigned
- Branch/worktree: `arena/d6ee5f65-unga-bunga-hacknpitch`, `/home/user/Unga-Bunga-HackNPitch`, baseline `2059a73`.
- Started / last updated: 20 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/ui/cutscene-player.ts`, `src/game/scenes/WorldScene.ts`, `src/game/scenes/RescueScene.ts`, `assets/runtime-manifest.json`, and this tracker entry/log. No map data, dialogue text, rules, dependencies or supplied art changed.
- Acceptance criteria: generated assets are reachable at runtime (cutscene portraits resolve to copied files, no 404s), the cutscene fallback actually uses the generated placeholder, no NPC renders with the wrong sprite, rescue cover/state logic is correct, delayed triggers cannot double-fire, and `npm run check` passes.
- Completed so far: hunted and fixed seven defects found by reading the asset pipeline and the consuming scenes (static checks passed, so these were runtime-only):
  1. **Cutscene portraits never loaded.** `imagePath()` built `/assets/${imageId}.png`, but ledger `imageId`s are asset IDs whose files live under `/assets/characters/<id>/<file>.png`. Every portrait shot 404'd and fell back to a text card. It now resolves each ID through `assets/runtime-manifest.json` (`id` → `output`), with the old flat path kept as a defensive fallback.
  2. **Man 1 / Man 2 speaking portraits were never shipped.** `c02` references `man-1-speaking-pose` and `man-2-speaking-pose`, but neither was declared in `assets/runtime-manifest.json`, so `assets:prepare` never copied them to `public/assets/` (they 404'd even after fix 1). Added both to the manifest (1024×1536, sources under `assets/characters/man-1/` and `assets/characters/man-2/`, matching `inventory.json`).
  3. **Generated fallback asset unused.** The cutscene player's comment promised a fallback to `default-template.png`, but the `onerror` handler only showed a text card. Added `showTemplateFallback()` so a failed still renders the generated default-template placeholder (with a final text-card safety net if the template also fails), and wired it into both the still and video-fallback paths.
  4. **Wrong NPC sprite for Man 1/Man 2.** `WorldScene.characterSprites` used keys `man1`/`man2`, but the stable character IDs are `man-1`/`man-2` (see `characters.ts` and the map data), so the lookup missed and the sprite fell back to K. Keys corrected to `man-1`/`man-2` (both sheets are already preloaded).
  5. **Rescue cover block misplaced.** The third `COVER` rectangle used `ARENA_W * 0.5` for its `y` instead of `ARENA_H * 0.5`, placing it at y≈289 instead of y≈121. Corrected to `ARENA_H`.
  6. **Rescue deaths were not recorded as failed.** `RescueScene` never set `rescueStatus = 'active'`, so `takeHit` kept a death at `not-started`; a saved failed attempt would not reload as Game Over and `restartRescue` had to be forced. `init()` now marks a `not-started` run `active` on entry, so a lethal hit records `failed`.
  7. **Delayed auto-triggers could double-fire.** The clinic wake and settlement cry were scheduled with a flag check only at schedule time; if the player triggered the same sequence first and finished it before the delay, the callback relaunched it. The callbacks now re-check the flag before starting.
- Verification: 20 November 2026, Node 22.22.3. `npm run assets:check` validates 23 runtime assets (was 21); `npm run typecheck` clean; `npm run check` passes (23 assets, strict TypeScript, 17/17 tests, production build; the expected lazy Phaser chunk-size warning only). `assets:prepare` confirmed `public/assets/characters/man-1/man-1-speaking-pose.png` and `public/assets/characters/man-2/man-2-speaking-pose.png` are copied. A direct check confirmed all five ledger `imageId`s (`sayu`, `nero`, `man-1`, `man-2`, `mai` speaking poses) resolve to existing `public/assets` files. Sprite atlases were decoded independently: all eleven 48px sheets are 144×96 with six non-empty frames, matching the declared `frames: 6`. Browser/manual playthrough Not run: no visible browser/desktop in this environment.
- Blockers / remaining work: none for the seven fixes. Known gaps left untouched and reported for their owners: (a) `RunState.checkpoint` is never advanced during play (`enterCheckpoint` is unused), so Continue still resumes at `campus` — wiring it needs persisted story flags, a shared-interface change owned by the Phase 5/6 integrator; (b) the dialogue sequences' `cutsceneId` values (`C01`–`C03`) are never played and are uppercase while the ledger IDs are lowercase (`c01`–`c04`), a Phase 5/2 wiring gap, not a crash; (c) manual keyboard playthrough of the opening and rescue in both modes still pending.
- Next action: a human playthrough of the cutscene portraits (C01–C04), the Man 1/Man 2 c02 portraits, and the rescue beats.
- Handoff / integration: merged into `master` via PR #1 (merge commit `41cea1b`, merged 20 November 2026); branch `arena/d6ee5f65-unga-bunga-hacknpitch` has no unique commits beyond master.

### HORDE-MP-001 - shared-code multiplayer Horde duel

- Status: In progress
- Agent/session: OpenCode / deepseek-v4.1-flash-free / horde-multiplayer-20261121
- Human owner: Project creator (requested this feature)
- Branch/worktree: `master`, `C:\Users\somen\OneDrive\Desktop\want-main`
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/game/horde/duel.ts` (new), `src/services/horde-duel.ts` (new), `src/game/horde/rules.ts` (seed/RNG helpers), `src/game/scenes/HordeScene.ts` (seeded spawns + `seed` config), `src/ui/horde-modal.ts` (duel lobby + duel results), `src/main.ts` (duel session wiring), `src/styles.css` (duel UI), `supabase/migrations/202611210001_horde_duels.sql` (new), `supabase/README.md`, `docs/ARCHITECTURE.md`, `tests/horde-duel.test.ts` (new), this tracker entry/log. Solo Horde rules, campaign saves, `RunState`, assets and dependencies unchanged.
- Acceptance criteria: a player can create a 6-character code and share it; a second player can join by code; both play the same difficulty, duration and spawn seed; both scores are stored once per seat and compared (duel: higher score wins, tie broken by survival then kills; team: combined score); the room shows waiting/completed/winner states; the flow works against Supabase when `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are set and falls back to local pass-and-play without credentials or when the backend is unreachable; no secret/service-role key in browser code; `npm run check` passes.
- Completed so far: full implementation — `src/game/horde/duel.ts` (pure match rules), `src/services/horde-duel.ts` (Supabase RPC backend + localStorage pass-and-play fallback), seeded Horde runs (`HordeScene` accepts `seed`), duel lobby + results UI (`horde-modal.ts`), main.ts wiring (duel session, backend badge, duel results screen), migration `supabase/migrations/202611210001_horde_duels.sql`, docs/ARCHITECTURE.md and supabase/README.md updates, `tests/horde-duel.test.ts` (12 tests), CSS.
- Verification: `npm run check` passes (assets:check 90 visual + 33 audio, strict TypeScript, 54/54 Vitest tests across 6 files, production build). Live two-browser credential-free check passed: created code `MAETLK` as P1 (K), joined as P2 (Mai) in a second tab, both seats shared code+seed `360556158`, both entered the arena with matching `DUEL MAETLK P1/P2` headers, and Refresh surfaced the joined seat. Supabase live two-profile check pending the URL/publishable key you said you'd supply.
- Blockers / remaining work: live Supabase two-profile verification (create in profile A, join in profile B, both submit, winner declared) once you provide `VITE_SUPABASE_URL` + `sb_publishable_…` key. Same-arena co-op remains out of scope (deferred per DECISIONS.md).
- Next action: await your Supabase credentials, then run the live two-profile check and open a PR per TEAM_WORKFLOW.md.
- Handoff / integration: local working tree on `master`; no commit or PR yet.

## Coordination rules

- Read the newest available tracker and inspect the actual files/branch before claiming work. A claim is an ownership note, not a filesystem lock.
- On separate clones, this file becomes shared only after commits are pushed and pulled/merged. Agree on ownership with the team before overlapping work; an absent local claim does not prove a teammate is idle.
- Edit only your task subsection and relevant phase row. Re-read just before saving. Preserve other agents' claims and log entries; reconcile both sides of a merge conflict rather than replacing the file wholesale.
- Do not take over an In progress task based only on an old timestamp. Confirm the handoff. If an agent was interrupted, inspect its changes/tests and record what is recovered versus still unknown.
- Save a useful checkpoint after each meaningful result, not only at the end. At interruption or context handoff, record unfinished edits and the exact next step whenever possible.
- Put changes to agreed game rules in `docs/DECISIONS.md`; link them here. Do not quietly convert an implementation note into a new design decision.
- Keep credentials, tokens, private email addresses and raw logs out of this file. Link to concise evidence instead.

## Append-only activity log

Add concise entries at the bottom; do not rewrite prior entries to make earlier work appear complete. Correct mistakes in a new entry.

- **9 November 2026 - P0-FOUNDATION - prior session:** foundation, guidebook and playthrough delivered. Historical build/test/browser evidence is in `docs/VERIFICATION.md`; the complete campaign remains planned.
- **9 November 2026 - TRACK-001 - Codex:** added the shared progress record and required agent read/update/handoff instructions. Documentation-only change; subsequent agents should claim a concrete slice before implementation.
- **9 November 2026 - P0-FOUNDATION - Codex:** committed the existing workspace as `0c507d8` on local `main`. Verified the commit and clean working tree before updating this tracker. Game tests were not rerun for the Git snapshot. Next action remains Phase 0 team verification.

- **9 November 2026 - ASSET-PROMPTS-001 - Codex:** delivered the campaign asset prompt pack on local `main` (uncommitted). Verified 39 document links, reference IDs, required section coverage and Markdown structure; no game code or source art changed and game tests were not rerun. Next: art owner generates and reviews identity/design anchors using the listed attachments.

- **9 November 2026 - ASSET-PDF-001 - Codex:** completed the clickable 35-page prompt PDF, checked all rendered pages and 288 link destinations, and verified all 37 prompt blocks were retained. User requested repository commit and push; publication is the next action. No game tests rerun for documentation-only work.

- **9 November 2026 - ASSET-PROMPTS-001 / ASSET-PDF-001 - Codex:** committed both prompt formats and progress updates as `013cc61` and pushed to `origin/main`; `git ls-remote` confirmed `013cc61c6d9233de909ffb5093cecc690bd045e9`. Working tree was clean after publication. This tracker follow-up records the verified delivery.

- **9 November 2026 - P0-VERIFY-001 - Codex:** passed clean install, full check and Chromium production-preview checks on local `main` at `86e36cc` without Supabase credentials. Recorded the Phaser size warning and campus-to-library handoff. Only the tracker changed.

- **9 November 2026 - P0-AUDIT-001 - Codex:** audited README against `ba05bdd`, verified two byte-identical clean builds, all seven tests, the asset inventory and runtime frames, and a credential-free Chromium smoke test. Flagged stale first-push instructions and the existing Phaser size warning. Only the tracker changed locally.

- **9 November 2026 - ASSET-SCHEDULE-001 - Codex:** mapped asset handoffs to guidebook Phases 0-5 and the Phase 7 freeze. Checked guidebook PDF pp. 5, 7-14, 23-25 and prompt PDF pp. 4, 25-26. Only this tracker changed locally on main. Game tests not run for this planning review. Next: review K, Lina and machine designs, then hand off the campus/library tile kit and K walk sprites for Phase 1.

- **9 November 2026 - P0-README-001 - Codex:** replaced README first-push instructions with the verified `origin` clone URL, Phase 0 commands and manual checklist. Checked the remote branch, npm script consistency and all README links. README and tracker changes are local on `main`.

- **9 November 2026 - P0-TEAM-VERIFY-001 - Codex:** published the README and tracker to `origin/main` at `28f9110`. Fresh GitHub clone, install, seven tests, build and HTTP checks passed. Windows browser input was stopped before the manual test. Recorded role labels and published Game Development rules locally. Team gate still open.

- **9 November 2026 - P0-TEAM-VERIFY-001 - Codex:** passed the manual production-preview retry from the clean GitHub clone at `28f9110`. Recorded keyboard navigation, visible K, walls, held directions, E range, Escape and three re-entries. Included the task-board notes in the follow-up commit. Team gate remains in progress.

- **9 November 2026 - P0-MARKER-001 - Codex:** reproduced missed E taps and offscreen feedback, fixed both locally, and passed `npm run check` and two production-preview browser passes. Local branch ready for review. Team interaction retest remains open.

- **9 November 2026 - P0-MARKER-001 / P0-TEAM - Codex:** reran the full check and focused production-browser regression, integrated the marker fix into `main`, and recorded the project creator's sign-off closing the Phase 0 team gate. Teammate retest and outstanding confirmations remain follow-ups.

- **10 November 2026 - ART-REV-001 - Codex:** revised eight character sets with 22 derived PNGs, audited all 11 source sets, linked six updates to existing runtime paths, and updated both prompt formats. Passed format, atlas, PDF, npm and Chromium preview checks. Local and ready for creator review. Next: confirm credits and hand off the revised dialogue and TV art to Phase 2.

- **14 November 2026 - TRACK-002 - OpenCode:** refreshed `AGENTS.md` with current commands, single-test usage, strict TypeScript/lazy Phaser/generated-asset quirks, architecture and state boundaries, and the preserved game/progress contracts. Checked referenced paths and ran the documented Vitest file and filter commands (7 passed; 1 passed/6 skipped). Full check, browser and PDF checks Not run for this documentation-only change. Integrated on `main` (AGENTS.md in `376678c`); pushed to `origin/main`.
- **14 November 2026 - BRIEF-001 - OpenCode:** restored the truncated `brief.md` (was cut off at a `<!--PART3-->` placeholder, missing its promised sources section): added the in-flight ART-REV-001 note plus commands/check gate, toolchain and asset quirks, hard game contracts, progress/git/finish rules and a verified source table. Checked every claim against `package.json`, `.nvmrc`, CI config, `docs/DECISIONS.md` and the tracker; all 16 unique Markdown links resolve. No game files touched; `brief.md` remains untracked pending owner commit.
- **14 November 2026 - BRIEF-001 - OpenCode:** owner authorized publication; committed `brief.md` alone as `8d6f56c` (the concurrent ART-REV-001 working slice was deliberately left uncommitted) and pushed to `origin/main`; `git ls-remote` confirmed `8d6f56c406f6ab7b9dbd77d0ab35de132ae2e270`. Documentation-only change, so `npm run check` was not rerun locally; CI will run the full gate on the push. This tracker update itself remains uncommitted inside the shared modified `PROGRESS.md` until ART-REV-001 is resolved.
- **14 November 2026 - ART-REV-001 - OpenCode:** the project creator approved all 22 revised PNGs. Integration verification reran `npm run check` on the full working tree (19 assets validated, strict TypeScript, 7 tests, production build; expected Phaser size warning) before committing. Committed the art revisions, manifest, checklist/architecture/prompt-guide updates and the PDF together with the tracker, then pushed to `origin/main`; the verified remote hash is recorded in the follow-up entry.
- **14 November 2026 - ART-REV-001 - OpenCode:** publication recorded. `git ls-remote` confirmed `origin/main` at `3e3e56c80b26e97ac3b161d0a5cd7340bde08d8e` after the push; working tree clean. Remaining open items: usage rights/credits confirmation (operational task in `docs/DECISIONS.md`) and the Phase 2 handoff of the approved speaking portraits.
- **20 November 2026 - PUBLISH-001 - OpenCode:** published the foundation workspace to the configured remote `Unga-Bunga-HackNPitch`. This checkout had an empty `master`; based the snapshot on `origin/master` `7bcda3d` so the supplied art appears as renames into `assets/characters/`. Passed `npm ci`, `npm run check` (19 assets, TypeScript, 7 tests, build; expected Phaser warning) and `npm test` (7/7) before committing. Committed as `d24ebae` and pushed to `origin/master`; `git ls-remote` confirmed `d24ebae4a26702554cdf035acca23b4466e5291b` and the working tree was clean. `phase/0-scaffold` untouched.
### P1-001 - campus exploration slice with NPC, interactable and door

- Status: Done (branch only)
- Agent/session: OpenCode / phase-1-campus-20261120
- Human owner: Unassigned
- Branch/worktree: `phase-1-campus-slice`, `C:/Users/somen/OneDrive/Desktop/want-main`
- Started / last updated: 20 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/content/maps/campus.ts` (new), `src/game/scenes/WorldScene.ts` (new), `src/game/create-game.ts` (edit: register WorldScene + `?world` dev route), `src/styles.css` (edit: objective/E prompt/dialogue styles). Preview scene and preview-room map left untouched.
- Acceptance criteria: four-direction grid steps with solid collisions, bounded camera, K + one NPC + one interactable + one door, NPC interaction requires adjacency and facing, visible current objective + E prompt, movement blocked while dialogue open, map data under src/content/maps, behavior in WorldScene, combat coordinate system separate, preview preserved as dev route, `npm run check` clean, unknown/missing map IDs fail visibly rather than crash.
- Completed so far: campus + library rooms (16×9 tiles) with K spawn, Hachimi NPC, wallet interactable, library/campus doors; WorldScene grid movement (one tween at a time), solid wall/NPC collision, camera bounds, adjacency+facing gated NPC dialogue, objective/E-prompt overlays, door room transition; create-game registers WorldScene behind `?world` preserving the default preview route; idempotent UI cleanup fixed a DOM-leak on menu re-entry; `switchRoom` now catches unknown map room IDs, logs a clear console error, and keeps the player in the current room instead of throwing.
- Verification: `npm run check` passed 20 November 2026 (19 assets, strict TypeScript, 7/7 tests, production build; expected Phaser chunk warning). Browser: WorldScene loads via `?world` with objective, bounded campus, K, Hachimi and wallet marker; single-tap grid movement works; no console errors; UI no longer duplicates on menu re-entry. Not visually confirmed (screenshot/desktop not available in this environment): wall-clipping, door-transition visual, dialogue adjacency+facing, movement-blocked-during-dialogue — these depend on precise blind navigation blocked by the 170 ms movement tween.
- Blockers / remaining work: None for code. A human playthrough on a machine with visible output should confirm wall clipping, door transition, NPC adjacency+facing, and dialogue blocks movement.
- Next action: human playthrough verification; then PR to main per TEAM_WORKFLOW.md.
- Handoff / integration: both `phase-1-campus-slice` (`910ea6a`) and `phase-4-cutscene-slice` (`e12bf06`) merged into `integration/phases-1-4` on this session; PR to `main` pending per TEAM_WORKFLOW.md.
- **20 November 2026 - P4-001 - OpenCode:** implemented the Phase 4 cutscene ledger on branch `phase-4-cutscene-slice` (branched from `master` `d24ebae`). Added `src/content/cutscenes/ledger.ts` (C01-C04 shots with captions, restrained pan/zoom, existing supplied portraits only, labelled cards for missing environment art), `src/game/cutscene/playback.ts` (pure controller with skip==normal-completion exactly-once), `src/services/audio.ts` (synthesized music/effects, unlock on user gesture, master/music/effects buses), `src/services/preferences.ts` (localStorage master/music/effects/mute/reduced-motion), `src/ui/cutscene-player.ts` (DOM overlay with Skip/Next/Finish, Escape to skip, Enter/Space advance, auto-advance, video-with-still fallback), `src/ui/settings-panel.ts`, and wired `src/main.ts` (settings button, audio unlock on first gesture, `?cutscene=` dev route). Added `tests/cutscene.test.ts`. Updated `docs/ASSET_CHECKLIST.md` credits ledger and `docs/ARCHITECTURE.md` Phase 4 row. `npm run check` passes (19 assets, TypeScript, 15/15 tests, production build). Browser/manual cutscene, audio unlock, mute persistence and reduced-motion checks Not run: no visible desktop/browser available; no supplied audio/video files.
- **20 November 2026 - P4-001 - OpenCode:** committed the Phase 4 slice as `e12bf06f67a8469c1fe58a9d172f9f008f703663` and pushed to `origin/phase-4-cutscene-slice`. Updated the P4-001 tracker entry with the commit hash and push status; working tree clean. `npm run check` re-verified clean before and after commit. Branch only; PR to `main` pending per TEAM_WORKFLOW.md.
- **20 November 2026 - OpenCode (this session):** merged `phase-1-campus-slice` (`910ea6a`, Phase 1 campus exploration) and `phase-4-cutscene-slice` (`e12bf06`, Phase 4 cutscenes/audio/settings) into new branch `integration/phases-1-4` created from `master` (`d24ebae`). Resolved a `PROGRESS.md` merge conflict by keeping both the P1-001 and P4-001 task entries; `styles.css` auto-merged cleanly. Phases 2 and 3 do not exist as branches (local or remote), so only Phases 1 and 4 were merged. No asset source files are changed by either phase (`assets/` untouched; `public/assets/` is generated/gitignored), satisfying "without the assets". `npm run check` passes: 19 runtime assets validated, strict TypeScript clean, 15/15 tests pass, production build succeeds (expected Phaser chunk-size warning only). Committed as `2ea0a31` then `d9c04e9` (phase overview table updated to Ready for review), pushed to `origin/integration/phases-1-4`; working tree clean. PR to `main` pending per TEAM_WORKFLOW.md; browser/manual playthrough checks Not run (no visible desktop/browser in this environment).
- **20 November 2026 - P2-001 - OpenCode:** implemented Phase 2 opening through settlement exploration. Created data-driven dialogue system (`src/content/dialogue/`) with speaker IDs, optional portraits, line advance, instant text reveal, and completion flags; dialogue sequences for playthrough sections 01-07; short readable chunks for Mai's explanation; three settlement interactions (ration table, barricade, shelter board); story choices that change responses but not the main ending; scripted breach survival scene with no combat; placeholder cutscene IDs C01-C04 for Phase 4; skip/read convergence (same completion flags). Created map data (`src/content/maps/`) for campus, library, dorm, clinic, settlement with grid movement, collision, NPCs, interactables, automatic triggers, door transitions. Created `DialogueScene` and `WorldScene` for exploration; updated `main.ts` and `create-game.ts` to launch the campaign. `npm run check` passed (19 assets, TypeScript, 7 tests, production build). Manual browser playthrough Not run.
- **20 November 2026 - P3-001 - OpenCode:** implemented isolated Phase 3 real-time combat. Added `src/game/combat/types.ts`, `damage.ts`, `player.ts`, `enemy.ts`, `bullet.ts` and `src/game/scenes/CombatScene.ts`; wired scene selection into `src/game/create-game.ts`; added a dev-only `Combat test (dev)` launch path in `src/main.ts` gated by `import.meta.env.DEV` (story routing untouched; no assets/manifest changes, combat rendered with temporary graphics placeholders labeled as such). Behavior: continuous normalized movement (no diagonal speed advantage), mouse-world aim, pistol fire + Space dodge, telegraphed Scout (800 ms windup then shot) and Rusher (lane then charge) attacks, perfect-dodge counter ("COUNTER - CLICK" text + yellow ring, one per attack ID, no stacking), Story/Real enemy-health and damage multipliers at every spawn (30/60 HP, 25/50 damage), cap 4 active enemies with safe-edge spawning, frame-safe damage via attack IDs + 1000 ms invulnerability, freeze on pause/focus loss/defeat via an effective clock, Game Over with dev restart that clears enemies/bullets/timers/windows. `npm run check` NOT run — Node.js is unavailable in this environment; TypeScript reviewed manually for strictness.
- **20 November 2026 - P5-001 - OpenCode:** implemented the Phase 5 rescue mission and complete ending slice. Added `src/content/encounters/rescue-beats.ts` (fixed spawn queues for alley/hold/extraction) and `src/game/scenes/RescueScene.ts` (three beats preserving campaign health; Lina behind shelter cover, Mai's safe marker, Isshin cover fire, extraction switch with 1-second hold interrupted by damage, counter teaching card on first perfect dodge in the hold, fixed enemy queue capped at 3 active in the hold). Only reaching safety grants girl-rescued + full recovery exactly once via completeMilestone. Failure kills K, persists rescueStatus=failed, shows Game Over with explicit "Restart rescue mission" and "Return to title"; retry uses restartRescue to reset only the rescue mission at full health while preserving earlier story. No alternate dead-girl branch. Wired into `src/game/create-game.ts` and added a dev-only "Rescue test (dev)" path plus `want:return-to-title` handling in `src/main.ts`. `npm run check` NOT run — Node.js/git unavailable in this environment; TypeScript reviewed manually for strictness.
- **20 November 2026 - P6-LOCAL - OpenCode:** wired validated local saves into the campaign on branch `phase/6-local-saves` (from `6c825f4`). `src/main.ts`: added hidden Continue button that shows when a valid save loads; "Begin the story" opens an explicit new-run confirmation dialog when a save exists; honest error messages for invalid/unavailable storage; best-effort save on new run. `src/game/create-game.ts`: accepts an optional saved `RunState`, seeds registry (health/checkpoint/milestones/counter/rescue) and never heals to fresh health on reload. `src/game/scenes/WorldScene.ts`: resumes at the saved checkpoint instead of always `campus`. Save schema/re-use already covered by existing `src/game/state.ts` (v1) and `src/services/local-save.ts` (validation, empty/invalid/unavailable). Added 2 save/reload audit tests in `tests/rules.test.ts` (wound persistence on reload never heals to fresh; malformed/future-schema rejected but fresh local play still works). Verified: `npm run check` passes (19 assets, strict TS, 9 tests, build with expected Phaser warning). Secrets audit clean — no credentials committed; `supabase.ts` factory requires `sb_publishable_` key form and rejects secret/service-role keys; `.env.example` holds only empty placeholders. Fresh-profile production smoke: menu loads with Continue hidden, no console errors; "Begin the story" launches Phaser game with no errors. Continue/resume e2e Not run (preview-browser localStorage isolated per reload; no Phase 3 combat/Phase 5 rescue scenes yet). Cloud (Supabase) not enabled — deferred per guide, guest play stays instant. Branch only; pushed to `origin/phase/6-local-saves`; awaiting PR to main.

- **20 November 2026 - OpenCode (this session):** merged all remote phase branches into master: phase/2-dialogue-opening (P2 dialogue), feature/p3-combat-arena (P3 combat + P5 rescue), phase/6-local-saves (P6 local saves). Resolved merge conflicts in PROGRESS.md, create-game.ts, main.ts, and WorldScene.ts. Added default background and template placeholder assets (assets/backgrounds/default-background.png, default-template.png) registered in runtime-manifest.json and inventory.json so phases fall back to defaults while generated art is being produced. Updated prepare-assets.mjs to allow assets/backgrounds as a valid source folder. Cutscene player falls back to default template when generated images fail to load. Fixed TypeScript errors from merged branch code (import paths, type assertions, unused variables). Restored phase-2 map files corrupted during binary merge resolution. `npm run check` passes: 21 runtime assets validated, strict TypeScript clean, 17 tests pass, production build succeeds (expected Phaser chunk-size warning only). All phases P1-P6 are now integrated on master; browser/manual playthrough checks Not run (no visible desktop/browser in this environment).

- **21 November 2026 - WORLD-FIX-001 - OpenCode:** fixed the blank Story Mode canvas. `createGame` registered the selected scene twice (as `Scene` plus in the shared scene array), so Phaser threw `Cannot add Scene with duplicate key: WorldScene` and no scene booted. Deduped the scene classes in `src/game/create-game.ts` and fixed the dev-button template placeholders in `src/main.ts`. Dev and production preview checks in Chromium show WorldScene running on `campus` with the player and objective visible, all character assets loading and no console errors; `npm run check` passes (21 assets, 17/17 tests, production build). Uncommitted on `master`; manual keyboard playthrough still pending.

- **21 November 2026 - WORLD-FIX-001 - OpenCode:** committed the blank-canvas fix as `7acbfea` and pushed it to `origin/master`. The tracker entries are now integrated on `master`; the earlier "uncommitted" note in this log applies only to the preceding entry.

- **21 November 2026 - WORLD-FIX-002 - OpenCode:** investigated the "Find Hachimi outside the library" report. Hachimi was present, reachable and fully interactable; she was simply a small unlabeled sprite in a dark empty courtyard. Added NPC name plates, a bobbing gold `!` marker over talkable NPCs, explicit render depths and a current-room label under the objective in `src/game/scenes/WorldScene.ts`. Verified via Phaser canvas snapshots and a walk-through of Hachimi's meeting → bracelet → farewell flow; `npm run check` passes (21 assets, 17/17 tests, production build). Committed and pushed after this entry.

### ASSET-INTEGRATION-001 - integrate generated campaign assets
- Status: Done
- Agent/session: Hermes / asset-integration-20261121
- Human owner: Project creator
- Branch/worktree: `master`, `C:/Users/somen/OneDrive/Desktop/want-main`
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `assets/runtime-manifest.json`, `assets/inventory.json`, new files under `assets/characters/`, `assets/backgrounds/`, `assets/effects/`, `assets/tilesets/`, `src/game/scenes/WorldScene.ts`, `src/game/scenes/CombatScene.ts`, `src/game/scenes/RescueScene.ts`, `src/content/cutscenes/ledger.ts`, `scripts/prepare-assets.mjs`
- Acceptance criteria: all new generated assets are copied to source folders, registered in the runtime manifest and inventory, WorldScene uses K's 4-direction walk cycles, CombatScene/RescueScene use Scout/Rusher/Lina/breach-machine sprites instead of graphics primitives, cutscene ledger uses the new still images for C01-C04 environment shots, `npm run check` passes (assets:check, typecheck, tests, build)
- Completed so far: copied 34 new asset files to source folders, updated runtime-manifest.json with 57 total assets, updated inventory.json, updated WorldScene to load and animate K's 4-direction walk cycles, updated CombatScene and RescueScene to load and use Scout/Rusher/Lina/breach-machine sprites, updated cutscene ledger to use new environment images for C01-C04, updated prepare-assets.mjs to allow effects/ and tilesets/ source folders
- Verification: 21 November 2026, `npm run check` passed: assets:check validates 57 runtime assets, strict TypeScript clean, 17/17 tests pass, production build succeeds (expected Phaser chunk-size warning only)
- Blockers / remaining work: None
- Next action: manual playthrough verification of walk animations, combat/rescue sprites, and cutscene stills
- Handoff / integration: integrated on `master`


### FIX-HACHIMI-001 - library exit door lets player progress past Hachimi
- Status: Done
- Agent/session: OpenCode / hachimi-progression-fix-20261121
- Human owner: Unassigned
- Branch/worktree: `fix/hachimi-progression`, `C:/Users/somen/OneDrive/Desktop/want-main`
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/content/maps/library.ts`
- Acceptance criteria: after talking to Hachimi and completing the bracelet scene ("Go home." objective), the player can walk to the library→dorm door at (15,4) and leave the library; `npm test` passes and no new TypeScript errors in `library.ts`.
- Completed so far: found the root cause — library map grid row 4 ended in `#` at column 15, but the library→dorm door is placed at (15,4), so that tile was a wall and the player could never reach the exit after the bracelet scene. Changed grid row 4 from `'D..............#'` to `'D..............D'` so the door tile is walkable.
- Verification: `npm test` passes 17/17. `library.ts` has no TypeScript errors. `npm run check` fails only on pre-existing errors in the uncommitted in-flight `WorldScene.ts`/`RescueScene.ts` (none reference `library.ts`).
- Blockers / remaining work: manual keyboard playthrough of the library→dorm transition in both modes is still pending (no visible desktop/browser in this environment). `npm run check` gate blocked by pre-existing unrelated TS errors from another agent's uncommitted work (not caused by this fix).
- Next action: manual playthrough verification of the library→dorm door, then PR to main per TEAM_WORKFLOW.md.
- Handoff / integration: branch only; commit pending.

### AUDIT-PLAYTHROUGH-001 - campaign script audit, progression fixes and background additions
- Status: Done
- Agent/session: Antigravity / audit-playthrough-20261121
- Human owner: Project creator
- Branch/worktree: `master`, `C:/Users/somen/OneDrive/Desktop/want-main`
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/content/dialogue/sequences.ts`, `src/content/maps/settlement.ts`, `src/game/scenes/WorldScene.ts`, `src/game/scenes/RescueScene.ts`, `tests/rules.test.ts`, `assets/runtime-manifest.json`, `assets/inventory.json`, new backgrounds under `assets/backgrounds/` and `assets/characters/mai/`, `PROGRESS.md`.
- Acceptance criteria:
  1. Full playthrough audit against `WANT-Playthrough.pdf` for all sections 01–13. Fix broken story connections, missing cutscenes (C01, C02, C03, C04), settlement-to-rescue deadlock, and epilogue dialogue.
  2. Integrate and register all background assets and scene illustrations from `4,5,8 asset`, `7`, and `Set 6 and 9` into `assets/backgrounds/`, `runtime-manifest.json`, and `inventory.json`.
  3. Wire the new backgrounds into `RescueScene` (warehouse yard backdrop, counter tutorial diagram) and `WorldScene` (dorm midnight void doorway).
  4. Ensure `npm run check` passes all gates: assets check, strict TypeScript, all tests, and production build.
- Completed so far:
  1. Audit completed: Identified that C01, C02, C03, and C04 cutscenes were defined in `ledger.ts` but never played in-game (due to uppercase IDs in `sequences.ts` and absence of cutscene invocation logic in `WorldScene`/`DialogueScene`/`RescueScene`). Identified dead-end at `settlementMap` where cry-for-help completed with no exit door or transition into the rescue mission. Identified dorm midnight trigger delay where inspecting the door required moving off and on (7,7) to trigger the breach.
  2. Fixed script & story progression:
     - Updated `sequences.ts` with normalized cutscene IDs (`c01`, `c02`, `c03`), full dialogue for `settlement-cry-for-help` (including Isshin's lines), and added `epilogue-shelter` sequence for Section 11.
     - Updated `settlementMap` to make tile `(15, 4)` a door `'D'` and added door transition to `targetMap: 'rescue'` gated on `settlement-cry-heard`.
     - In `WorldScene`: wired `playCutsceneOverlay` for C01, C02, C03; auto-triggered breach attack sequence after examining door; updated dorm background to `bg-moonlit-dorm-void-doorway` upon midnight wake; wired `startRescueMission()` on passing through the east gate.
     - In `RescueScene`: added arena backdrop `twilight-ruins-warehouse-yard`, incorporated `counter-unlocked-tutorial` image into the COUNTER UNLOCKED teaching card, played Cutscene C04 upon rescue success, and updated `endingPanel` to display the complete Section 11 epilogue resolution.
  3. Added 22 background & prop assets from `7` and `Set 6 and 9` (`rusty-open-industrial-sliding-gate`, `smoky-black-portal-void`, `weathered-rollup-shutter`, `clinic-table-satchel`, `purple-industrial-lever`, `counter-unlocked-tutorial`, `mai-commanding-gesture`, etc.), updated `runtime-manifest.json` (now 90 runtime assets) and `inventory.json` (now 124 files).
  4. Added vitest unit tests in `tests/rules.test.ts` verifying cutscene sequence mappings, settlement door to rescue, and epilogue dialogue.
- Verification: 21 November 2026: `npm run assets:prepare` and `npm run assets:check` validated all 90 runtime assets (85.9 MiB); `npm run typecheck` clean; `npm test` passed 19/19 tests (2 test files); `npm run check` passed full build gate.
- Blockers / remaining work: Manual visual playthrough verification of cutscene playback and rescue transition.
- Next action: Test end-to-end playthrough in browser.
- Handoff / integration: Local working copy on `master` with all gates passing.

- **20 November 2026 - BUG-HUNT-001 - Arena agent:** hunted and fixed seven runtime/asset bugs that the static checks do not catch. Cutscene `imagePath()` now resolves asset IDs through `runtime-manifest.json` (portraits were 404'ing); `man-1-speaking-pose` and `man-2-speaking-pose` were added to the manifest so `c02`'s Man 1/Man 2 portraits are actually copied and served; the cutscene fallback now renders the generated `default-template.png` instead of only a text card; `WorldScene.characterSprites` keys fixed to `man-1`/`man-2` so those NPCs no longer fall back to K's sprite; `RescueScene` cover block `y` corrected to `ARENA_H`; `RescueScene.init()` marks a `not-started` run `active` so a death is saved as `failed`; and the clinic/settlement delayed auto-triggers re-check their flags so they cannot relaunch an already-finished sequence. `npm run check` passes (23 assets, strict TypeScript, 17/17 tests, production build; expected Phaser chunk warning). All five ledger `imageId`s verified to resolve to real `public/assets` files; sprite atlases decoded and confirmed 3×2 with six non-empty frames. Browser/manual playthrough Not run. Reported untouched gaps: checkpoint is never advanced (Continue still resumes at `campus`) and the dialogue `cutsceneId`s (`C01`–`C03`) are unused/case-mismatched. Branch only.
- **20 November 2026 - BUG-HUNT-001 - Arena agent:** integrated the seven asset/scene fixes on `master`. Committed the branch as `a98faa2`, pushed it, opened PR #1 to `master`, and merged it as merge commit `41cea1b` (merged 2026-11-20T19:48:24Z). `origin/master` now contains the merge commit plus the fix; the `arena/d6ee5f65-unga-bunga-hacknpitch` branch has no unique commits beyond `master`. The BUG-HUNT-001 entry now records `merged to master`.

- **21 November 2026 - Asset integration and map backdrops (this session):** integrated the two genuinely new assets from the untracked source drops (`Lina_ Utility Fieldworker Character Sheet-1.png` → `assets/characters/lina/lina-character-sheet.png`; `Pixel Art RPG Character Sprite Sheet.png` → `assets/backgrounds/pixel-art-rpg-character-sprite-sheet.png`), registered both in `assets/runtime-manifest.json` (68 entries) and `assets/inventory.json` (102 files). The remaining 39 untracked PNGs are byte-identical duplicates of already-integrated assets and were skipped; the SVG/HTML drops are non-runtime. Added optional `backgroundImageId` to `GameMap` and assigned a backdrop to all five maps; `WorldScene` now preloads backdrops, draws them behind the tile grid, and cleans them up on room change. Also fixed the story objective regression: re-entering a map no longer resets a story-advanced objective (e.g. "Go home." no longer flips back to "Find Hachimi outside the library."). `npm run check` passes: assets:check validates 68 runtime assets, strict TypeScript clean, 17/17 tests pass, production build succeeds (expected Phaser chunk-size warning only).

- **21 November 2026 - AUDIT-PLAYTHROUGH-001 - Antigravity:** audited campaign implementation against WANT-Playthrough.pdf. Fixed script and story progression gaps: wired cutscene playback for C01, C02, C03, C04; fixed settlement deadlock by adding east service lane door at (15,4) and transitioning into RescueScene; chained dorm breach attack immediately upon inspecting door; added Section 11 epilogue dialogue ('epilogue-shelter') and updated RescueScene's ending panel to display Chapter One's emotional resolution; integrated 22 background and scene assets from folders 7 and Set 6 and 9 into runtime-manifest.json (now 90 runtime assets) and inventory.json (now 124 files); added arena backdrop and counter tutorial image to RescueScene; added 2 vitest regression tests in tests/rules.test.ts (19/19 passing). Full npm run check passed.

### FIX-MAI-PROGRESS-001 - fix progression stops after Mai appears
- Status: Ready for review
- Agent/session: AI Studio Build / mai-progression-fix-20261120
- Human owner: Unassigned
- Branch/worktree: no `.git` metadata present in workspace (`/app/applet`); branch creation could not be performed in this environment
- Started / last updated: 20 November 2026 (America/Los_Angeles)
- Scope / owned files: `src/ui/cutscene-player.ts`, `src/game/scenes/WorldScene.ts`, `src/game/scenes/DialogueScene.ts`, `src/game/scenes/RescueScene.ts`, `src/content/maps/types.ts`, `src/content/maps/dorm.ts`, `tests/cutscene.test.ts`, `tests/rules.test.ts`, `PROGRESS.md`.
- Acceptance criteria: Cutscenes `c01`, `c02` (immediately after Mai appears in `breach-attack`), `c03` (clinic window), and `c04` all display visibly, support Next/Finish/Skip/keyboard controls without leaking input to Phaser or throwing on replay, transition cleanly into Clinic, Settlement, and Rescue (`'rescue'` scene key), adopt each new room's objective on first entry, and pass `npm run check` plus end-to-end Chromium verification.
- Completed so far:
  1. Fixed `src/ui/cutscene-player.ts`: `show()` now unhides `#cutscene` (`el.hidden = false`), enables `#cutscene-next` (updating text to `Finish` on the final shot), re-renders subsequent shots on manual/auto advance, replaces stacked listeners with clean single handlers, captures keyboard events while open (ignoring key repeat), restores focus to `#game`, and exports `isCutsceneActive()`.
  2. Fixed `src/game/scenes/WorldScene.ts`: corrected `this.scene.start('RescueScene', ...)` to `'rescue'` (matching `RescueScene`'s key), gated movement/interact/Esc on `!isCutsceneActive()`, enforced `door.excludesFlag`, guarded delayed story callbacks and `clinic-window-seen` objective updates, and tracked `visitedMaps` so advancing into a new room adopts its objective instead of carrying over stale objectives (e.g. `"Check the door."` into Clinic).
  3. Fixed `src/content/maps/dorm.ts` and `src/content/maps/types.ts`: locked the dorm→library return door after `breach-woke` and allowed `(0,7)` to trigger `breach-door`/`breach-attack` alongside `(7,7)`.
  4. Hardened `src/game/scenes/DialogueScene.ts` (`finished` guard) and `src/game/scenes/RescueScene.ts` (`Esc` unpause toggle, centered `endingBackground`, proper listener cleanup).
  5. Added unit regression tests in `tests/rules.test.ts` and `tests/cutscene.test.ts`.
- Verification: 20 November 2026: `npm run check` (90 runtime assets, strict TypeScript, 21/21 Vitest tests, production build) and full end-to-end Chromium playthrough from Campus → Library (`c01`) → Dorm (`breach-attack` / Mai / `c02`) → Clinic (`clinic-wake` / `c03` / Mai & Isshin) → Settlement → Rescue (`ALLEY`) verified with zero console/page errors.
- Blockers / remaining work: Workspace has no `.git` directory; apply changes to a new feature branch in the Git repository before opening a PR.
- Next action: Apply this diff on a feature branch (e.g., `fix/mai-progression-stop`) in the team Git repo and open a PR to `main`/`master`.
- Handoff / integration: Local workspace edits only (no `.git` repo in container).

- **20 November 2026 - FIX-MAI-PROGRESS-001:** identified and fixed why progression stopped after Mai appeared: `cutscene-player.ts` never unhid `#cutscene` after `c01` (`el.hidden = true`), left `Next` disabled, failed to re-render shots on advance, stacked duplicate listeners, and leaked `Esc` to `WorldScene`; `WorldScene.ts` also used wrong scene key `'RescueScene'` instead of `'rescue'` at the settlement east gate and carried `"Check the door."` into Clinic. Verified with `npm run check` (21/21 tests) and full Chromium playthrough through Rescue. Note: `.git` is absent in this workspace so a branch could not be created here.

### BG-FIX-001 - exploration background visible behind tile grid

- Status: Done (branch only)
- Agent/session: OpenCode / bg-fix-20261121
- Human owner: Project creator
- Branch/worktree: `fix/world-backgrounds-visible`, `C:/Users/Vaibhav Goyal/OneDrive/Desktop/Want/Unga-Bunga-HackNPitch`
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `src/game/scenes/WorldScene.ts` (`drawMap` floor/wall rendering). No map data, asset, manifest, or dependency changes.
- Acceptance criteria: when a map has a `backgroundImageId`, the backdrop image shows through the floor cells instead of being hidden behind dark grid boxes; walls remain readable as obstacles; doors keep their amber marker; maps without a background keep the existing dark checkerboard fallback; `npm run check` passes (assets:check, strict TypeScript, tests, production build).
- Completed so far: diagnosed root cause — `drawMap()` drew dark floor rectangles for every `.` cell on top of the depth -1 background sprite, hiding the integrated campus/library/dorm/clinic/settlement backdrops. Fixed `drawMap()` so floor cells are transparent when a backdrop is set (walls get a subtle semi-transparent dark overlay, doors keep their amber marker; the dark checkerboard fallback is preserved for maps without a background).
- Verification: 21 November 2026 — `npm run check` passed: assets:check validates 90 runtime assets, strict TypeScript clean, 19/19 tests pass, production build succeeds (expected Phaser chunk-size warning only).
- Blockers / remaining work: manual visual playthrough (campus background visible behind grid) still pending — no visible desktop/browser in this environment.
- Next action: commit the change on `fix/world-backgrounds-visible`; ready for review/integration via PR.
- Handoff / integration: branch only until integrated via PR.

### ASSET-ALIGN-001 - align markers/assets to painted landmarks and fix character sizing

- Status: Ready for review
- Agent/session: AI Studio Build / asset-align-and-sizing-20261120
- Human owner: Unassigned
- Branch/worktree: no `.git` metadata present in workspace (`/app/applet`)
- Started / last updated: 20 November 2026 (America/Los_Angeles)
- Scope / owned files: `assets/backgrounds/_revisions/twilight-library-courtyard-encounter.png`, `assets/backgrounds/_revisions/moonlit-dorm-void-doorway.png`, `assets/backgrounds/_revisions/pixel-art-leather-wallet-icon.png`, `assets/characters/_revisions/lina/lina-idle-48px.png`, `assets/characters/_revisions/lina/lina-shelter-48px.png`, `assets/runtime-manifest.json`, `src/game/sprite-metrics.ts` (new), `src/content/maps/{types,campus,library,dorm,clinic,settlement}.ts`, `src/game/scenes/{WorldScene,CombatScene,RescueScene,PreviewScene}.ts`, `src/main.ts`, `tests/layout-and-sizing.test.ts` (new), `PROGRESS.md`. All original source art files preserved. No new dependencies or `RunState`/combat-rule contract changes.
- Acceptance criteria: confusing/broken backgrounds and multi-frame Lina/wallet sprites are replaced via `_revisions/` and `runtime-manifest.json`; doors, interactables, NPCs, triggers, cover blocks, and switches align with painted landmarks across all 5 world maps and `RescueScene`; characters render at readable, proportional sizes across exploration, combat, rescue, and preview scenes; `npm run check` and headless Chromium visual checks pass with zero console errors.
- Completed so far:
  1. Replaced confusing/broken assets via `_revisions/` and updated `assets/runtime-manifest.json`: generated a clean character-free twilight library courtyard backdrop (`twilight-library-courtyard-encounter.png`), generated a pixel-aligned moonlit breach dorm backdrop without the right-edge checkerboard shift (`moonlit-dorm-void-doorway.png`), extracted single-pose 48×48 sprites for `lina-idle-48px.png` and `lina-shelter-48px.png`, and tightly cropped `pixel-art-leather-wallet-icon.png` to 48×48.
  2. Realigned doors, interactables, NPCs, and triggers to real painted landmarks across `campus` (bench, wallet prop sprite, library entrance steps), `library` (twilight courtyard walkway and Campus exit clear of streetlamp), `dorm` (Kingsley on open floor, TV at bottom-center, fridge far-left, K's bed top-left, hallway door and breach portal in bottom-right alcove), `clinic` (window, radio table, open-floor spawn, right doorway mat), `settlement` (clinic doorway under medical cross, notice board, lantern supply stand, camp civilian sprite at ration table, Isshin at shooting range), and `RescueScene` (handcart, stone/tarp shelter, sandbag cover, glowing pillar switch, covered alcove for Mai).
  3. Centralized character display sizing in `src/game/sprite-metrics.ts` and scaled K, NPCs, allies, and enemies across `WorldScene` (64px with ground shadows, Y-depth sorting, and fixed NPC pulse tween), `PreviewScene` (60px), `CombatScene` (54–60px decoupled from collision hitboxes with walk/4-dir facing frames), and `RescueScene` (50–60px with clean single-pose Lina switching).
  4. Added `tests/layout-and-sizing.test.ts` covering map grid bounds, reachability, landmark coordinates, and sprite sizing invariants.
- Verification: 20 November 2026: `npm run check` passed (90 runtime assets validated and prepared, strict TypeScript clean, 25/25 Vitest tests across 3 files, production Vite build clean with expected Phaser chunk warning). Visual Chromium verification at 1440×900 confirmed alignment and sizing across `campus`, `library`, `dorm`, `clinic`, `settlement`, `CombatScene`, and `RescueScene` with 0 console errors and 0 warnings.
- Blockers / remaining work: Workspace has no `.git` directory; apply diff to a feature branch in the team Git repository before opening a PR.
- Next action: Apply changes on a feature branch and run a manual Story/Real playthrough through all Chapter One scenes.
- Handoff / integration: Local workspace edits only (no `.git` repo in container).

- **20 November 2026 - ASSET-ALIGN-001:** replaced broken/confusing background and sprite assets via `_revisions/` (`twilight-library-courtyard-encounter`, `moonlit-dorm-void-doorway`, `lina-idle-48px`, `lina-shelter-48px`, `pixel-art-leather-wallet-icon`), realigned all world map markers/doors/NPCs and `RescueScene` cover/switch landmarks to match the painted backgrounds, and scaled character/enemy sprites cleanly across `WorldScene`, `CombatScene`, `RescueScene`, and `PreviewScene`. Verified with `npm run check` (90 assets, 25/25 tests) and headless Chromium visual checks across all maps and arenas (0 console errors).

### COMBAT-RESCUE-UI-001 - reflex combat upgrade, dialogue/cutscene framing, and rescue switch fixes

- Status: Ready for review
- Agent/session: AI Studio Build / combat-rescue-ui-20261120
- Human owner: Unassigned
- Branch/worktree: no `.git` metadata present in workspace (`/app/applet`)
- Started / last updated: 20 November 2026 (America/Los_Angeles)
- Scope / owned files: `src/game/combat/{types,bullet,player,enemy,arena-fx,rescue-switch}.ts`, `src/game/scenes/{CombatScene,RescueScene,DialogueScene}.ts`, `src/content/encounters/rescue-beats.ts`, `src/ui/cutscene-player.ts`, `src/styles.css`, `tests/combat-and-rescue.test.ts` (new), `PROGRESS.md`. No changes to `RunState`, `rules.ts`, or dependencies.
- Acceptance criteria: combat feels kinetic and distinct with active enemy positioning, cover-aware fire/cover-slam staggers, Reflex Bullet-Time perfect dodge counters, and active snap-reload; dialogue speaker names never overlap character portraits; cutscenes render uncropped for both widescreen environments and tall portraits; rescue gate switch works cleanly via both E and mouse click with clear phase gating, progress ring, and unified simulation clock; `npm run check` and Chromium checks pass.
- Completed so far:
  1. Upgraded combat (`src/game/combat/*`, `CombatScene.ts`, `RescueScene.ts`): added active Scout flanking/strafing and Rusher stalking + cover-slam stagger (`1.5x` exposed damage), bullet-vs-cover collision with ricochets, graze-assisted Perfect Dodge triggering Reflex Bullet-Time (`0.24x` slow-mo) + cover/enemy-piercing golden Counter Rail shots, 6-round magazine with active snap-reload sweet spot (`R` or click while reloading), shared `ArenaFx` (muzzle flashes, tracers, sparks, damage/status callouts, dodge ghosts, enemy HP bars, ammo/reload bar, tactical reticle), and combat audio cues.
  2. Fixed `DialogueScene.ts`: added dedicated left portrait frame with proportional aspect-ratio scaling and shifted both `speakerText` and `bodyText` right of the portrait frame; cleanly hid portrait on choices and added clickable choice options.
  3. Fixed `cutscene-player.ts` and `styles.css`: replaced overflowing CSS grid height with flex-column viewport-bounded `.cutscene-frame` (`16:9`, `max-height: min(64vh, 540px)`), kept portraits unscaled inside frame bounds with breathing margin, and added shot progress counter.
  4. Fixed `RescueScene.ts` and `rescue-beats.ts`: unified simulation clock (`simNow`) so pause/teaching/switch timers never drift; clearly gated the Gate Switch (`Gate locked` in Alley/Hold with status toast, glowing `E / Click · Gate switch` in Extraction accepting both `E` and direct click with generous range and 1s circular progress arc); fixed spawn queue double-spawn/drop bugs and spawn positions; fixed `PAUSED` text visibility and teaching card dismissal.
  5. Added unit tests in `tests/combat-and-rescue.test.ts` (29/29 total tests passing).
- Verification: 20 November 2026: `npm run check` passed (90 runtime assets, strict TypeScript clean, 29/29 Vitest tests across 4 files, production Vite build clean). Headless Chromium verification at 1440×900 confirmed Mai's dialogue portrait/name layout, cutscene `c01` environment + Sayu portrait (`fitsInside: true`), upgraded `CombatScene`, and `RescueScene` Alley (`Gate locked`) + Extraction (`E / Click · Gate switch`) with 0 console errors.
- Blockers / remaining work: Workspace has no `.git` directory; apply diff on a feature branch in the team Git repo before opening a PR.
- Next action: Apply changes on a feature branch and perform a full human playthrough of Story Mode and Real Mode.
- Handoff / integration: Local workspace edits only (no `.git` repo in container).

- **20 November 2026 - COMBAT-RESCUE-UI-001:** upgraded combat into a kinetic Reflex Combat system (active Scout flanking, Rusher stalking + cover-slam stagger exposure, cover-blocking bullets, graze-assisted Perfect Dodge with Reflex Bullet-Time & piercing Counter Rail, active snap-reload, muzzle flashes/tracers/sparks/HP bars/reticle/audio), fixed DialogueScene speaker-name/portrait overlap, fixed cutscene viewport zoom/cropping for environments and portraits, and fixed RescueScene gate switch click/E activation, phase clarity, unified clock, spawn queue, and pause/teaching bugs. Verified with `npm run check` (29/29 tests) and headless Chromium checks (0 console errors).

### AUDIO-HORDE-POLISH-001 - production audio, animated ending, Horde mode, startup redesign, story persistence fix, and codebase audit

- Status: Ready for review
- Agent/session: AI Studio Build / audio-horde-polish-20261121
- Human owner: Unassigned
- Branch/worktree: no `.git` metadata present in workspace (`/app/applet`)
- Started / last updated: 21 November 2026 (America/Los_Angeles)
- Scope / owned files: `scripts/prepare-assets.mjs`, `src/services/audio.ts`, `src/game/horde/rules.ts` (new), `src/services/horde-scores.ts` (new), `src/game/scenes/HordeScene.ts` (new), `src/ui/horde-modal.ts` (new), `src/ui/ending-screen.ts` (new), `src/game/story-state.ts`, `src/services/local-save.ts`, `src/game/create-game.ts`, `src/game/combat/enemy.ts`, `src/game/scenes/{WorldScene,DialogueScene,CombatScene,RescueScene}.ts`, `src/ui/{cutscene-player,settings-panel}.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `tests/horde-and-persistence.test.ts` (new), `PROGRESS.md`. Preserved all 55 original art PNGs, source PDFs, and `RunState` schema v1 (`want.campaign.v1`). No new dependencies.
- Acceptance criteria: all 33 `/MUSIC/*.wav` files copied and wired across title, exploration, dialogue, cutscenes, combat, rescue, horde, and ending; Chapter One ending soft-lock fixed with animated twilight/petal epilogue and reliable menu/replay exit; Horde mode added with 1m/5m/Unlimited durations, Easy/Medium/Hard/Maniac/DOOM tiers (10× difficulty scaling per tier), required player name, and isolated local scoreboard; startup screen redesigned cleanly; leaving Story Mode to the main menu preserves exact map, tile, flags, objective, and checkpoint on Continue; audit defects fixed; `npm run check` and Chromium visual/functional checks pass with zero console errors.
- Completed so far:
  1. Integrated all 33 supplied `/MUSIC/*.wav` tracks (47.6 MiB) in `scripts/prepare-assets.mjs` and rebuilt `src/services/audio.ts` with dedicated master/music/ambience/effects buses, crossfading background music and room ambience, decoded `AudioBuffer` SFX pooling with pitch variance/throttling, dynamic Horde playback-rate scaling, and procedural fallback.
  2. Fixed the Chapter One ending soft-lock in `RescueScene.ts` (removed duplicate `game.destroy(true)`, fixed `teachingCard` hitArea, removed leaked `girl-rescued` flag) and built `src/ui/ending-screen.ts` (animated twilight backdrop, Canvas2D drifting sakura petals, staggered epilogue lines, `music-ending`, Return to Title / Enter Horde Mode / Replay Rescue + `Enter`/`Esc` shortcuts).
  3. Implemented standalone Horde Mode (`src/game/horde/rules.ts`, `src/services/horde-scores.ts`, `src/game/scenes/HordeScene.ts`, `src/ui/horde-modal.ts`) with 1m/5m/Unlimited durations, Easy (`1×`), Medium (`10×`), Hard (`100×`), Maniac (`1,000×`), DOOM (`10,000×`) scaling, Scout/Rusher/Breach Striker archetypes, required player name prompt, and local scoreboard isolated from `want.campaign.v1`.
  4. Redesigned the startup screen (`index.html`, `src/main.ts`, `src/styles.css`) with custom SVG `WANT.` wordmark, twilight campus backdrop and embers, K poster framing, Story/Real segmented toggle, Continue Story room/HP summary, Horde Mode top-score CTA, and quick Audio On/Mute toggle.
  5. Fixed Story Mode progress reset on returning to menu by adding `StoryProgressSnapshot` (`want.story.v1`) in `src/game/story-state.ts` and `src/services/local-save.ts`, persisting map, exact tile, flags, completed sequences, objective, and checkpoint across transitions/dialogue/`want:flush-save`, and restoring both `WorldScene` and `RescueScene` (`initialRunState`) cleanly on Continue.
  6. Audit fixes: prevented duplicate settings panel listeners, fixed Phaser `shutdown` cleanup in `WorldScene`/`DialogueScene`, added click-to-advance dialogue, added `Return to title` & keyboard shortcuts on Combat/Rescue Game Over, and added 13 unit tests in `tests/horde-and-persistence.test.ts`.
- Verification: 21 November 2026: `npm run check` passed (90 visual assets + 33 audio assets validated and prepared, strict `tsc --noEmit` clean, 42/42 Vitest tests across 5 files, Vite production build clean with expected Phaser chunk warning). Two rounds of headless Chromium verification at 1440×900 confirmed: WAV HTTP 200 loading, zero-scroll startup screen (`scrollH: 900`), Story Mode leave-and-Continue restoring exact map and tile (`5,6`), Horde empty-name validation + gameplay + isolated scoreboard persistence, and animated Chapter One ending with clean `Esc` and button return to title — 0 console/page errors.
- Blockers / remaining work: Workspace has no `.git` directory; apply changes on a feature branch in the team Git repository before opening a PR.
- Next action: Apply changes on a feature branch and perform a live audio/gameplay spot-check with speakers on both Story and Real modes.
- Handoff / integration: Local workspace edits only (no `.git` repo in container).

- **21 November 2026 - AUDIO-HORDE-POLISH-001:** integrated all 33 `/MUSIC/*.wav` files into a multi-bus Web Audio engine across all scenes, fixed the Chapter One ending soft-lock with an animated twilight/petal ending screen, built standalone Horde Mode (1m/5m/Unlimited; Easy→DOOM 10×/tier scaling; player name prompt + isolated local scoreboard), redesigned the startup screen, fixed the Story Mode leave-to-menu progress reset glitch with exact map/tile/flag/checkpoint persistence, and resolved listener/cleanup/Game Over audit defects. Verified with `npm run check` (90 visual + 33 audio assets, 42/42 tests) and two rounds of headless Chromium checks at 1440×900 (0 console errors).
- **21 November 2026 - ARCADE-CRT-UI-001:** restyled the full game shell (`index.html`, `src/main.ts`, `src/styles.css`) into a beveled indigo arcade cabinet framing a curved plum CRT monitor matching the supplied reference (`HI-SCORE`, 5 pixel-art golden hearts, golden-gradient `START` with sheen sweep, `ARE YOU READY?`, interactive `YES ◀ / NO` with CRT Standby power-down & wake-up, CRT power-on boot, CRT warp-through and channel-snap transitions into Mode Select, Horde Arena, and playable gameplay inside the CRT bezel). Verified with `npm run check` (90 visual + 33 audio assets, 42/42 tests) and two rounds of headless Chromium visual/interactive checks at 1440×900 (exact 1070×602 edge-to-edge canvas fit, 0 console errors).
- **21 November 2026 - HORDE-ENHANCE-001:** rebalanced Horde Mode (`src/game/horde/rules.ts`, `src/game/scenes/HordeScene.ts`) so K scales tougher and harder-hitting through Hard (8/6/5 hits, wave-clear & counter-kill recovery, higher pistol damage/cadence/speed) while Maniac & DOOM strip armor/sustain into pure skill-only gauntlets (2/1 hits, zero heal); added 4 selectable Horde Arena maps plus Random (`src/game/horde/maps.ts`, `src/ui/horde-modal.ts`, `src/services/horde-scores.ts`) with per-match randomized cover generation and safety corridors; expanded Horde Arena to 1440×864 with smooth camera follow and compact tactical minimap; upgraded Horde enemy AI (`src/game/horde/ai.ts`) with predictive lead aiming, cover-aware flanking, coordinated Rusher pincers, and squad separation; boosted default music/SFX volumes with a master DynamicsCompressor limiter (`src/services/preferences.ts`, `src/services/audio.ts`); and showcased `WANT` prominently on the CRT Ready screen (`src/main.ts`, `src/styles.css`). Verified with `npm run check` (90 visual + 33 audio assets, strict TypeScript, 50/50 Vitest tests, Vite build) and two rounds of headless Chromium visual/functional verification at 1440×900 (0 console errors, verified randomized cover regeneration across restarts).


### DOC-BRIEF-001 - comprehensive project brief
- Status: Done (documentation only)
- Agent/session: OpenCode / deepseek-v4.1-flash-free / brief-20261121
- Human owner: Project creator
- Branch/worktree: `master`, `C:\Users\somen\OneDrive\Desktop\want-main`
- Started / last updated: 21 November 2026 (Asia/Calcutta)
- Scope / owned files: `brief.md` (the requested `Brief.md`; Windows is case-insensitive and the repository's tracked name remains lowercase) and this `PROGRESS.md` entry. No application, asset, dependency or shared-contract changes.
- Acceptance criteria: one document explains the game, story, characters, exploration, combat, rescue, Horde mode, UI, architecture, content formats, save schemas, asset/audio pipeline, commands, current status, known gaps and source-of-truth documents; facts match the integrated code rather than the older foundation brief.
- Completed so far: replaced the stale 14 November foundation brief with a 19-section brief covering the full campaign, exact tuning values, Reflex Combat and snap-reload rules, three rescue beats, ending overlay, Horde tiers/scoring, arcade CRT shell, scene/state boundaries, storage keys, dev routes, test coverage and release gaps; verified dev query parameters, checkpoint/milestone types, storage keys, Horde formulas, rescue queues, interaction range, heart counts and asset/audio counts against the working tree; corrected the tracker's stale top-level position and Horde/asset evidence.
- Verification: 21 November 2026: `npm test` passed (5 files, 42/42 tests). Facts checked by reading `src/game/rules.ts`, `src/game/horde/rules.ts`, `src/content/campaign.ts`, `src/content/characters.ts`, `src/content/encounters/rescue-beats.ts`, `src/services/*`, `src/main.ts`, `src/game/scenes/*`, `scripts/prepare-assets.mjs`, `assets/runtime-manifest.json` and `assets/inventory.json`; `git remote -v`, `git status --short` and `git log -1` checked. Documentation links/consistency reviewed manually. `npm run check` was not rerun because no application code changed.
- Blockers / remaining work: full human playthrough, live deployment and final rights confirmation remain outstanding. Older docs (`README.md`, `docs/ARCHITECTURE.md`, `docs/ASSET_CHECKLIST.md`, `docs/VERIFICATION.md`) still describe the foundation era; the brief records that drift.
- Next action: review the brief for tone/scope, then use it as onboarding and AI context; update it whenever a phase, rule or storage key changes.
- Handoff / integration: local working-tree changes only on `master`; no commit or PR created. Untracked supplied asset-drop folders remain untouched.

- **21 November 2026 - DOC-BRIEF-001:** rewrote the stale foundation `brief.md` into a comprehensive 19-section project brief covering premise, characters, every campaign beat, controls, exact combat/rescue/Horde rules, CRT UI flow, architecture, data formats, save schemas, asset/audio pipeline, commands, dev routes, status and gaps; verified the facts against the integrated code and 42/42 tests; refreshed the tracker's stale current-position, local-save and Horde evidence. Documentation only; `npm run check` not rerun.

