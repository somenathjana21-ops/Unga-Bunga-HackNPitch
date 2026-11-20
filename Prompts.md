# WANT — Prompt Library (The Mother Document)

**Version 1.0 · November 2026**

This file contains every prompt the team sends to AI agents. Nothing is improvised: if a task isn't here, add the prompt here first, then use it.

## How to use this file

1. Copy the prompt block exactly.
2. Replace every `{{placeholder}}`:
   - `{{WORKTREE}}` — your worktree path / branch (`phase/<n>-<name>`).
   - `{{SECTION}}` — paste the relevant excerpt of `WANT-Playthrough.pdf` for the beat you're building. **Never skip this.** Agents that guess the story invent wrong canon.
   - `{{ASSETS_FOLDER}}` — path to the folder containing the existing 2D character art (the `assets/` folder).
   - `{{PHASE}}` — current phase number/name.
3. Send the **build prompt**, then the matching **check prompt**, then do the **human manual test** yourself. Agent output is unverified until all three are done.
4. Report results to the team, and wait for the **Orchestration Prompt** to be run before starting the next phase.

## Universal preamble — paste at the top of EVERY prompt

```
You are an AI development agent working on WANT, a 2D top-down story-driven browser game
with real-time combat, for desktop keyboard + mouse. You are working inside the git
worktree at {{WORKTREE}} on branch {{WORKTREE_BRANCH}}.

GROUND RULES (violating any of these is a failure):
- Read docs/decisions.md and docs/asset-ledger.md before writing code.
- Follow the repo conventions in the Guidebook exactly (folder structure, asset manifest module).
- Never add copyrighted material. Never add assets not in docs/asset-ledger.md.
- Never restructure folders, rename modules, or change global conventions without asking me first.
- Ship a static site: no server-side code, no build-time server, no backend.
- Target 60fps on a mid-range desktop browser. Auto-pause on tab blur is mandatory.
- Keep the code modular (ES modules). No hidden timers, no secret fail states, no
  uninterruptible player animations.
- The authoritative design doc is WANT-Playthrough.pdf (excerpt pasted below). If anything
  here conflicts with your assumptions, the playthrough wins.
- When you finish, list: files changed, how to run, what you verified, and what you did NOT verify.

RELEVANT PLAYTHROUGH EXCERPT:
{{SECTION}}
```

---

# PART 1 — GROUP A: DEVELOPMENT PROMPTS

## P-A0 — Phase 0: Repository scaffold (Owner: Dev 3)

**Build prompt:**

```
[P-A0 BUILD] Set up the WANT repository scaffold in {{WORKTREE}}.

Create the full folder skeleton exactly as the Guidebook specifies:
src/core, src/world, src/story, src/combat, src/ui, src/systems,
assets/{characters,backgrounds,portraits,illustrations,audio/sfx,audio/music,vfx},
docs/, tests/manual.

Then implement:
1. index.html entry point + a minimal game shell: canvas, fixed-timestep loop,
   resize handling, tab-blur auto-pause, FPS guard (logs if below 50 sustained).
2. src/core: input module (keyboard + mouse, action mapping), camera module stub,
   collision/AABB helpers, math helpers.
3. src/systems/asset-manifest.js: the single module through which ALL assets are
   referenced and loaded. Other code never hardcodes asset paths.
4. src/systems/audio.js stub: master/music/sfx volume buses, mute, with graceful
   silence when files are missing (Group B's assets land later).
5. docs/decisions.md seeded with: engine choice and why, module system, folder
   conventions, git worktree workflow. docs/asset-ledger.md seeded with its table header.
6. A dev harness: `npm run dev` (or equivalent static serve) plus a headless check
   command that verifies the shell boots with zero console errors.
7. A tests/manual/PHASE-0.md checklist file with the items you want a human to verify.

Do NOT build any gameplay yet. Verify the shell boots clean before finishing.
```

**Check prompt:**

```
[P-A0 CHECK] Verify the Phase 0 scaffold in {{WORKTREE}} without changing anything.
1. Does every Guidebook folder exist with the exact names given?
2. Does the game shell boot with zero console errors in a headless browser?
3. Is the main loop fixed-timestep with delta-time clamping? Prove it from the code.
4. Does tab blur pause the loop and resume cleanly on focus?
5. Does src/systems/asset-manifest.js exist and is it the ONLY place asset paths appear?
   grep the codebase for direct asset path strings outside that module and report any hit.
6. Does docs/decisions.md record the engine/module/worktree decisions?
7. Does the dev harness command in the README actually work, from a clean clone state?
Report PASS/FAIL per item with file:line evidence. Do not fix anything; report only.
```

