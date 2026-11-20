# WANT - phase-by-phase development guidebook

The goal is a complete, understandable 20-25-minute story game in four working days, followed by offline-event polish. A phase is finished only when its playable result and human checks pass. Do not ask an AI to build all phases in one prompt.

## 1. Working agreement

- Read `DECISIONS.md` first. Read `PLAYTHROUGH.md` for story and `COMBAT_DESIGN.md` for battles. They resolve questions another AI would otherwise guess.
- Keep a working `main` branch. Each person uses their own local clone and one small feature branch. Never share a live OneDrive working folder between developers.
- Assign one owner per subsystem and one integrator for shared files. Use `TEAM_WORKFLOW.md` for the exact workflow.
- At every handoff, state: implemented behavior, modified files, verification evidence, known limits, next task. AI-generated work still requires a human playthrough.
- Do not create horde progression, mobile controls, multiplayer, or extra missions while the campaign is incomplete.

## 2. Four-day delivery map

| Day | Coder A: integration/world | Coder B: combat | Coder C: AI-assisted support | Teammate D: content/QA |
| --- | --- | --- | --- | --- |
| 1 | Verify foundation; world slice and route | Isolated shooting/dodge/one enemy | Dialogue renderer and supplied-script entry | Inventory, source rights, walk sprites/tiles, test controls |
| 2 | Integrate opening through camp | Counter, second enemy, damage/death | Cutscene/audio work; menus and save UI | Missing art/audio; time fresh-player opening |
| 3 | Integrate all rescue beats and ending | Tune rescue; fix collision/retry | Save/continue; Vercel preview; cloud only if ready | Full playthroughs in both modes, report blockers |
| 4 | Freeze features; integration fixes | Fairness/performance fixes | Deployment checks; offline fallback rehearsal | Final QA, captions/credits, demo rehearsal |

The third coding role is optional capacity, not a requirement. If that person cannot deliver code, A owns simple dialogue/UI and B owns combat; D helps with data entry. Reduce media quantity before cutting the ending. Do not spend Day 4 inventing another mechanic.

## 3. Reusable prompt preface

Paste this before each phase build prompt and replace the bracketed details:

```text
You are working in the WANT repository. Read AGENTS.md, docs/DECISIONS.md,
docs/ARCHITECTURE.md, and the assigned phase in docs/GUIDEBOOK.md.
Task: [one phase slice]. Owner: [name]. Branch: [branch].
Allowed files: [paths]. Other contributors currently own: [paths].
Inspect existing code before editing. Implement only this task, preserve supplied
art and story, and keep the app runnable. Ask about a real contract conflict;
do not silently redesign it. Do not add future horde/mobile features.
Run npm run check plus the task-specific checks. Report changed behavior,
evidence, remaining limits, and a short handoff. Do not claim a manual test
unless it was actually performed.
```

For a check prompt, use a fresh AI conversation when possible, point it at the current branch/diff, and ask for evidence rather than a generic approval. One reviewer cannot certify game feel without playing.

## Phase 0 - verify and assign (foundation supplied)

**Outcome:** every teammate runs the same preview; the repository and assets are understood. Allow 30-60 minutes at kickoff.

**Build/setup prompt**

```text
Verify the supplied WANT foundation without implementing later phases.
Read README and docs/VERIFICATION.md. Run npm ci and npm run check.
Launch the preview; check title menu, difficulty labels, controls dialog,
grid collisions and E interaction. Confirm no Supabase credentials are needed.
Report actual failures and the exact next Phase 1 task. Preserve the original PDFs.
```

**Independent check prompt**

```text
Audit the Phase 0 foundation against README. Distinguish implemented behavior
from planned features. Verify asset paths/frame sizes, no accidental secret keys,
health/retry tests, and reproducible production build. Flag any claim that the
campaign, real-time combat, sound, or cloud sync is already complete.
```

**Manually check:** fresh clone works; K appears; walls block movement; press/hold two directions; E works only near the marker; leave/re-enter several times; tab through menus; record actual teammate names in `TASK_BOARD.md`; confirm organizer rules on prebuilt work. Gate: all machines can launch and the two main coders agree on shared interfaces.

## Phase 1 - one convincing exploration slice

**Owner:** A. **Depends on:** Phase 0. **Deliverable:** campus path to library, using a real tilemap or small data grid, with a door transition. Build the dorm/camp on this pattern, not a separate movement implementation.

**Build prompt**

```text
Implement Phase 1 only: a top-down campus slice using four-direction grid steps,
solid collisions, a bounded camera, K, one NPC, one interactable, and one door.
Use supplied assets where suitable; keep missing directional animations labelled
as temporary. NPC interaction requires adjacency and facing. Add a visible current
objective and E prompt. Prevent movement while dialogue is open. Put map data
under src/content/maps and behavior in WorldScene. Keep the combat coordinate
system separate. Preserve the foundation preview as a development route.
```

**Check prompt**

