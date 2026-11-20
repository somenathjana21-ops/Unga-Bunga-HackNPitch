# WANT - shared agent progress

**Read this at the start of every task. Update it before editing, after meaningful progress or a blocker, and before handing work back.** The detailed rules are in [AGENTS.md](AGENTS.md).

Last updated: 14 November 2026 (Asia/Calcutta).

This is the authoritative record of implementation status and agent handoffs. [The task board](docs/TASK_BOARD.md) supplies the planned ownership and dependencies; [decisions](docs/DECISIONS.md) define the agreed game; [verification](docs/VERIFICATION.md) holds detailed test evidence. The PDFs are planning snapshots, not live progress trackers.

## Current position

- **Delivered:** Phase 0 foundation, original asset inventory, runnable title/exploration preview, campaign-state/save helpers, development guides and playthrough PDFs.
- **Last recorded code verification:** 9 November 2026, on `86e36cc`: clean install, full check (seven tests) and Chromium production-preview checks passed. See P0-VERIFY-001 below and [earlier foundation evidence](docs/VERIFICATION.md).
- **Not implemented:** full story scenes, real-time combat/counter, rescue mission, audio/cutscenes, campaign Continue UI, cloud sync, and horde progression.
- **External setup:** foundation snapshot `0c507d8` is committed on local `main`. This checkout has an `origin` remote. Teammate access and live Vercel/Supabase setup remain team tasks.
- **Next recommended work:** each teammate verifies Phase 0, owners are assigned, then separate contributors can claim Phase 1 world, Phase 2 dialogue, and Phase 3 isolated combat slices according to the guide's dependencies.

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
| P1 | Exploration world | Not started | Real campus/dorm/camp maps; preview room is only a proof. |
| P2 | Dialogue and opening story | Not started | Playable opening through settlement, including skip/read paths. |
| P3 | Real-time combat | Not started | Pistol, dodge, enemies, counter, both difficulties, fair damage. |
| P4 | Cutscenes, audio and settings | Not started | Media, mute, captions, reduced motion, reliable skip. |
| P5 | Rescue and ending | Not started | Complete route, all failure/retry paths, milestone recovery. |
| P6-LOCAL | Continue/local saves and Vercel release | Not started | Helpers/config exist; campaign wiring and deployed checks remain. |
| P6-CLOUD | Optional Supabase authentication/saves | Deferred | After local saves; live isolation and conflict checks required. |
| P7 | Full playtest and release freeze | Not started | Fresh-player timing, both modes, target hardware and release evidence. |
| H0-H5 | Separate horde/leveling mode | Deferred | Only after campaign acceptance; see optional guide. |

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
- **20 November 2026 - P3-001 - OpenCode:** implemented isolated Phase 3 real-time combat. Added `src/game/combat/types.ts`, `damage.ts`, `player.ts`, `enemy.ts`, `bullet.ts` and `src/game/scenes/CombatScene.ts`; wired scene selection into `src/game/create-game.ts`; added a dev-only `Combat test (dev)` launch path in `src/main.ts` gated by `import.meta.env.DEV` (story routing untouched; no assets/manifest changes, combat rendered with temporary graphics placeholders labeled as such). Behavior: continuous normalized movement (no diagonal speed advantage), mouse-world aim, pistol fire + Space dodge, telegraphed Scout (800 ms windup then shot) and Rusher (lane then charge) attacks, perfect-dodge counter ("COUNTER - CLICK" text + yellow ring, one per attack ID, no stacking), Story/Real enemy-health and damage multipliers at every spawn (30/60 HP, 25/50 damage), cap 4 active enemies with safe-edge spawning, frame-safe damage via attack IDs + 1000 ms invulnerability, freeze on pause/focus loss/defeat via an effective clock, Game Over with dev restart that clears enemies/bullets/timers/windows. `npm run check` NOT run — Node.js is unavailable in this environment; TypeScript reviewed manually for strictness.