**Human manual test (walk it yourself):**
- [ ] `npm run dev` serves the game; page loads with no console errors.
- [ ] Resize the window: canvas scales, no distortion.
- [ ] Switch tabs mid-run: game pauses; returning resumes.
- [ ] Folder skeleton matches the Guidebook exactly.

---

## P-A1 — Phase 1: Core loop & player controller (Owner: Dev 1)

**Build prompt:**

```
[P-A1 BUILD] Build the core loop and player controller in {{WORKTREE}} on branch phase/1-core.

From the playthrough: exploration uses modest top-down pixel scenes; control lessons
happen in scene 01 (move, interact, read a phone). Combat input (mouse aim) comes in
Phase 4 — design input now so it extends cleanly.

Implement:
1. Top-down 2D player controller: WASD/arrows movement with acceleration and a
   satisfying stop, 4-direction facing (matches the eventual 4-direction K walk cycle),
   walk speed tuned for story scenes (~90-120 px/s feel; expose as a constant).
2. Collision against tile/prop AABBs; slide along walls, no sticking on corners.
3. Camera: smooth follow with lookahead, clamped to scene bounds.
4. Interaction system: proximity + facing check, interaction marker, single "interact"
   key (E). Fire an event other systems can subscribe to. Support "Hold E with progress
   ring, interrupted by damage" as a planned API (implement the ring UI now, used later
   for the gate).
5. Player spawn/teleport API for scene transitions.
6. A gray-box test scene with a few props to prove all of the above.
7. Update tests/manual/PHASE-1.md with a human checklist.

Placeholder visuals are fine (colored rectangles). Do not build environments,
dialogue, combat, or UI beyond the interaction marker and hold ring.
```

**Check prompt:**

```
[P-A1 CHECK] Verify Phase 1 in {{WORKTREE}}. Report PASS/FAIL with evidence; change nothing.
1. Movement: constant-acceleration model, configurable walk speed, clean stops — cite code.
2. Four-direction facing states exist and map to movement direction.
3. Collision: sliding works, no corner sticking. Write and run an automated corner-slide
   test if a harness exists; otherwise describe the exact manual repro steps.
4. Camera: smooth follow + lookahead + clamped to bounds. No jitter at scene edges.
5. Interaction: marker appears within range, respects facing, E fires the event, and the
   Hold-E ring fills over the configured duration and resets if released.
6. Zero console errors; 60fps in the gray-box scene; tab-blur pauses.
7. No gameplay outside scope crept in (no dialogue boxes, no enemies, no shooting).
```

**Human manual test:**
- [ ] Walk all four directions; stops feel intentional, not icy.
- [ ] Rub along walls and corners — never stick or jitter.
- [ ] Camera leads movement and never shows out-of-bounds.
- [ ] Interact marker appears/disappears correctly; E works; hold ring behaves.

---

## P-A2 — Phase 2: World kit & Act 1 environments (Owner: Dev 2)

**Build prompt:**

```
[P-A2 BUILD] Build the world kit and the 2026 Act 1 environments in {{WORKTREE}}
on branch phase/2-world.

Relevant playthrough sections: scenes 01 (campus approach), 02 (library courtyard),
03 (dorm room). Budgets: ~2 min each. {{SECTION}}

Implement:
1. Scene system: declarative scene definitions (tile layers, prop colliders, spawn
   points, exits, triggers), scene transition API with fades.
2. Environments as data, using Group B's tiles if present in the asset manifest,
   otherwise clearly-labeled placeholders: campus street with crossing, faculty
   library courtyard, dorm interior (bed, door light, TV, fridge).
3. Objective HUD: current objective text, top-left or top-center, updates via event.
4. Trigger volumes: enter-area events, one-shot flags (e.g., wallet drop scene beat,
   phone vibration beat from scene 01) with the event bus from Phase 1.
5. Exits that teleport between scenes.
6. tests/manual/PHASE-2.md checklist.

Do NOT build dialogue UI (Phase 3), combat, or cutscenes. Scene beats fire placeholder
console/log events so Phase 3 can hook them.
```

**Check prompt:**

```
[P-A2 CHECK] Verify Phase 2. Report PASS/FAIL with evidence; change nothing.
1. Three scenes exist and match the playthrough's geography: campus street + crossing,
   library courtyard, dorm interior with bed/door-light/TV/fridge props.
2. Scene transitions fade cleanly; spawn points land the player sensibly.
3. Objective HUD updates via events and reflects at least: reach library, go home,
   check the door (as placeholders wired to triggers).
4. One-shot trigger flags: re-entering a scene cannot replay an already-fired beat
   (e.g., the wallet drop).
5. Colliders cover all walls/props; no walk-through tiles.
6. 60fps, zero console errors, tab-blur pause intact.
7. No dialogue boxes or combat crept in.
```