```text
Review Phase 1 for wall clipping, diagonal input, held-key transitions, camera
bounds, NPC overlap and repeated door triggers. Verify tile position agrees with
rendered position. Verify unknown/missing map IDs fail visibly rather than crash.
Report reproduction steps and only actionable findings.
```

**Manually check:** all four directions; corners; repeated held input; interact from too far away; exit/re-enter a room; browser resize; dialogue interrupts movement; a new player finds the library without instruction from the developer. Gate: two connected rooms and one interaction work without console errors.

## Phase 2 - opening story through the settlement

**Owner:** C with A integrating. **Depends on:** Phase 1 world contract; text entry can start earlier. **Deliverable:** campus, dorm, breach, arrival and wrong-person reveal, ending at free exploration.

**Build prompt**

```text
Implement the opening through settlement exploration from docs/PLAYTHROUGH.md.
Create data-driven dialogue with speaker IDs, optional portraits, line advance,
instant text reveal, and completion flags. Use short readable chunks for Mai's
explanation. Include objectives and the three local settlement interactions.
Story choices may change a response but not the main ending. Keep the breach a
scripted survival scene; do not add an unwinnable combat game. Add placeholder
cutscene IDs for Phase 4. Dialogue skip must reach the same story state as reading.
```

**Check prompt**

```text
Compare the implementation to the authoritative script and revised playthrough.
Check scene order, names, Kingsley/K mistaken identity, 2026/2085, quest flags,
and no accidental success before rescue. Try rapidly advancing, holding E,
skipping, and revisiting NPCs. Confirm one press cannot both reveal and dismiss
a newly shown line. Check long lines and missing portrait fallback.
```

**Manually check:** read all mandatory dialogue; no clipped text at 1366x768; portraits do not cover text; no movement/fire through a dialogue box; skip and read paths converge; players understand that K is not the target and why he feels rejected. Gate: a newcomer reaches the cry for help and knows their objective within about 15 minutes.

## Phase 3 - isolated real-time combat

**Owner:** B. **Depends on:** Phase 0 rules; can proceed alongside Phases 1-2. **Deliverable:** a development arena with Scout, Rusher, pistol, dodge, counter and defeat.

**Build prompt**

```text
Implement Phase 3 in an isolated CombatScene using docs/COMBAT_DESIGN.md.
Use continuous normalized movement, mouse-world aiming, fire, Space dodge,
telegraphed enemy attacks, perfect-dodge detection and one timed counter shot.
Use rules.ts and RunState; apply Story multipliers at every spawn. Start with
one enemy of each type and cap active enemies. Damage must be frame-safe using
attack IDs/invulnerability. Freeze everything on pause/focus loss/defeat.
Create a development-only launch path; do not alter unfinished story routing.
```

**Check prompt**

```text
Try to break combat: overlap two bullets, stay inside a collider, dodge into a
wall, move diagonally, resize while aiming, hold fire during pause, retry 10 times,
and vary frame rate. Verify one attack cannot award multiple counters, a missed
counter window is harmless, two Real hits kill, four Story hits kill, and scene
changes never heal. Examine timer/input cleanup and death-versus-milestone races.
```

**Manually check:** first attack has a readable cue; every hit feels explainable; counter has both text and visual signal; one dodge cannot cross walls; pause actually pauses bullets and timers; run both modes; novice can use the counter after one explanation; no sudden offscreen spawn damage. Gate: 3 minutes of combat without a stuck state, and difficulty behavior is verified by playing.

## Phase 4 - cutscenes, sound and readable menus

**Owner:** C/D. **Depends on:** Phase 2 cutscene IDs; can start with media placeholders. **Deliverable:** a small reusable still-image sequence player and consistent audio/settings.

**Build prompt**

```text
Implement the cutscene ledger in docs/PLAYTHROUGH.md with still images, captions,
optional restrained pan/zoom, and a visible skip/advance control. Use original
art safely; do not pretend a character poster is an environment scene. Add music,
effects and master volume/mute after a user gesture. Persist preferences locally.
Reduced motion replaces pan/shake with static views. If a supplied video is used,
handle load/play rejection with a still and text fallback. Keep source files intact
and record every new media source in the credits ledger.
```

**Check prompt**

```text
Review first-interaction audio unlock, mute persistence, overlapping scene music,
rapid skipping, missing media, focus loss and reduced motion. Confirm skip and
normal completion apply identical story flags exactly once. Check that every
essential sound has an on-screen cue and that subtitles remain readable.
```

**Manually check:** start with speakers low; first click unlocks sound; mute works in every scene and after reload; no layered music after a retry; reduced motion removes camera shake/pan; cutscene skip never leaves input locked; each required video has a still fallback. Gate: at least three key story moments are presented cleanly and gameplay remains understandable muted.

## Phase 5 - rescue mission and complete ending

**Owner:** A integrates; B owns encounter tuning. **Depends on:** Phases 1-3; media may still be placeholder. **Deliverable:** one start-to-finish campaign.

**Build prompt**