**Human manual test:**
- [ ] Walk campus → courtyard → dorm; every transition smooth.
- [ ] Objective text changes at the right moments.
- [ ] Wallet drop beat fires once; walking back over the crossing doesn't replay it.
- [ ] No prop is walk-through.

---

## P-A3 — Phase 3: Story kit — dialogue, portraits, cutscenes (Owner: Dev 2)

**Build prompt:**

```
[P-A3 BUILD] Build the story kit in {{WORKTREE}} on branch phase/3-story.

Relevant playthrough sections: scenes 01–06 (all Act 1 dialogue, the bracelet scene,
dorm scene, breach) and the Production ledger (portraits, composed illustrations,
cutscene rules). {{SECTION}}

Implement:
1. Dialogue system: typewriter text with text-speed setting, speaker name, portrait
   left/right, advance/advance-instant controls, and data-driven dialogue scripts
   (JSON/JS data files keyed by beat id).
2. Portraits via the asset manifest (placeholders allowed until Group B delivers).
3. Cutscene framework: timeline of captions/illustrations/camera holds/input locks,
   skippable; skip and normal completion set the SAME story flags. Implement C01
   (library/bracelet, ~12–18s) and C03 (ruined skyline pan, 10–15s) for real; stub
   C02 and C04 with the correct flag contracts.
4. Wire the full Act 1 + clinic beat chain as data: phone calls (Nero, unknown
   caller), Hachimi courtyard scene, bracelet drop (C01), Kingsley dorm scene,
   TV news reporter lines, sleep interaction, breach beats with sound captions
   (C02 stub), waking in the 2085 clinic, Mai's exposition split into playable
   inspection beats, scene 06 serum-match result screen ("SERUM MATCH: NEGATIVE"),
   objective hand-off to "Explore the settlement".
5. Sound captions for audio cues (mandatory for mute accessibility).
6. Reduced-motion mode respected by the cutscene framework.
7. tests/manual/PHASE-3.md checklist.

Rules from the playthrough: no dialogue longer than one lesson; hold the bracelet
illustration only as long as needed; dialogue can reveal instantly; return input
reliably after every cutscene.
```

**Check prompt:**

```
[P-A3 CHECK] Verify Phase 3. Report PASS/FAIL with evidence; change nothing.
1. Every beat in scenes 01–06 exists as data and fires in order with correct flags:
   wallet, Nero call, unknown call, Hachimi, bracelet/C01, Kingsley dorm, TV news,
   sleep, breach/C02 stub, clinic wake, Mai exposition, serum screen, explore objective.
2. Skip-vs-complete flag parity: write a test or scripted check that skips C01 and
   confirms every flag normal completion would set is set.
3. Typewriter respects text-speed setting; advance-instant works; no soft-locks if
   the player mashes keys.
4. Sound captions appear for every audio cue in these beats (mute-safe).
5. Cutscenes: C01 ≈ 12–18s, input returns reliably after finish AND after skip;
   reduced-motion mode honored.
6. Dialogue data matches the playthrough's lines (spot-check 10 lines verbatim).
7. Zero console errors through the entire beat chain start-to-clinic.
```

**Human manual test:**
- [ ] Play start → clinic without skipping: every call, scene, and interaction lands.
- [ ] Skip C01: the story continues exactly as if watched.
- [ ] Mute the game: every cue still has a text/shape equivalent.
- [ ] Set text speed to max: dialogue still paces fine.

---

## P-A4 — Phase 4: Combat core (Owner: Dev 1)

**Build prompt:**

```
[P-A4 BUILD] Build the combat core in {{WORKTREE}} on branch phase/4-combat.

Relevant playthrough sections: scene 07 (Isshin's range lesson: "Aim, fire, move"),
scene 08 (Scout then Rusher), scene 09 (COUNTER unlock), the difficulty rules, and
the Production ledger's sound/combat needs list. {{SECTION}}

Implement:
1. Pistol: mouse aim (cursor direction), fire on click, projectile with readable
   tracer, ammo-less per the playthrough (no ammo system), rate-of-fire constant.
2. Player health + damage: hit feedback (flash/knockback), i-frames, death event.
   Wounds carry between battles — NO healing between combat beats.
3. Dodge: dash with i-frames on a cooldown, direction from movement keys (or toward
   cursor if idle), with a brief visual trail.
4. Enemies (bounded-arena AI, two types only):
   - Scout: marks a firing lane, telegraphed shots, keeps mid range.
   - Rusher: unmistakable charging warning (windup + sound cue + telegraph), then a
     committed charge with recovery exposing a joint.
5. Telegraphs: every enemy attack has a clear visual/audio warning. No undodgeable
   attacks. Enemy projectiles are readable.
6. Counter system: dodging through a near hit shows the COUNTER ring prompt; clicking
   during the window fires a bonus shot into the exposed joint with sharper feedback.
   Implement the counterUnlocked flag (false until scene 09's teaching card).
7. Arena boundaries for combat spaces; combat entered/exited via events.
8. Sound hooks for every action (pistol, enemy windup, dodge, counter, hit) via the
   audio buses — silent fallbacks if Group B's files aren't in yet.
9. tests/manual/PHASE-4.md checklist.

Do NOT build the rescue mission flow (Phase 5), horde mode, or extra enemy types.
```

**Check prompt:**

```
[P-A4 CHECK] Verify Phase 4. Report PASS/FAIL with evidence; change nothing.
1. Every enemy attack has both a visual telegraph AND a sound hook; list them.
2. Scout behavior: marks lane → fires → repositions; never shoots instantly.
3. Rusher: windup duration is humanly reactable from first exposure; charge is
   dodgeable; recovery exposes the counter window.
4. Counter: only available when counterUnlocked=true; window timing is consistent;
   a perfect dodge (through the hit) triggers the prompt, a normal dodge does not.
5. Damage: i-frames prevent multi-hit from one attack; wounds persist — verify no
   code path heals between combat beats.
6. 60fps with 3 simultaneous enemies (the playthrough's max) plus projectiles.
7. No ammo system, no XP, no extra enemy types, no combat outside arenas.
```

**Human manual test:**
- [ ] Kill a Scout and a Rusher using only movement + shots — feels fair.
- [ ] Perfect-dodge a Rusher charge: COUNTER appears; the counter shot lands hard.
- [ ] Take hits: feedback is clear, no unfair multi-hits, health stays down afterwards.
- [ ] Mute: every combat cue still readable visually.

---

## P-A5 — Phase 5: The rescue mission chain (Owner: Dev 1 + Dev 2)

**Build prompt:**

```
[P-A5 BUILD] Build the complete rescue mission in {{WORKTREE}} on branch phase/5-rescue.

Relevant playthrough sections: scenes 07–12 in full — alley fight, shelter hold with
the 45-second gate timer, COUNTER unlock card, extraction, game over/restart, mission
boundary and checkpoint rules. {{SECTION}}

Implement:
1. Mission boundary: entering the alley shows "Entering a dangerous area — progress
   before this mission is saved."
2. Scene 08: Lina behind the delivery cart, medicine bag pinned, her barks; solo
   Scout → Rusher fight in the east lane; no health restore on crossing into scene 09.
3. Scene 09: radio call with Isshin's 45 seconds; the COUNTER UNLOCKED teaching card
   (still diagram, dismissible, sets counterUnlocked); fixed waves from marked entries,
   MAX 3 active attackers; Lina stays behind hard cover (scripted, no health sim);
   failure condition is K's death only.
4. Scene 10: final Rusher on the route; Hold-E gate switch with 1s progress ring,
   INTERRUPTED by damage; Lina's scripted extraction to Mai; success requires Lina at
   Mai AND K alive — lethal hit first means death wins, no revival.
5. Rescue success: stop hostile sim, set girl-rescued once, restore K to full health
   ("Resolve restored" cue), C04 sequence, scene 11 epilogue and ending card
   "WANT — Chapter One: The Wrong Person".
6. Game over: collapse + "GAME OVER — K couldn't make it through"; buttons "Restart
   rescue mission" / "Return to title"; restart = alley boundary, full health, selected
   difficulty, NO counter unlock, fresh enemies, uncompleted timer, closed gate, story
   flags intact. Persist failed status immediately (localStorage); reload must not
   resurrect K.
7. Checkpoint save/resume for a non-failed interrupted rescue: beat, health, objective
   time, unlock state; resume at the beat's safe spawn with those values.
8. tests/manual/PHASE-5.md checklist.

Rules: Lina is never a damageable escort; no secret second timer; the player can win
with ordinary shots — the counter is an advantage, never a mandatory QTE.
```

**Check prompt:**