```text
Implement the three rescue beats in docs/COMBAT_DESIGN.md and the ending in
docs/PLAYTHROUGH.md. Add Lina, the alley, 45-second shelter hold, counter teaching,
fixed enemy queue, Isshin support, extraction switch and Mai's safe marker.
Preserve health across all beats. Only reaching safety grants girl-rescued and
full recovery, exactly once. Failure kills K, blocks story progression, and shows
Game Over with explicit Restart rescue mission. Retry resets this mission, not
the campus/dorm story, and starts with full health. No alternate dead-girl branch.
```

**Check prompt**

```text
Trace every rescue transition and failure path. Can the player win without Lina
reaching safety, heal by re-entering a room, duplicate a milestone, leave enemies
alive after Game Over, or reload out of a failed attempt? Verify restart resets
the counter teaching, enemy queue, objective timer, projectiles and switch hold.
Verify no death/skip input advances the ending. Check the optional horde mode is
not a dependency of any campaign scene.
```

**Manually check:** lose in each beat; restart from each failure; carry a wound into the next beat; test Story and Real; save/reload while wounded; activate the extraction switch under pressure; ensure Lina's safe arrival triggers recovery only once; complete the ending without using developer shortcuts. Gate: two clean full playthroughs, one per mode, with all failures recoverable through the intended retry.

## Phase 6 - saving, release setup and optional cloud

**Owner:** A/C. **Depends on:** Phase 5 stable state. **Deliverable:** trustworthy Continue, settings, a Vercel preview, and optional cloud only after local saving works.

**Build prompt**

```text
Wire validated local saves into the campaign, with a Continue menu and explicit
new-run confirmation. Save accepted damage and milestone/unlock/failure state,
not just location. Extend/version the save schema for rescue beat/time as needed;
never restore fresh health on reload. Invalid/unavailable storage must show an
honest message and allow local play without overwriting recoverable data silently.
Follow docs/DEPLOYMENT.md for the Vercel build. If time remains, implement optional
Supabase passwordless cloud saving using the prepared own-user RLS migration,
explicit opt-in and a local/cloud conflict choice. Guest play must remain instant.
```

**Check prompt**

```text
Audit load/save with malformed JSON, a future schema, storage blocked/full,
death/reload, mid-rescue wounds, duplicate milestones and two competing saves.
Audit browser bundles/environment variables for secrets. If cloud is enabled,
perform A/B account isolation and signed-out tests from supabase/README.md.
Check production static paths, refresh, cold startup and failed requests.
Distinguish local build success from verified deployed/cloud behavior.
```

**Manually check:** new browser profile starts without login; Continue restores exact health/difficulty; Game Over survives reload; optional auth does not interrupt a fight; local/cloud conflict choice is understandable; Vercel URL loads on someone else's machine; no mandatory remote asset requests. Gate: local saves plus public demo tested. Cloud is allowed to remain disabled and clearly labelled if its checks are incomplete.

## Phase 7 - freeze, measure and rehearse

**Owner:** everyone; D tracks failures. **Depends on:** Phase 5 full loop and Phase 6 local persistence. **Deliverable:** a stable submission, not more scope.

**Fix-only prompt**

```text
Feature freeze for WANT. Use the attached playtest findings [paste issues].
Fix the highest-impact reproducible blocker in the assigned files only. Preserve
story, save compatibility, difficulty and the ending. Run npm run check and the
specific failed user journey. Do not refactor unrelated systems or add features.
Give before/after reproduction evidence and any remaining regression risk.
```

**Release review prompt**

```text
Audit the exact release candidate against docs/GUIDEBOOK.md, DECISIONS.md and
TASK_BOARD.md. Inspect the actual deployed build, not only dev mode. Review complete
Story and Real playthrough evidence, death/retry, saves, mute, captions, keyboard
navigation, scene cleanup, credits and missing assets. Return blocker/high/low
findings with reproduction steps; explicitly list anything not tested.
```

**Manually check:** a new tester finishes without coaching; time 20-25 minutes as a target, not a fabricated claim; readable on 1366x768 and 1920x1080; acceptable performance on a teammate's weaker laptop; all pause/mute/skip/retry paths; browser back/refresh; no debug controls in judge build; credits/source ledger correct; live URL and local fallback both work. Record median FPS, startup time and asset transfer on the actual machines rather than claiming universal targets passed.

## 4. Cut order when time is tight

Cut extra portraits/expressions, optional NPC conversations, video, camera flourishes, optional cloud, and a second enemy skin in that order. Keep the readable opening, wrong-person reveal, movement, one fair enemy, dodge/counter, rescue, ending, local saves, difficulty/death/retry rules, captions, mute, and a working deployed URL.

If the counter is not fair by Day 3, simplify its detection and widen its window; do not replace it with XP leveling. If art is late, use clean, consistent labelled placeholders in development and reduce the number of scenes requiring new illustrations. Never disguise missing features as completed phases.

## 5. After the campaign is accepted

Use `OPTIONAL_HORDE_GUIDE.md` for separate combat/leveling phases. Phone controls, fullscreen touch UI, localization, additional chapters, account linking, and accessibility remapping go into a later improvement backlog. Each needs its own acceptance checks; none belongs in the last pre-event merge.