```
[P-A5 CHECK] Verify Phase 5. Report PASS/FAIL with evidence; change nothing.
1. Play the full rescue twice: once flawlessly, once dying in each combat beat
   (alley, hold, extraction). Every death offers the correct restart, and restart
   state matches the spec EXACTLY: full health, no counter unlock, fresh enemies,
   timer reset, gate closed, pre-mission flags intact.
2. Reload the page on the Game Over screen: still Game Over (persisted), not alive.
3. Hold-E: progress ring fills in ~1s; any damage interrupts and resets it; K is
   never locked in an uninterruptible animation.
4. Wave director: never more than 3 active attackers; entries are marked; the 45s
   timer and Isshin's arrival behave per script.
5. Success logic: Lina-at-Mai + K-alive is the precise win condition; verify a
   simultaneous death loses.
6. After success: full heal once ("Resolve restored"), C04 plays, epilogue reachable,
   ending card shows, credits/return-to-menu work. No empty horde-mode button exists.
7. Save/resume mid-mission restores beat+health+timer+unlock exactly; a checkpoint
   never converts wounds into full health.
```

**Human manual test:**
- [ ] Full rescue run start-to-ending feels like the emotional payoff the playthrough describes.
- [ ] Die in the hold: restart is fast and fair; the counter teaching replays correctly.
- [ ] Close the tab mid-hold, reopen: resume exactly where you left off, wounds intact.
- [ ] Beat the hold without ever countering: still possible.

---

## P-A6 — Phase 6: Systems — difficulty, persistence, settings, audio (Owner: Dev 3)

**Build prompt:**

```
[P-A6 BUILD] Build the meta systems in {{WORKTREE}} on branch phase/6-systems.

Relevant playthrough sections: "Difficulty" (Story Mode halves enemy health and
incoming damage; Real Mode kills K on his second damaging hit from full health),
"Failure, pause and continuation" (pause, settings, saves), and the sound list. {{SECTION}}

Implement:
1. Difficulty modes: Story (enemy HP ×0.5, incoming damage ×0.5) and Real (K dies on
   his 2nd damaging hit from full health). Selected at new game; stored in the save.
2. Pause (Esc): all combat clocks, timers, and companion actions pause. Settings:
   master/music/effects volume, mute, reduced motion, text speed. Cutscene skip and
   dialogue reveal already exist from Phase 3 — verify they integrate.
3. Full save model on localStorage: chapter/beat, health, objective, unlocks, flags,
   difficulty, failed status. Continue from title. If storage is unavailable, show an
   honest message — never claim progress is saved when it isn't.
4. Audio integration: wire every hook Group A created to Group B's delivered files via
   the manifest; verify each plays and respects the volume buses; verify missing files
   fail silent with a console warning (not an exception).
5. Run the asset-ledger conformance check: every file referenced by the manifest
   exists AND every delivered asset file is referenced somewhere (or marked unused
   in the ledger). Report violations; don't silently fix.
6. tests/manual/PHASE-6.md checklist.
```

**Check prompt:**

```
[P-A6 CHECK] Verify Phase 6. Report PASS/FAIL with evidence; change nothing.
1. Story vs Real: verify the multipliers from the enemy/damage code paths, not the UI.
   In Real Mode, two full-health hits kill; in Story Mode, survival is clearly longer.
2. Esc pause: every moving thing in the rescue (enemies, projectiles, timers, Lina's
   script, hold ring) freezes; resume is clean.
3. Save/load round-trip: play to the hold, quit, continue — same beat, health, timer,
   unlocks. Corrupt the localStorage entry by hand: game reports it honestly and
   offers title, no crash.
4. Audio: every named hook from the playthrough's sound list has a wired file or a
   logged missing-file warning. Volume buses independently affect their buses.
5. Ledger conformance: zero unledgered referenced files; zero orphan delivered files.
```

**Human manual test:**
- [ ] Both difficulties end-to-end (Story for speed, Real for the 2-hit death rule).
- [ ] Every settings slider does something; mute silences everything except captions.
- [ ] Continue after days away: exactly where you left off.

---

## P-A7 — Phase 7: Polish & browser appeal (Everyone, one shared worktree by agreement)

**Build prompt:**

```
[P-A7 BUILD] Polish pass in {{WORKTREE}} on branch phase/7-polish. You own NOTHING —
everything is in scope, coordinate via the team channel first.

Priority order (playthrough-aligned):
1. Emotional-beat illustrations: C01 bracelet drop, C02 breach silhouettes, C03
   skyline, C04 K standing between Lina and the machines — with restrained movement
   and captions, using Group B's illustrations.
2. Juice: hit-stop micro-frames on counter kills, screen shake (respects reduced
   motion), muzzle flash, impact particles, wave-entry flashes.
3. Transitions: scene fades, day→night dorm shift, illustration wipes.
4. Browser appeal: favicon, page title, loading screen with progress, proper canvas
   scaling/letterboxing, cursor treatment for aim.
5. Performance pass: profile the rescue; fix the top 3 costs; hold 60fps with all
   effects on.
6. tests/manual/PHASE-7.md checklist.

Do not add features. Polish what exists. Every effect must respect reduced motion.
```

**Check prompt:**

```
[P-A7 CHECK] Verify Phase 7. Report PASS/FAIL with evidence; change nothing.
1. All four cutscenes use delivered illustrations (no placeholder rectangles remain).
2. Reduced motion ON: zero screen shake, flashes replaced with fades, pans become
   static views — verify in code paths, not just settings.
3. 60fps during the heaviest rescue moment with every effect active.
4. No new gameplay features crept in (diff gameplay = fail).
5. Loading screen works on a throttled connection; no unstyled flash of the game.
```

**Human manual test:** the "show it to a friend" test — 5 minutes, no instructions, watch where they smile and where they get confused.

---

## P-A8 — Phase 8: Full verification (Owner: Dev 3)

**Build prompt:**

```
[P-A8 BUILD] Final verification pass in {{WORKTREE}} on branch phase/8-verify.
1. Automated smoke: boot → new game → Act 1 chain → clinic → rescue → ending, with
   scripted input. Any console error = fail.
2. Timing audit: measure each scene's runtime; compare to the playthrough's budgets;
   report overruns — tune walk speeds and beat spacing, don't cut content silently.
3. The playthrough's five playtest questions answered with observed evidence.
4. Fix only defects. Anything needing design input goes to the team channel, not the code.
```

**Check prompt:** the P-A8 check is a full human playthrough by all three members, each on their own browser, using tests/manual/FULL-RUN.md, followed by the orchestration prompt and the `v1.0-campaign` tag.

---

## P-A-ORCH — The Orchestration Prompt (run by ANY member after every phase)

```
[ORCHESTRATE PHASE {{PHASE}}] You are orchestrating WANT's worktrees. Worktrees:
- Dev 1: phase/<n>-core     - Dev 2: phase/<n>-world/story  - Dev 3: phase/<n>-systems

Steps:
1. Confirm all three members reported their phase Check results as PASS (ask me for
   the reports; if any FAIL, STOP and list the blockers).
2. Merge all phase branches into main, one at a time, in order: world/story first,
   then core, then systems (story provides the scaffolding the others hook into).
3. Resolve conflicts conservatively: never invent behavior — when two branches touch
   the same line, prefer the branch that owns that subsystem per the Guidebook, and
   log every conflict resolution in docs/decisions.md.
4. Run every phase check prompt that exists so far against the MERGED build. Any
   FAIL = stop, revert nothing, report precisely.
5. Boot the merged game, run the gray-box/scene smoke, confirm zero console errors.
6. Tag main as v0.{{PHASE}} and write a 5-line release note: what landed, known issues,
   what the next phase must know.
7. Tell me exactly what to announce to the team.
```

---

## P-A-DEBUG — General debug/testing prompt (any member, any time)

```
[DEBUG] Symptom: {{DESCRIPTION}}. Repro steps I used: {{STEPS}}.
Work in {{WORKTREE}}. First reproduce it, then find root cause with evidence
(file:line), then propose the minimal fix BEFORE applying it. After fixing, add a
regression check (automated if a harness exists, else a tests/manual entry) so this
class of bug can't return silently. Verify the fix in the merged build, not only
your worktree. Report: root cause, fix, regression check location.
```

---

# PART 2 — GROUP B: CREATIVE PROMPTS

## P-B1 — Asset research & requirement analysis (run FIRST, before any generation)

```
[ASSET RESEARCH] You are the creative agent for WANT, a 2D top-down pixel browser
game (desktop). Before generating anything, analyze what already exists.

STEP 1 — ANALYZE EXISTING ART: Look at every image file in {{ASSETS_FOLDER}} (the
project's existing 2D character art). For EACH image, record:
- filename, dimensions, style (pixel art / illustration / other), color palette,
  perspective (top-down? side? portrait?), and which character it depicts
  (compare against WANT's cast: K, Kingsley, Hachimi, Sayu, Nero, Mai, Isshin, Lina,
  Man 1, Man 2, the news reporter, civilians, and machines: Scout, Rusher).
- which existing assets are usable as-is for: top-down walk cycles, combat poses,
  speaking portraits, cutscene illustrations — and which are NOT usable and why
  (wrong perspective, wrong style, incomplete set).

STEP 2 — DERIVE THE ASSET MANIFEST: From the playthrough's Production ledger and
scenes 01–11, produce the complete required-asset list, grouped:
A. CHARACTERS: per character — 4-direction walk cycle frames, idle, combat/dodge
   frames, portraits (speaking), cutscene illustration needs. Note K needs the full
   set; Mai/Isshin can be static combat positions for chapter one.
B. ENVIRONMENTS: campus street + crossing tiles, library courtyard, dorm interior,
   clinic/settlement tiles, alley/gate arena, barriers/cover/door props, 2085 ruined
   skyline panorama (for C03).
C. ILLUSTRATIONS: C01 bracelet drop, C02 breach silhouettes, C03 skyline,
   C04 K shielding Lina.
D. VFX: muzzle flash, projectiles (player + enemy, readable), telegraphs, dodge
   trail, counter ring, hit sparks, SCAN MISMATCH optics (red→purple), gate sparks.
E. UI: objective banner, interaction markers, hold-E ring, COUNTER prompt, difficulty
   and settings iconography, title/ending cards.

STEP 3 — WRITE THE GENERATION PROMPT FILE: Create docs/asset-prompts.md containing,
for every asset or asset batch, a ready-to-use generation prompt that pins:
- exact pixel-art style derived from the analyzed existing art (describe the style
  in words: line weight, palette, shading, proportions) so new assets MATCH the cast;
- camera/perspective per use (top-down 4-dir for walk cycles, bust for portraits,
  composed scene for illustrations);
- transparent background where required; canvas size; frame counts for cycles;
- negative constraints (no text in image, no watermarks, no extra limbs).

STEP 4 — GAP REPORT: List what the existing assets folder already covers vs. what
must be generated, and flag anything the playthrough needs but nobody has proposed.

Deliverables: this analysis + docs/asset-prompts.md + a summary table I can paste
to the dev team.
```

## P-B2 — SFX & music requirements listing

```
[AUDIO RESEARCH] List the complete audio requirements for WANT before sourcing anything.

From the playthrough's sound list (UI confirm, footsteps, phone vibration, ambient
loops, pistol, enemy windup, dodge, counter, hit, gate, victory/failure) plus the
beat structure (campus calm, breakup, breach horror, 2085 ambience, alley combat,
45s hold, ending), produce:

1. SFX LIST: a table — name, trigger event in-game, duration target, character
   (sharp/soft/lo-fi/etc.), loop Y/N. Include: UI confirm/cancel, footsteps (2
   surfaces: pavement, interior), phone vibration, wallet pickup, interaction,
   dialogue blip, pistol fire, empty-click (if any), enemy windup (Scout & Rusher,
   distinct), enemy shot, Rusher charge, player hurt, dodge whoosh, counter chime +
   counter kill impact, hit spark, gate opening/closing, explosion (muffled, C02),
   machine SCAN sound, "Resolve restored" cue, game-over sting, victory sting,
   wave-entry alert for the future horde mode.
2. MUSIC LIST: per-context loops — campus/day calm (2–3 min loop), tense pulse
   (unknown caller → library), breakup (thin/strings), dorm night ambience (music
   optional, ambience required), breach (horror stinger + silence design), 2085
   clinic/settlement ambience (dystopian ambient loop), alley/hold combat loop
   (drivable, ~1–2 min loop that layers intensity for the 45s hold), ending/credits
   (reflective), title theme. Note intensity-layering ideas for the hold.
3. SOURCING CONSTRAINTS: free / no-copyright / CC0 / properly licensed for a free
   browser game; preferred sources (e.g., OpenGameArt, Freesound with CC0 filter,
   Kevin MacLeod/incompetech with attribution, Pixabay); each must be logged in
   docs/asset-ledger.md with URL + license before integration.
4. Output docs/audio-requirements.md with the two tables and sourcing notes.
```

## P-B3 — Asset generation batch (run per batch, using docs/asset-prompts.md)

```
[ASSET GENERATION — BATCH {{NAME}}] Generate the assets defined in
docs/asset-prompts.md under section {{NAME}}.
Rules:
- Match the existing cast style exactly as pinned in the style description; if a
  generated asset visually clashes with the analyzed reference art, regenerate.
- Transparent PNG where the spec says so; exact canvas sizes from the spec.
- Walk cycles: complete frame sets, all 4 directions, consistent timing anchors.
- Save into the Guidebook's assets/ folders (characters/, backgrounds/, portraits/,
  illustrations/, vfx/ — never into src/).
- After each asset: append a row to docs/asset-ledger.md (file, source, license,
  prompt used, which beat uses it). NO ledger row = the asset does not exist.
- Report a contact sheet (grid preview) of this batch for human review before
  telling the dev team it's ready.
```

## P-B4 — Asset QA check

```
[ASSET QA] Check the latest delivered batch in assets/ without modifying files:
1. Every file has an asset-ledger row with source + license (list violations).
2. Style-match spot check: compare 5 assets side by side with the reference art from
   {{ASSETS_FOLDER}} — same palette family, line weight, and perspective per use.
3. Technical check: correct dimensions vs. spec, transparency where required,
   no baked-in text/watermarks, walk cycles have all frames and directions.
4. Manifest readiness: filenames are kebab-case, no spaces; list any that would
   break src/systems/asset-manifest.js conventions.
Report PASS/FAIL per item. Do not fix; report.
```

## P-B5 — Creative delivery handoff (to the dev team)

```
[DELIVERY HANDOFF] Summarize this delivery for the dev team in 10 lines or fewer:
what landed (paths), what changed vs. last delivery, anything devs must know
(renames, replacements, known gaps), and the preview sheet location.
```

---

# PART 3 — OPTIONAL: HORDE MODE WORKTREE (mirrors Group A discipline)

> Runs on branch `phase/horde-mode` in its own worktree. Whoever owns it (Group B
> member or a Group A volunteer) follows the same Build → Check → Orchestrate rhythm.
> Imports the combat core from `src/combat` — never copies it.

## P-H1 — Horde Mode scaffold & design brief

```
[HORDE BUILD 1] In worktree {{WORKTREE}} (branch phase/horde-mode), build the horde
mode scaffold for WANT.
1. Write docs/horde-design.md first: arena layout from settlement/alley tiles; wave
   director design; spawn entries with telegraphs; enemy composition escalation
   (Scout/Rusher mixes, then combos); scoring/survival framing; and three
   difficulties: Story / Real / MANIAC.
   MANIAC SPEC (non-negotiable): higher max simultaneous enemies, faster windups
   with shorter dodge windows, carried wounds within a run, zero mid-run heals,
   denser waves. Brutal but fair — every death must be explainable by a missed
   telegraph. Include a draft enemy cap table per difficulty.
2. Implement the mode shell: menu entry (locked with "Finish the campaign on Real
   Mode to unlock" — plus a playtester konami-style code), arena scene loading via
   the scene system, and the wave director skeleton spawning waves with marked
   entries and caps per difficulty.
3. IMPORT combat from src/combat via the existing module APIs. If an API you need
   is missing, add it to the combat module IN CONSULTATION with its owner — do not
   fork combat code. Flag every needed API addition in your report.
4. tests/manual/HORDE-1.md checklist.
```

## P-H2 — Horde Mode waves & Maniac tuning

```
[HORDE BUILD 2] Implement the full wave experience per docs/horde-design.md:
escalating waves with rest beats, intensity-layered music hook points, score/timer
HUD, death screen with wave reached, and the complete Maniac tuning pass. Verify
Maniac is beatable-but-hell by scripted playtests at several skill profiles: track
damage sources for every scripted death and confirm each traces to a missed
telegraph. tests/manual/HORDE-2.md checklist.
```

## P-H3 — Horde Mode check

```
[HORDE CHECK] Verify the horde worktree: 
1. grep proof that src/combat was imported, not copied (zero duplicated combat files).
2. Cap table enforced in code per difficulty; Maniac parameters match the design doc.
3. Every death in 20 scripted runs traces to a readable telegraph (attach the log).
4. 60fps at Maniac peak density; tab-blur pause; zero console errors.
5. Unlock gating works: locked before Real-completion, konami code works for playtest.
```

## P-H4 — Horde orchestration

```
[HORDE ORCHESTRATE] Merge phase/horde-mode into main AFTER the campaign is tagged
v1.0-campaign. Run P-H3's checks against the merged build, confirm the campaign is
untouched (run the Act 1 smoke), tag v1.0-horde, and write the release note.
```

---

# Appendix — Prompt index

| ID | Prompt | User |
|---|---|---|
| P-A0 | Phase 0 scaffold | Dev 3 |
| P-A1 / check | Core loop & controller | Dev 1 |
| P-A2 / check | World kit & Act 1 environments | Dev 2 |
| P-A3 / check | Dialogue, portraits, cutscenes | Dev 2 |
| P-A4 / check | Combat core | Dev 1 |
| P-A5 / check | Rescue mission chain | Dev 1+2 |
| P-A6 / check | Difficulty, saves, settings, audio | Dev 3 |
| P-A7 / check | Polish & browser appeal | Everyone |
| P-A8 / check | Full verification | Dev 3 |
| P-A-ORCH | Orchestration (every phase) | Any member |
| P-A-DEBUG | Debug/testing | Any member |
| P-B1 | Asset research (run first) | Group B |
| P-B2 | SFX & music requirements | Group B |
| P-B3 | Asset generation batch | Group B |
| P-B4 | Asset QA | Group B |
| P-B5 | Delivery handoff | Group B |
| P-H1–H4 | Horde mode (optional worktree) | Group B / volunteer |
