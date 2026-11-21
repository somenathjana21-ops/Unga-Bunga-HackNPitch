# WANT — Complete Project Brief

**One file that explains the game, the rules, the codebase, and how to work on it.**

Last updated: 21 November 2026 · Repository snapshot: `master` at `fe372b4` · Re-verified this session: `npm test` 42/42 passing (5 files), `npm run assets:check` 90 visual + 33 audio assets

> **How to use this document**
> - **New human contributor:** read sections 1–6 for the game, then 7–11 for the code, then 12–16 for the workflow.
> - **AI assistant:** this file is designed to be pasted as context. Section 19 contains a ready-to-copy prompt. Treat `PROGRESS.md` as the live status record and `docs/DECISIONS.md` as the agreed design authority; this brief is the broad, stable explanation.
> - **Reviewer or judge:** sections 1–5 explain what the game is and what is playable; section 14 states honestly what is finished and what is not.

---

## Contents

1. [Quick facts](#1-quick-facts)
2. [The pitch and design pillars](#2-the-pitch-and-design-pillars)
3. [Story and campaign](#3-story-and-campaign)
4. [How the game plays](#4-how-the-game-plays)
5. [Systems, rules and exact numbers](#5-systems-rules-and-exact-numbers)
6. [Screens and user experience](#6-screens-and-user-experience)
7. [Technical architecture](#7-technical-architecture)
8. [Repository map](#8-repository-map)
9. [Content authoring formats](#9-content-authoring-formats)
10. [Persistence and save data](#10-persistence-and-save-data)
11. [Assets and audio](#11-assets-and-audio)
12. [Build, run and test](#12-build-run-and-test)
13. [Developer routes and debugging](#13-developer-routes-and-debugging)
14. [Current status and known gaps](#14-current-status-and-known-gaps)
15. [Non-negotiable contracts and gotchas](#15-non-negotiable-contracts-and-gotchas)
16. [Working on the project](#16-working-on-the-project)
17. [Documentation index](#17-documentation-index)
18. [Glossary](#18-glossary)
19. [Copy-ready AI context prompt](#19-copy-ready-ai-context-prompt)

---

## 1. Quick facts

| Item | Value |
| --- | --- |
| **Title** | *WANT — Chapter One: The Wrong Person* |
| **Tagline / promise** | "You were not the person they came for. You were the person who stayed." |
| **Genre** | Story-led, top-down browser game: grid-based exploration that cuts into real-time arena combat |
| **Premise** | K, an ordinary student in 2026, is accidentally pulled into 2085 and must decide whether to help people who needed someone else |
| **Campaign length** | Designed for about 20–25 minutes for a first successful run, plus retries |
| **Endings** | One success ending. No branch where the rescued civilian dies and the story continues. |
| **Modes** | Story Mode (4 hits to die) and Real Mode (2 hits to die) |
| **Extra mode** | Standalone Horde Mode ("Resistance Trials") with five difficulty tiers and 1m / 5m / Unlimited runs |
| **Platform** | Desktop browser, keyboard + mouse. Phone support is out of scope for the MVP. |
| **Internal resolution** | 768 × 432 canvas, 48 px tiles, 16 × 9 tile maps, scaled to fit the window |
| **Stack** | Phaser 3.90, TypeScript 5.9 (strict), Vite 8.3, Vitest 5.1, optional Supabase JS 2.119 |
| **Hosting target** | Vercel static build (not yet deployed live) |
| **Persistence** | `localStorage` only. Cloud saves are prepared but deliberately not connected. |
| **Repository** | `somenathjana21-ops/Unga-Bunga-HackNPitch`, branch `master` |
| **Authoritative script** | `Script (2).pdf`. `Game_Idea_Want.pdf` and `Story_Want_.pdf` are background only. |
| **Current state** | Feature-complete vertical slice integrated on `master`; automated checks pass; full human playthrough, deployment and final rights confirmation remain. |

### What "WANT" means

The title works on two levels: what the characters *want* (a cure, a rescue, a reason to keep going) and the absence of want — being wanted, being the right person, being chosen. K is not the chosen one. The story is about choosing to help anyway.

---

## 2. The pitch and design pillars

**WANT** is a short, complete story game about the wrong person choosing to help.

K is a university student having a bad day: his results are mediocre, his relationship is quietly failing, and he just wants to go home. A phone call sends him to the library, where he learns his girlfriend Sayu is with his classmate Nero. He walks away, goes back to his dorm, and tries to sleep.

That night a machine breaks through a hole in reality. Two soldiers die. A resistance fighter named Mai drags K into the year 2085. The resistance meant to retrieve K's roommate **Kingsley** — a genetic match for a serum that could save what is left of humanity — but they got K instead. The serum match is negative. Mai says the line that defines the story: *"You brought the wrong person."*

K has no secret power and no chosen-one destiny. He can still choose to go back for a stranger.

### Design pillars

1. **The wrong person, not a hidden hero.** K's growth is behavioural, not biological. He learns to aim, move and read a windup. The serum result never reverses.
2. **Exploration then violence, never both at once.** Calm top-down grid rooms establish place and people; combat switches to continuous movement in a bounded arena. Coordinate systems never mix mid-step.
3. **Fair, readable danger.** Enemy attacks are telegraphed. Real Mode kills in two hits, but every hit is avoidable and the rules are consistent. Death is a retry, not a punishment loop.
4. **A complete small story.** One rescue, one emotional payoff, one ending. The larger war is background, not a to-do list.
5. **Presentation as authorship.** The shell is a beveled indigo arcade cabinet around a curved CRT monitor, with an arcade START screen, pixel hearts, a HI-SCORE readout and CRT transitions. The UI is deliberately diegetic and slightly nostalgic; the story is not.

### Tone

Melancholy, restrained, human. Violence is shown through silhouette, flashes, sound and aftermath rather than gore. Humour is small and character-based ("Nachos and BadRull are in the fridge"). No irony about the premise; the game takes K's grief seriously without wallowing.

---

## 3. Story and campaign

### Route at a glance

```
Campus (2026) → Library courtyard → Dorm room → Breach → Resistance clinic (2085)
    → Settlement → East service lane (alley) → Shelter hold → Extraction
    → Epilogue → Ending screen
```

Maps are grid rooms in `src/content/maps/`; story beats are dialogue sequences in `src/content/dialogue/sequences.ts`; the four cinematic beats are in `src/content/cutscenes/ledger.ts`.

### Scene-by-scene

#### 01 — A day already going wrong (campus, 2026)

- **Objective:** "Reach the faculty library."
- **Beats:** K drops his wallet (optional pickup), receives a call from Nero about exam results, then a call from an unknown number that is actually Sayu asking him to come to the library. An optional bench gives a quiet line about how a result sheet used to be an easier problem.
- **Exit:** walk through the library door. The objective becomes "Find Hachimi outside the library."
- **Design purpose:** teach movement and interaction before anything is at stake.

#### 02 — The bracelet (library courtyard)

- Hachimi admits she made the call. Sayu and Nero are together. K removes his bracelet and refuses to listen.
- **Cutscene C01 — "The bracelet":** courtyard reveal, Sayu portrait, Nero portrait, bracelet fall, K's refusal. Skippable; skip and normal completion set the same `library-breakup-done` flag.
- **Objective:** "Go home." The library→dorm door unlocks only after the breakup flag.

#### 03 — Kingsley leaves the light on (dorm room)

- Kingsley, K's roommate, tries to help. A player choice changes K's reply (push him away / ask for space) but not the outcome.
- Optional fridge line; the TV plays two news broadcasts: a collider result in Amsterdam and power surges in Cebu City.
- **Objective chain:** talk to Kingsley → watch the news → try to sleep.
- **Design purpose:** make the ordinary world worth losing before it is taken away.

#### 04 — Something at the door (dorm, late night)

- K wakes to a power cut. The hallway is a hollow black barrier. Man 1 and Man 2 burst through, firing at something offscreen. Man 1 is pulled away; Man 2 is thrown across the room.
- **Cutscene C02 — "Breach and retrieval":** barrier, machine silhouette, Man 1/Man 2 portraits, the scan, Isshin's explosive, Mai carrying K out.
- **Important:** this is a scripted survival scene, not a winnable fight. K is not asked to win. The injuries are presentation, not hidden damage to the playable health pool.

#### 05 — A future with no room for surprises (resistance clinic, 2085)

- K wakes on a makeshift bed. Mai explains: Cebu, 2085. A model called **GenXO1**, derived from Panthropic technology and used from a hijacked training facility in Taiwan, contributed to economic collapse, nuclear conflict and the machines.
- **Cutscene C03 — "The ruined skyline"**: the city beyond the clinic window.
- Optional radio archive gives the deeper financial/casualty detail for players who want it; it is not mandatory exposition.

#### 06 — The wrong name (clinic)

- The resistance needs a serum linked to a genome from K's time. They believe they retrieved Kingsley.
- K says: "I'm not Kingsley. I'm K. He's my roommate." A blood test shows **SERUM MATCH: NEGATIVE**. The retrieval branch has moved; they cannot simply go back.
- Mai: *"You brought the wrong person."* She leaves. K asks whether there is anything he can do. Isshin tells him to stay close to camp.
- **Permanent canon:** the negative match is never reversed. K does not secretly have the right genes.

#### 07 — People, not a prophecy (settlement)

- Three local interactions establish the camp and Lina before she appears:
  1. **Ration table** — a civilian has no food to give.
  2. **Barricade** — Isshin gives K a worn pistol and the core combat lesson: "Aim, fire, move. Watch the windup."
  3. **Shelter board** — a note: *"Lina — medical delivery, east service lane."*
- Optional fragments show dwindling supplies and lost relatives.
- After all three, a cry for help triggers. **Objective:** "Find the person in the east lane." The east gate becomes the rescue entrance.
- **Cutscene C04** is saved for the rescue payoff, not this scene.

#### 08–10 — The rescue (three beats)

The rescue is one mission with three beats and one life. See section 5 for exact timings, spawns and rules.

1. **Alley approach.** Lina is pinned behind a delivery cart. One Scout, then one Rusher. K chooses to enter. Current health carries in.
2. **Hold the shelter.** Lina gets behind hard cover and radios Isshin, who needs 45 seconds. A teaching card unlocks the counter after K's first perfect dodge in this beat. Fixed enemy queue, at most three active.
3. **Extraction.** Mai arrives at a safe marker. One final Rusher threatens the route. K holds the gate switch for one second; damage interrupts the hold. Lina follows a short scripted path to Mai.

- **Success:** Lina reaches Mai alive and K is alive. Stop hostiles, grant the `girl-rescued` milestone exactly once (full heal), play **C04 — "Rescue payoff"**, then the ending.
- **Failure:** if K reaches 0 health at any point, the attempt is recorded as failed and Game Over appears. The story cannot continue without Lina. Restart resets only the rescue mission at full health; earlier story flags remain.

#### 11 — Someone who went back (epilogue)

- Lina explains she was bringing medicine back when the patrol cut through the lane. K admits he almost kept walking. Lina: "But you didn't."
- Mai apologises for what she said in the clinic. K says he still cannot give them the cure. Isshin: "Today you gave someone a way home. We can start there."
- Lina offers to show him the lanes tomorrow. K's closing thought: *"I wanted someone to tell me what I was supposed to be. Maybe I can start with what I choose to do."*
- **Ending card:** *WANT — Chapter One: The Wrong Person*.
- The ending is a DOM overlay (`src/ui/ending-screen.ts`) with an animated twilight backdrop, drifting petals, staggered epilogue lines and three actions: Return to Title, Enter Horde Mode, Replay Rescue. `Enter` and `Esc` shortcuts work. Reduced motion disables petals and animation.

### Cast

| ID | Display name | Role | Notes / art |
| --- | --- | --- | --- |
| `k` | **K** | Playable protagonist | Purple hoodie, satchel, bracelet. Has a real four-direction walk cycle plus interaction/combat art. |
| `kingsley` | **Kingsley** | K's roommate; the intended retrieval target | Green overshirt, cream polo. Mistaken-identity anchor. |
| `hachimi` | **Hachimi** | Campus witness; makes the call | Mustard hoodie, bob. |
| `sayu` | **Sayu** | K's girlfriend at the opening | Burgundy cardigan. |
| `nero` | **Nero** | K's classmate | Blue shirt, folio. |
| `isshin` | **Isshin** | Resistance fighter | Gives K the pistol; provides scripted covering fire. |
| `mai` | **Mai** | Resistance rescuer | Carries K out of 2026; the "wrong person" line. |
| `lina` | **Lina, 19** | Local courier carrying medical supplies | Has agency, route knowledge, and no secret genetic link to K. Her own idle/shelter art exists. |
| `man-1`, `man-2` | **Man 1 / Man 2** | Retrieval team | Die in the breach. |
| `news-reporter` | **News Reporter** | Television broadcast | Existing portrait used in the dorm TV beat. |
| `kingsleys-girlfriend` | **Kingsley's girlfriend** | Brief dorm appearance | Existing art. |
| `civilian` | **Civilian** | Ration-line NPC | Camp civilian sprite. |

Character IDs are **stable contracts**. Display names may change; IDs must not. Add new characters to `src/content/characters.ts` and, if they appear on a map, to the sprite maps in `WorldScene`.

### Themes

- Being wanted versus being needed.
- The difference between intention and action.
- Small mercy inside a large catastrophe.
- Grief that does not get a monologue.

---

## 4. How the game plays

### Controls

| Input | Exploration | Dialogue / cutscene | Combat / rescue / horde |
| --- | --- | --- | --- |
| **WASD / arrow keys** | One grid step (one axis at a time) | — | Continuous movement, normalized diagonals |
| **Mouse** | Menus | Menu choices | Aim |
| **Left click** | Menus | Advance dialogue | Fire; counter if the counter window is open |
| **Space** | — | Advance dialogue | Reflex Dodge (or advance dialogue) |
| **E** | Talk / inspect / use gate switch | Advance dialogue | Use extraction switch when in range |
| **R** | — | — | Reload; press again inside the gold sweet spot for a Snap Reload |
| **Enter** | Confirm menu / start | Advance dialogue | Restart on Game Over |
| **Esc** | Return to menu | Skip dialogue / cutscene | Pause; on Game Over, return to title |

Menus also support Tab and arrow-key navigation. Hovering/focusing a command moves the triangle cursor. Reduced-motion OS settings are respected.

### Exploration

- Each map is a 16 × 9 grid of 48 px tiles. `#` is solid, `.` is walkable, `D` is a door/transition.
- K moves exactly one tile per press, with a 170 ms tween. Holding two directions produces one axis, not a diagonal.
- Walls, props, NPCs and closed doors block movement. Doors may be gated by story flags.
- Talkable NPCs get a name plate, a bobbing gold `!`, and a pulse. A room label sits under the objective so the player always knows where they are.
- Interaction uses Manhattan distance ≤ 1; the prompt appears at the bottom of the screen.
- Character sprites are drawn at 64 px with ground shadows and Y-depth sorting; collision is tile-based, independent of sprite size.
- Every map can have a full painted backdrop (`backgroundImageId`); the tile grid is drawn transparently over it, with subtle wall shading and amber door markers.
- A `visitedMaps` set prevents the objective from resetting when re-entering a room.

### Dialogue

- Dialogue is a Phaser overlay scene that pauses world input.
- Portrait frame on the left when the speaker has a portrait; speaker name and body text shift right of it.
- Advance with click, `E`, `Space` or `Enter`. `Esc` skips the entire sequence.
- Choices use arrow keys, mouse hover/click, and set an optional flag. A choice changes K's reply and flavour flags, never the main ending.
- **Skip and read converge:** both call the same completion callback and set the same completion flag.
- Dialogue can trigger a cutscene through `cutsceneId`.

### Combat (arena rules)

Combat is continuous, top-down, twin-stick-like with mouse aim. It appears in the campaign inside `RescueScene`; `CombatScene` is a standalone developer arena that uses the same systems, and Horde Mode reuses the combat feel with its own scene and rules.

- **Aim** follows the mouse at all canvas sizes, including during bullet-time.
- **Movement** is normalized, so diagonals are not faster. Solid cover blocks movement and bullets; K slides along cover rather than sticking.
- **Pistol:** 6-round magazine, 260 ms fire cooldown, automatic reload when empty, 900 ms reload.
- **Snap Reload:** press `R` again when the reload progress is between 46% and 78% to instantly finish and load one overcharged round (1.6× damage).
- **Dodge:** 180 ms of invulnerability, 2.05× speed in the movement direction (or aim direction if standing still), 900 ms cooldown. Cannot tunnel through cover.
- **Perfect dodge / Reflex Counter:** if a committed hostile attack would have hit K during the dodge (with a 22 px graze margin), a 250 ms counter window opens and the world slows to 24% for the player's aiming. The next click fires a piercing golden Counter Rail shot for 3× pistol damage. One counter per attack ID; no stacking.
- **Damage safety:** one validated hit per attack ID per 1000 ms invulnerability window. A multi-frame overlap cannot delete the health bar instantly.
- **Pause/focus loss:** Esc or losing browser focus freezes the simulation clock, enemy timers, bullets and objective timers. Held inputs are cleared on resume.
- **Death:** stops input and simulation immediately. Game Over appears with Restart and Return to Title.

### Enemies

| Enemy | Behaviour | Readable tell |
| --- | --- | --- |
| **Scout** | Strafes laterally, holds mid-range (175–285 px), seeks line of sight, fires a locked-direction shot. On Real Mode it fires a two-round burst sharing one attack ID. | 800 ms warning line; direction locks at 72% of the windup. |
| **Rusher** | Stalks toward K, angles around cover to open a charge lane, then commits to a 500 ms / 375 px/s charge. | 800 ms lane telegraph; if it slams into solid cover it is staggered for 1550 ms and takes 1.5× damage while exposed. |
| **Breach Striker** | Horde-only archetype: tougher, spread-fire attacker. | Larger silhouette, spread telegraph. |

Enemies are capped at 4 active in the campaign and per-beat caps in the rescue (2/3/2). Horde caps rise with difficulty.

### Horde Mode

Standalone survival mode, accessible from the title/mode-select screen. It is deliberately **decoupled** from Story Mode saves and milestones.

- **Durations:** 1 Minute (60 s), 5 Minutes (300 s), Unlimited (until K falls).
- **Difficulties (10× escalation per tier):** Easy (1×), Medium (10×), Hard (100×), Maniac (1,000×), DOOM (10,000×).
- **Enemies:** Scout, Rusher, Breach Striker.
- **Flow:** enter a player name (required, normalized, max 24 characters) → choose time and difficulty → survive → results overlay with score, kills, counter kills, wave, time survived and clear status.
- **Scoreboard:** local top 50, sorted by score then survival time then recency. Filterable by difficulty. Stored separately from campaign saves.
- **Time ramp:** the first 10 seconds are calmer; spawn interval tightens to 0.62× over three minutes; active cap gains up to +8; waves advance every 20 seconds.

---

## 5. Systems, rules and exact numbers

### Difficulty and health

| Rule | Story Mode | Real Mode |
| --- | --- | --- |
| K's max health | 100 | 100 |
| Damage per accepted hit | 25 | 50 |
| Hits from full health | 4 | 2 |
| Enemy base health (×0.5 / ×1) | 30 | 60 |
| Enemy speed / counts / patterns | Same | Same |
| HUD hearts | 4 | 2 |

- Health is **campaign-global** and persists across scenes and fights.
- `enterCheckpoint` never heals. Loading a scene never heals. Killing enemies never heals. Pause/reload never heals.
- The only in-run heal is `completeMilestone('girl-rescued')`, granted once when Lina reaches safety. Duplicate triggers cannot farm it.
- A genuinely new run, or an explicit rescue restart, restores health as a new attempt.

### Core combat tuning (`src/game/rules.ts`)

| Value | Number |
| --- | --- |
| Player speed | 160 px/s |
| Dodge duration | 180 ms |
| Dodge cooldown | 900 ms |
| Post-hit invulnerability | 1000 ms |
| Enemy telegraph | 800 ms |
| Counter window | 250 ms (simulation time; ~1 s real time under 0.24× bullet-time) |
| Counter damage | 3× pistol |
| Pistol damage | 10 |
| Max active enemies (campaign) | 4 |
| Enemy base health | 60 |
| Magazine | 6 rounds |
| Reload | 900 ms |
| Snap-reload sweet spot | 46%–78% of reload |
| Overcharged round | 1.6× damage |

### Rescue mission contract

- **Entry:** east gate of the settlement, only after `settlement-cry-heard`. Health carries in; checkpoint becomes `rescue-start`; `rescueStatus` becomes `active`.
- **Beats:** `alley` → `hold` → `extraction`. Moving between beats never heals.
- **Spawn queues** (`src/content/encounters/rescue-beats.ts`):
  - Alley: Scout at 0 ms, Rusher at 3200 ms; max 2 active.
  - Hold: seven enemies across 45 seconds (Scout/Rusher alternating entries); max 3 active; 45-second timer.
  - Extraction: Rusher at 900 ms, Scout at 2800 ms; max 2 active.
- **Lina:** not independently simulated as a health bar. She stays behind hard cover, then follows a short scripted path once the lane is safe. The only failure condition is K's death.
- **Gate switch:** only active in the extraction beat; 105 px interaction radius, 122 px keep radius, 1000 ms hold. `E` or direct click both work. Damage interrupts the hold. Progress is shown as a circular arc.
- **Isshin:** scripted covering fire roughly every 3.6 seconds during hold/extraction. Mai waits at the safe marker.
- **Success:** `completeMilestone('girl-rescued')` → full heal, `rescueStatus = 'complete'`, counter teaching already unlocked, C04, ending overlay.
- **Failure:** `rescueStatus = 'failed'`. Game Over offers "Restart rescue mission" and "Return to title". `restartRescue` is the only function allowed to reset a failed attempt: health 100, `counterUnlocked = false`, checkpoint `rescue-start`, status `active`; earlier story flags are untouched.
- **Race guard:** if a lethal hit and the success milestone occur in the same frame, death wins.

### Horde numbers

| Tier | Multiplier | Enemy HP | Active cap | Spawn interval | Damage/hit | Pistol damage |
| --- | --- | --- | --- | --- | --- | --- |
| Easy | 1× | 30 | 4 | 2400 ms | 20 | 12 |
| Medium | 10× | 60 | 7 | 1550 ms | 25 | 16 |
| Hard | 100× | 120 | 11 | 960 ms | 34 | 24 |
| Maniac | 1,000× | 240 | 16 | 560 ms | 50 | 38 |
| DOOM | 10,000× | 480 | 24 | 320 ms | 100 | 64 |

- **Kill points:** base (Scout 100, Rusher 150, Striker 250) × difficulty multiplier × combo multiplier (`1 + 0.25 × (combo − 1)`, capped at 5×) × style (counter 1.5×, exposed target 1.25×).
- **Clear bonus:** `(seconds × 25 + remaining health × 10) × difficulty multiplier`; Unlimited awards 0.
- Combo window is short; taking a hit resets combo.
- Music playback rate rises subtly with difficulty.

### Cutscene ledger

| ID | Title | Story flag | Shots | Content |
| --- | --- | --- | --- | --- |
| `c01` | The bracelet | `breakup` | 5 | Courtyard reveal, Sayu, Nero, bracelet fall, K's refusal |
| `c02` | Breach and retrieval | `breach-rescued` | 7 | Barrier, machine silhouette, Man 1, Man 2, scan, Isshin/Mai rescue, escape |
| `c03` | The ruined skyline | `clinic-arrival` | 3 | 2085 skyline, Mai portrait, clinic window view |
| `c04` | Rescue payoff | `girl-rescued` | 3 | K protects Lina, Mai's call, extraction |

Cutscene rules: still images with captions; optional restrained pan/zoom; reduced motion removes pan and shake; Skip and normal completion call the completion callback exactly once; image IDs resolve through `assets/runtime-manifest.json`; missing art falls back to labelled cards, then to `default-template.png`, then to a text card.

---

## 6. Screens and user experience

The whole app lives inside an **arcade cabinet** shell rendered in HTML/CSS around a curved **CRT monitor**. The game canvas sits inside the CRT.

### Screen flow

```
CRT power-on boot
   → ARE YOU READY?  [YES ◀ / NO]
        NO  → SIGNAL STANDBY (click/any key to wake)
        YES → CRT warp → SELECT MODE
              ├ Continue Story (only when a valid save exists)
              ├ Begin Story / New Story
              ├ Horde Mode
              ├ Settings
              ├ Controls
              ├ Audio On/Mute
              ├ Combat (dev) / Rescue (dev)   [development builds only]
              └ ← Start
   → gameplay inside the CRT bezel
   → ending overlay (Chapter One complete)
```

### Title / ready screen

- Persistent top HUD: `HI-SCORE` (top local Horde score, animated count-up) and five pixel-art golden hearts (four lit for Story Mode, two for Real Mode; saved damage can dim them).
- `START` is a large gold gradient with a sweeping sheen. `ARE YOU READY?` with `YES ◀ / NO`.
- `NO` powers the CRT down to a standby screen; clicking or pressing any key wakes it with a boot animation.
- Keyboard: left/right selects YES/NO, Enter/Space confirms.

### Mode select

- Difficulty segmented toggle: Story Mode · 4 ♥ / Real Mode · 2 ♥. The note under it changes with the choice.
- Command list with animated triangle cursor: Continue Story, Begin Story/New Story, Horde Mode.
- Continue shows room, HP local and difficulty, e.g. `Dormitory Room · HP 75/100 · Story Mode` or `Rescue Mission (Failed) · Real Mode`.
- Starting a new story while a save exists opens a confirmation dialog. Cancel leaves the save untouched. Horde scores are explicitly not affected.
- Right-hand character dossier card with K's poster and subtle pointer parallax (disabled under reduced motion).
- Settings dialog: master/music/effects volume, mute, reduced motion. Persisted locally.
- Controls dialog lists every binding.

### Gameplay shell

- Header shows `WANT / CHAPTER ONE` and the mode label, e.g. `Story Mode · Chapter One` or `Horde Mode · Easy (1×) · 5 Minutes`.
- Audio toggle and `Menu Esc` button.
- Footer always shows the relevant controls.
- The game canvas is focused automatically so keyboard input works without a click.

### Feedback and accessibility

- Damage shows a flash, a floating number and a sound; it does not rely on red alone.
- Counter chance shows a ring plus `COUNTER - CLICK`.
- Toasts explain locked switches ("Gate locked") and progress.
- Menus are real HTML buttons, fieldsets, labels and dialogs, keyboard navigable.
- Reduced motion follows the OS by default and can be forced in settings.
- Sound never starts before a user gesture. Muting preserves the session.
- Meaningful audio cues have text equivalents in dialogue/captions.

---

## 7. Technical architecture

### Stack and rationale

- **Phaser 3** supplies scenes, input, cameras, tweens, sprites, audio hooks and the game loop.
- **TypeScript** keeps state and content contracts honest; strict mode with `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`.
- **Vite** builds a static app for Vercel and lazy-splits Phaser.
- **Plain HTML/CSS** owns menus, dialogs, cutscene overlay, settings and ending — accessible and easy to style independently of Phaser.
- **Supabase** is installed as an optional future save backend. No request is made today.
- No server, framework or database is required for the game to run.

### Entry and boot flow

```
index.html
  → /src/main.ts
      - renders the arcade shell and all menu DOM
      - loads preferences, saves, scores
      - unlocks audio on the first gesture
      - dynamically imports ./game/create-game.ts only when entering play
          → Phaser.Game (768×432, pixelArt, FIT)
              - registers PreviewScene, WorldScene, DialogueScene,
                CombatScene, RescueScene, HordeScene
              - selects the first scene by mode
```

Phaser is **never** statically imported from `src/main.ts`. This keeps the first payload small; the build's >500 kB Phaser chunk warning is expected.

### Scene graph

| Scene key | Class | Role |
| --- | --- | --- |
| `preview` | `PreviewScene` | Foundation movement/interaction proof. Kept as a development smoke test. |
| `WorldScene` | `WorldScene` | Campaign exploration: maps, NPCs, dialogue triggers, doors, saves. |
| `DialogueScene` | `DialogueScene` | Overlay dialogue, portraits, choices, skip. |
| `combat` | `CombatScene` | Standalone real-time arena; development launch path. |
| `rescue` | `RescueScene` | Three-beat rescue mission, counter teaching, game over, ending handoff. |
| `horde` | `HordeScene` | Standalone survival mode. |

`create-game.ts` exposes `SceneKey = 'preview' | 'world' | 'combat' | 'rescue' | 'horde'` for selecting the first scene, but Phaser registers all scenes by their real keys. It deduplicates scene classes because Phaser throws on duplicate keys.

### State boundaries

| Layer | File | Responsibility |
| --- | --- | --- |
| Pure run rules | `src/game/rules.ts` | Difficulty, damage, tuning constants. |
| Campaign state | `src/game/state.ts` | `RunState`, health, checkpoints, milestones, rescue status, validation. |
| Story progress | `src/game/story-state.ts` | Maps, flags, completed sequences, objectives, visited maps, serialization. |
| Campaign itinerary | `src/content/campaign.ts` | Checkpoints, milestone names, planned minute budget. |
| Local saves | `src/services/local-save.ts` | Validated `localStorage` reads/writes; never trust stored JSON. |
| Preferences | `src/services/preferences.ts` | Volume, mute, reduced motion. |
| Horde scores | `src/services/horde-scores.ts` | Isolated scoreboard and player name. |
| Audio | `src/services/audio.ts` | Web Audio buses, music/ambience crossfades, SFX pool, unlock. |
| Cloud (optional) | `src/services/supabase.ts` | Client factory; requires `sb_publishable_`; no automatic requests. |

### Simulation clocks

- `WorldScene` uses discrete tile state plus Phaser tweens; no physics body.
- `CombatScene`, `RescueScene` and `HordeScene` use a **unified simulation clock** (`simNow`) advanced by clamped delta time. Pausing, focus loss, defeat, teaching cards and bullet-time all manipulate or freeze this one clock. This prevents timer drift between spawns, reloads, holds and cooldowns.
- Canvas design resolution is fixed at 768 × 432; Phaser's `FIT` + `CENTER_BOTH` handles resizing. Aim uses world coordinates, so it stays correct at any scale.

### Rendering and depth

- World: background depth `-1`, floor `0`, interactable markers ~`2`, characters `10 + y * 0.01`, labels/HUD `100+`.
- Sprites are visual size only (`src/game/sprite-metrics.ts`), decoupled from gameplay collision radii.
- World map grid is 16 × 9; `TILE_SIZE = 48`.
- Doors are amber markers; interactables are small icons; quest NPCs pulse and carry a `!`.

### Audio architecture

- `audio.unlock()` is called from the first pointer/key gesture; before that the engine is silent.
- Buses: **master → music / ambience / effects**, each with an independent gain.
- Music and ambience are `<audio>` elements routed through Web Audio gain nodes, crossfaded on scene changes.
- SFX are decoded `AudioBuffer`s with pooling, gain normalization, pitch variance on footsteps/gunshots and throttling.
- If a sample fails, the engine falls back to procedural synthesis so the game is never silent-by-crash.
- Horde Mode adjusts music playback rate by tier.

---

## 8. Repository map

```text
want-main/
├─ index.html                     Vite entry; page metadata; font links
├─ src/
│  ├─ main.ts                     Arcade shell, menus, flow, audio unlock, ending/horde bridges
│  ├─ styles.css                  Full arcade cabinet + CRT + game UI styling
│  ├─ game/
│  │  ├─ create-game.ts           Phaser factory, scene registration, registry seeding
│  │  ├─ rules.ts                 Difficulty + combat tuning constants
│  │  ├─ state.ts                 RunState and pure campaign-state rules
│  │  ├─ story-state.ts           StoryProgress flags/maps/objectives + snapshots
│  │  ├─ sprite-metrics.ts        Shared visual sizes, 4-direction frame helper
│  │  ├─ maps/preview-room.ts     Preview collision grid
│  │  ├─ scenes/                  Preview, World, Dialogue, Combat, Rescue, Horde
│  │  ├─ combat/                  Types, player, enemy, bullet, damage, arena FX, switch
│  │  ├─ cutscene/playback.ts     Pure cutscene controller (skip == completion once)
│  │  └─ horde/rules.ts           Pure Horde difficulty/duration/score rules
│  ├─ content/
│  │  ├─ characters.ts            Stable character IDs and display names
│  │  ├─ campaign.ts              Checkpoints, milestones, itinerary
│  │  ├─ maps/                    campus, library, dorm, clinic, settlement + types/index
│  │  ├─ dialogue/                Dialogue types, sequences, legacy placeholders
│  │  ├─ cutscenes/ledger.ts      C01–C04 shot lists, captions, pans, flags
│  │  └─ encounters/rescue-beats.ts  Fixed rescue spawn queues
│  ├─ services/                   local-save, preferences, horde-scores, audio, supabase
│  └─ ui/                         cutscene-player, settings-panel, ending-screen, horde-modal
├─ assets/
│  ├─ characters/                 Supplied + derived character art, `_revisions/`
│  ├─ backgrounds/                Generated map backdrops and cutscene stills
│  ├─ effects/                    Generated effect art
│  ├─ tilesets/                   Generated tileset art
│  ├─ inventory.json              Every source image, size, rights status (124 entries)
│  └─ runtime-manifest.json       Only shipping images, with dimensions/frames (90 entries)
├─ public/assets/                 Generated by `assets:prepare`; Git-ignored; never edit
├─ MUSIC/                         33 supplied WAV tracks (music, ambience, SFX)
├─ scripts/
│  ├─ prepare-assets.mjs          Validates + copies manifest images and audio
│  ├─ build-pdfs.py               Regenerates printable PDFs from Markdown
│  └─ make-default-assets.cjs     Generates fallback background/template art
├─ tests/                         5 Vitest files, 42 tests (pure logic, no DOM)
├─ docs/                          Decisions, architecture, guidebook, playthrough, etc.
├─ supabase/                      Prepared migration + README; not applied
├─ output/pdf/                    Generated printable guides
├─ PROGRESS.md                    Live status, task claims, handoffs, activity log
├─ AGENTS.md / CLAUDE.md          Agent entry instructions
├─ README.md                      Setup and Phase 0 manual checklist
├─ Script (2).pdf                 Authoritative supplied script
├─ Game_Idea_Want.pdf             Background
├─ Story_Want_.pdf                Background
└─ WANT-Asset-Generation-Prompts.md  Copy-ready art/audio prompt pack
```

### Key files by task

| If you need to… | Read / edit |
| --- | --- |
| Change a story line or add a conversation | `src/content/dialogue/sequences.ts` |
| Change where an NPC, door, prop or trigger is | `src/content/maps/<map>.ts` |
| Change exploration behaviour | `src/game/scenes/WorldScene.ts` |
| Change combat feel, enemies or damage | `src/game/combat/*`, `src/game/scenes/CombatScene.ts` |
| Change the rescue | `src/content/encounters/rescue-beats.ts`, `src/game/scenes/RescueScene.ts` |
| Change Horde balance or scoring | `src/game/horde/rules.ts`, `src/game/scenes/HordeScene.ts` |
| Change cutscene shots | `src/content/cutscenes/ledger.ts`, `src/ui/cutscene-player.ts` |
| Change menus / shell / flow | `src/main.ts`, `src/styles.css`, `index.html` |
| Change saves | `src/services/local-save.ts`, `src/game/state.ts`, `src/game/story-state.ts` |
| Change audio | `src/services/audio.ts`, `scripts/prepare-assets.mjs` |
| Change art shipping | `assets/runtime-manifest.json`, `assets/inventory.json` |

---

## 9. Content authoring formats

The game is data-driven. Prefer editing content files over scattering strings through render code.

### Map schema (`src/content/maps/types.ts`)

```ts
interface GameMap {
  id: string;
  name: string;
  grid: readonly string[];        // '#' wall, '.' floor, 'D' door
  spawn: { x: number; y: number };
  npcs: MapNpc[];                 // characterId, position, dialogueId, optional flags
  interactables: MapInteractable[]; // prompt, dialogueId, optional spriteId/flags
  triggers: MapTrigger[];         // fires once when stepped on, optional flags
  doors: MapDoor[];               // targetMap, targetSpawn, label, optional flags/objective
  objective: string;              // default objective on first entry
  backgroundImageId?: string;     // asset ID resolved through the runtime manifest
}
```

Rules of thumb:

- Grids are exactly 16 columns × 9 rows in the current maps. Every spawn and every interactable must be reachable.
- `requiresFlag` means "only available after this flag"; `excludesFlag` means "unavailable once this flag is set" (used for one-shot interactions).
- NPC and interactable interaction range is Manhattan distance ≤ 1.
- Doors are checked after a movement completes; a door to `rescue` starts the mission.
- Keep collision and decoration separate. The grid is collision; backdrops are decoration.
- `tests/layout-and-sizing.test.ts` asserts grid size, reachable spawns/interactables, door tiles and landmark alignment. Update it when moving landmarks.

### Dialogue schema (`src/content/dialogue/types.ts`)

```ts
interface DialogueSequence {
  id: string;
  lines: DialogueLine[];
  completionFlag: string;   // set on both read and skip
  objective?: string;
  cutsceneId?: string;      // lowercase c01–c04, resolved by the ledger
}

interface DialogueLine {
  speaker: CharacterId;
  text: string;
  portrait?: string;        // runtime URL
  choice?: { prompt: string; options: { label: string; flag?: string; response: string }[] };
}
```

- Speaker IDs must exist in `characters.ts`.
- `text` may be empty only when the line presents a choice.
- Add portraits only when the art exists; otherwise omit and let the text carry the line.
- The `cutsceneId` on a sequence is played **after** the dialogue when the sequence was just completed. IDs are lowercase (`c01`) even though the old placeholder file uses uppercase.
- Every sequence should have a unique `completionFlag`; flags drive map gating and objectives.

### Cutscene schema (`src/content/cutscenes/ledger.ts`)

```ts
interface CutsceneShot {
  id: string;
  kind: 'portrait' | 'environment' | 'card';
  imageId: string | null;   // manifest asset ID, not a raw path
  video?: string;
  caption: string;
  pan?: { from: Transform; to: Transform; durationMs: number };
  audio?: string[];
  advanceAfterMs?: number;  // null/undefined = wait for player
}
```

- Image IDs resolve through `assets/runtime-manifest.json`; do not hard-code `/assets/<id>.png`.
- New stills must be registered in the manifest and inventory.
- Keep captions short enough to read at 768 × 432.
- `advanceAfterMs` is a convenience, not a substitute for player control.

### Adding a new dialogue or interaction

1. Add the sequence to `sequences.ts` with a unique ID and completion flag.
2. Add the NPC/interactable/trigger/door to the relevant map, referencing the sequence ID and appropriate `requiresFlag`/`excludesFlag`.
3. Update the objective in `WorldScene.onDialogueComplete` if the beat advances the story.
4. If a cutscene belongs to the beat, add `cutsceneId` and verify the ledger has that ID.
5. Add or update a test if the beat is part of progression.
6. Run `npm run check`.

### Adding a map

1. Create `src/content/maps/<id>.ts` using `GameMap`.
2. Import it in `src/content/maps/index.ts` and add it to `maps`.
3. Add the map ID to `VALID_WORLD_MAPS` in `src/game/story-state.ts`.
4. Add a display name in `mapDisplayName` and a checkpoint mapping in `mapToCheckpoint`.
5. Preload its backdrop in `WorldScene.preload()` if it has one.
6. Add a layout/reachability test.
7. Run `npm run check`.

---

## 10. Persistence and save data

### Storage keys

| Key | Contents | Notes |
| --- | --- | --- |
| `want.campaign.v1` | `RunState` | Difficulty, checkpoint, health, counter unlock, rescue status, milestones |
| `want.story.v1` | `StoryProgressSnapshot` | Map, exact tile, flags, completed sequences, objective, settlement interactions, visited maps |
| `want.preferences.v1` | `Preferences` | Master/music/effects volumes, mute, reduced motion |
| `want.horde.scores.v1` | `HordeScoreEntry[]` | Top 50 local scores |
| `want.horde.player.v1` | string | Last Horde player name |

### RunState

```ts
interface RunState {
  version: 1;
  mode: 'campaign';
  difficulty: 'story' | 'real';
  checkpoint: 'campus' | 'dorm' | 'camp' | 'rescue-start' | 'girl-safe' | 'ending';
  health: number;                 // 0–100
  counterUnlocked: boolean;
  rescueStatus: 'not-started' | 'active' | 'failed' | 'complete';
  milestones: ('girl-rescued' | 'resistance-covered')[];
}
```

- `isRunState` rejects wrong versions, unknown checkpoints, out-of-range health, duplicate/unknown milestones and bad types.
- Invalid saves are ignored, not deleted. The player can still start fresh.
- The story snapshot is validated separately; an invalid snapshot does not block local play.
- Saves are written when a map loads, when dialogue completes, when a room transition happens, on `want:flush-save` (leaving to the menu), on accepted combat hits and at rescue state changes.
- Continue seeds the Phaser registry with saved health, checkpoint, milestones, counter and rescue status. It never resets health to full.
- `mapToCheckpoint` maps campus/library → `campus`, dorm → `dorm`, clinic/settlement → `camp`, and the rescue sets `rescue-start`.

### Resume behavior

- Leaving Story Mode to the menu flushes the current map, tile, flags and objective.
- Continue restores the exact room and tile, not just a coarse checkpoint.
- A failed rescue resumes into the Game Over decision; reloading must not resurrect K.
- A completed run shows `Chapter One Cleared` in the Continue line.
- Horde scores are isolated: Horde can never read or write campaign saves.

### Cloud status

- `src/services/supabase.ts` is a factory that refuses keys not starting with `sb_publishable_`.
- `supabase/migrations/` contains a prepared private-save schema with row-level security, but it has **not** been applied.
- No network request is made by the game today. Local play works with no `.env` file.
- Cloud saves are an explicit future feature: passwordless email, opt-in, conflict UI, never required to start.

---

## 11. Assets and audio

### What ships

- **90 runtime visual assets** in `assets/runtime-manifest.json`, validated and copied to `public/assets/`.
- **33 audio assets** copied from `MUSIC/` to `public/assets/audio/`.
- **124 entries** in `assets/inventory.json` recording source files, dimensions, byte sizes and rights status.
- **55 original character PNGs** across 11 characters, preserved in place.
- Derived revisions under `assets/characters/_revisions/`.
- Generated backgrounds, effects and tilesets under `assets/backgrounds/`, `assets/effects/`, `assets/tilesets/`.

### Asset pipeline

```
assets/runtime-manifest.json + inventory.json
        │
        ├─ npm run assets:prepare → validates and copies → public/assets/ (Git-ignored)
        └─ npm run assets:check   → validation only, no writes
```

The validator checks:

- PNG signature.
- Declared width/height match the actual file.
- Duplicate IDs and duplicate output paths are rejected.
- Sprite frame grids divide evenly.
- Source paths stay inside `assets/characters|backgrounds|effects|tilesets`.
- Output paths cannot escape `public/assets`.

It does **not** verify the declared `frames` count; check that manually.

### Rules

- **Never edit `public/assets/`.** It is generated.
- **Preserve the 55 supplied originals and the source PDFs.** Do not re-encode, overwrite or "clean up" originals.
- New art goes in a source folder and is registered in both the manifest and inventory.
- Runtime URLs are `/assets/<output>`, never `assets/` or `src/` paths.
- A source file may be swapped for a derived revision as long as the runtime output path stays stable.
- Label missing art as temporary; never present an interaction pose as a walk cycle.
- Rights/credits are not fully confirmed. Do not invent a license or attribution.

### Visual style

- Top-down pixel art at a 768 × 432 design resolution.
- Characters are 48 px sheets scaled to 54–64 px; painted backgrounds are full-screen 16:9.
- Palette is muted twilight/ruin: indigo, plum, amber, sodium light, teal clinic accents.
- The shell is deliberately not pixel art: beveled indigo cabinet, curved CRT, scanlines, glass glare, gold arcade typography.

### Audio

- 4 music tracks: campus, future, rescue, ending.
- 4 ambience loops: campus, dorm, clinic-camp, ruined-city.
- 25 effects: UI, phone, wallet, bracelet, power cut, machine shriek, pistol, windups, dodge, counter ready/impact, hits, disable, blast, crash, radio, gate, resolve, failure, footsteps.
- All supplied as WAV in `MUSIC/` and copied to `/assets/audio/`.
- Volume preferences: master 0.7, music 0.5, effects 0.7 by default.
- Audio starts only after a user gesture.
- If a sample fails, procedural synthesis covers the cue.

### External font caveat

`index.html` references Google Fonts (`DM Sans`, `JetBrains Mono`, `Press Start 2P`). The game still runs offline, but typography falls back to system fonts if the network is unavailable. If a fully offline demo is required, bundle the fonts locally.

---

## 12. Build, run and test

### Requirements

- Node.js **24 LTS** (`.nvmrc` says `24`; `package.json` requires `>=22.12.0`).
- npm with the committed lockfile.
- No Supabase account, `.env` file or network access is needed for local play.

### Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Clean install from `package-lock.json` |
| `npm run dev` | Prepare assets, then start Vite on `127.0.0.1` |
| `npm run build` | Prepare assets, typecheck, production build to `dist/` |
| `npm run preview` | Serve the production build on `127.0.0.1` |
| `npm run check` | **Required gate:** asset check → typecheck → tests → build |
| `npm run assets:prepare` | Validate and copy runtime images + audio |
| `npm run assets:check` | Validate only |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run all Vitest tests |
| `npm test -- tests/rules.test.ts` | Run one test file |
| `npm test -- tests/rules.test.ts -t "Real Mode kills"` | Run one named test |
| `npm run test:watch` | Vitest watch mode |
| `python scripts/build-pdfs.py` | Regenerate printable PDFs (needs ReportLab) |

There is **no lint or format script**. Do not add one casually.

### What the tests cover

Five files, 42 tests, no browser or DOM:

- `tests/rules.test.ts` — Real/Story lethality, persistent wounds, one-time milestone heal, rescue death/retry, save validation, blocked/corrupt storage, wall collision, cutscene mapping, settlement→rescue door, progression chain.
- `tests/horde-and-persistence.test.ts` — 10× tier scaling, duration modes, scoring/combo/clear bonus, name normalization, clock/format helpers, scoreboard isolation, story snapshot round-trip, audio manifest mapping.
- `tests/combat-and-rescue.test.ts` — 6-round magazine, auto/snap reload, counter override, cover vs piercing shots, active enemy movement, Rusher cover slam, gate switch gating and hold.
- `tests/cutscene.test.ts` — first shot, full advance, completion idempotence, skip parity, pan/reduced motion, all four cutscenes.
- `tests/layout-and-sizing.test.ts` — grid dimensions, reachable spawns/interactables, door tiles, landmark alignment, sprite sizing, directional frames.

Phaser input, canvas rendering, audio unlock, menus and the live game feel need manual browser checks.

### CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:

```sh
npm ci
npm run check
```

The expected build warning is the lazy-loaded Phaser chunk exceeding 500 kB uncompressed (~318 kB gzip).

### Printable docs

- `docs/PLAYTHROUGH.md` → `output/pdf/WANT-Playthrough.pdf`
- `docs/GUIDEBOOK.md` + related → `output/pdf/WANT-Development-Guidebook.pdf`
- `WANT-Asset-Generation-Prompts.md` → `output/pdf/WANT-Asset-Generation-Prompts.pdf`

Edit the Markdown, then regenerate; never hand-edit a PDF.

---

## 13. Developer routes and debugging

### Query-string routes

| URL | Effect |
| --- | --- |
| `/?cutscene=c01` … `c04` | Plays a cutscene directly |
| `/?ending=1` | Shows the Chapter One ending overlay |
| `/?horde=1` | Opens the Horde lobby |
| `/?screen=select` | Opens mode select directly |
| `/?autostart=1` | Continues a save or starts a new story immediately |

There is no `?world`, `?map=` or `?rescue_beat=` route: the current entry script only reads the five parameters above. Use the development buttons or the saved story state to reach a specific map or beat.

### Development-only UI

- `Combat (dev)` and `Rescue (dev)` buttons appear only when `import.meta.env.DEV` is true. They are absent from production builds.
- The combat scene can be launched directly with the selected difficulty.
- The rescue dev button uses the selected difficulty and current run defaults.

### DOM debug hooks

The app writes state onto `document.body.dataset` for inspection and automation:

- `state`: `title`, `standby`, `playing`, `ending`
- `screen`: `ready`, `select`, `standby`, `horde-setup`, `playing`
- `scene`: `world`
- `map`: current map ID
- `tile`: `"x,y"`
- `beat`: current rescue beat
- `hordeDifficulty`: current Horde tier
- `hordeScore`: current Horde score

### Custom events

| Event | Direction | Meaning |
| --- | --- | --- |
| `want:flush-save` | main → game | Save current story/map before destroying the game |
| `want:return-to-title` | game → main | Tear down and return to mode select |
| `want:chapter-ending` | game → main | Show the animated ending overlay |
| `want:horde-finished` | game → main | Show Horde results and refresh scores |
| `want:horde-restart` | main → game | Restart the same Horde configuration |

### Useful inspection points

- Phaser registry keys: `difficulty`, `storySnapshot`, `hordeConfig`, `initialRunState`, `health`, `checkpoint`, `milestones`, `counterUnlocked`, `rescueStatus`.
- `audio.setSceneAudio(music, ambience)` on map entry.
- `document.body.dataset` is set during movement, map load, rescue beats and Horde scoring.

---

## 14. Current status and known gaps

### Status summary

| Area | State |
| --- | --- |
| Foundation, tooling, asset pipeline | **Done** |
| Exploration world (5 maps, NPCs, doors, triggers) | **Implemented and integrated** |
| Dialogue and opening story | **Implemented and integrated** |
| Cutscenes C01–C04 | **Implemented and integrated** |
| Real-time combat systems | **Implemented and integrated**; standalone arena is a dev route |
| Rescue mission and ending | **Implemented and integrated** |
| Local saves and Continue | **Implemented and integrated** |
| Audio (33 WAVs) and settings | **Implemented and integrated** |
| Horde Mode | **Implemented and integrated** |
| Arcade CRT shell | **Implemented and integrated** |
| Automated checks | **Passing** at last recorded run: 90 visual + 33 audio assets, strict typecheck, 42/42 tests, production build |
| Full human playthrough in Story and Real Mode | **Pending** |
| Live Vercel deployment | **Not done** |
| Supabase cloud saves | **Deferred / not connected** |
| Final asset rights and credits | **Unconfirmed** |

### Verified in this snapshot

- `npm test`: 5 files, 42/42 passing on 21 November 2026.
- Latest recorded `npm run check`: 90 runtime visual assets, 33 audio assets, strict TypeScript clean, 42/42 tests, production build with the expected Phaser chunk warning (from `PROGRESS.md`, 21 November 2026).
- Git state: `master`, latest commit `fe372b4` ("feat(ui): implement indigo arcade CRT shell"). Two tracked files are modified locally (`PROGRESS.md` status tracking and this brief); three untracked supplied asset-drop folders (`4,5,8 asset…`, `7/`, `Set 6 and 9…`) await integration. Do not commit the drops wholesale — integrate only manifest-registered files (see gap 10).

### Known gaps and risks

1. **Manual end-to-end playthrough is still owed.** Automated tests cover pure rules, not actual keyboard/mouse flow through every scene in both difficulties.
2. **Deployment is not live.** `vercel.json` is ready; no public URL has been verified.
3. **Cloud saves are intentionally absent.** The Supabase migration is unapplied and no request is made.
4. **Rights/credits are unconfirmed.** The supplied art, generated art and audio need a licensing/attribution decision before public release.
5. **Documentation drift.** Older docs (`README.md`, `docs/ARCHITECTURE.md`, `docs/ASSET_CHECKLIST.md`, `docs/VERIFICATION.md`) still describe the Phase 0 foundation (19 assets, no campaign). Treat this brief and `PROGRESS.md` as newer for current state, while `docs/DECISIONS.md` remains the design authority.
6. **Google Fonts are external.** Offline play falls back to system fonts; bundle them if a no-network demo is required.
7. **No anti-cheat.** Local scores and saves are player-editable by design; do not present them as authoritative.
8. **CombatScene is not yet a story fight.** The campaign's combat lives in the rescue; the standalone arena is a dev/test surface. Future chapters would need explicit routing.
9. **`girl-safe` and `ending` checkpoints exist in the type but are not actively used** as resume points; the ending is a DOM overlay, not a saved scene.
10. **Bundled source drops.** The root contains untracked `4,5,8 asset…`, `7`, and `Set 6 and 9…` folders from generated-asset delivery. Do not commit them wholesale; integrate only registered files.

### What "done" would require

- A fresh-player timed run of the full campaign in Story Mode and Real Mode.
- Every rescue failure/retry path, both modes, with saves at wounded/active/failed/complete states.
- Cutscene, audio unlock, mute, reduced-motion, pause and focus-loss checks on a visible desktop.
- A Vercel preview opened from a second machine.
- Rights/credits recorded and organizer rules confirmed.
- `VERIFICATION.md` release record filled in with commit, URL, browser, resolution, known issues and rollback.

---

## 15. Non-negotiable contracts and gotchas

These are the rules most likely to break the game or the team if ignored.

### Gameplay contracts

- Exploration is **discrete grid movement**; combat is **continuous**. Never switch coordinate systems mid-step.
- Health is **campaign-global**; scenes consume it, they do not create a new pool.
- A "hit" is **one validated damage event** after invulnerability checks, not every overlapping physics frame.
- `enterCheckpoint` never heals. `completeMilestone` is the only in-run heal and rejects duplicates. `restartRescue` only accepts a failed rescue.
- Story Mode changes **enemy health and incoming damage only**. Enemy speed, counts and patterns stay identical across difficulties.
- Death wins a same-frame race against a success milestone.
- A failed rescue can be restarted at full health **without replaying the opening**.
- No branch where Lina dies and the story continues.
- The negative serum result is permanent. K is not secretly the chosen one.
- No numeric levels or XP in the campaign. Horde progression is separate.
- Character IDs are stable; display names may change.
- Dialogue, encounter tuning and milestones belong in content/rule files, not render code.
- Skip and normal completion must apply the same story flags exactly once.
- Character sheets are interaction poses, not directional walk cycles, unless a real walk sheet exists. Label missing art as temporary.
- Local play must remain fully offline and credential-free.

### Technical contracts

- `src/main.ts` must not statically import Phaser. Dynamic import only.
- `public/assets/` is generated and Git-ignored. Never edit it.
- Only manifest entries are copied. Register new art in both manifest and inventory.
- Keep output paths stable when swapping a source for a revision.
- `RunState` is schema-versioned and serializable; no Phaser objects or timers in it.
- Validate every save read. Invalid saves are preserved, not silently deleted.
- Never put a service-role/secret key in browser code. `VITE_` values are public; Supabase keys must start with `sb_publishable_`.
- No new dependencies or shared-contract changes without explaining why and getting owner authorization.
- Do not commit `node_modules/`, `dist/`, `public/assets/` or `tmp/`.
- One integrator owns `main.ts`, core state, package files and scene routing; agree on interfaces before parallel work.

### Style/quality contracts

- TypeScript strict mode: use `import type` for type-only imports; unused locals/parameters fail the build.
- Keep dialogue short and readable at 768 × 432.
- Keep content IDs lowercase kebab-case; cutscene IDs are `c01`–`c04`.
- Preserve the 55 original PNGs and source PDFs.
- Every scene must clean up its input listeners, timers and DOM overlays on shutdown.
- Do not rely on color alone for feedback.

---

## 16. Working on the project

### Read order for a new session

1. `PROGRESS.md` — current status, claims, handoffs. Always read first.
2. `AGENTS.md` — commands, constraints, finish rules.
3. `docs/DECISIONS.md` — the agreed game rules.
4. `docs/ARCHITECTURE.md` — layout and state boundaries (note: foundation-era, slightly behind current code).
5. This brief — the broad picture.
6. The relevant phase in `docs/GUIDEBOOK.md` and, for story work, `docs/PLAYTHROUGH.md`.

### Claiming work

Before editing implementation files, add a task entry to `PROGRESS.md` with:

- Task ID and player-visible result.
- Status (`In progress`, `Blocked`, `Ready for review`, `Done`).
- Agent/session label, human owner, branch/worktree.
- Owned files and acceptance criteria.
- Verification evidence and next action.
- Handoff/integration state (local, branch only, or integrated).

Do not overlap another agent's claim without a handoff. A claim is a coordination note, not a filesystem lock.

### Branch and review workflow

```sh
git switch master
git pull --ff-only
git switch -c feat/<slice>
# implement one slice
npm run check
git add <owned files>
git commit -m "<small, specific message>"
git push -u origin feat/<slice>
```

Open a PR to `master`, fill `.github/pull_request_template.md`, and get a teammate review plus a targeted playtest. Keep commits small. Direct commits need owner authorization. Never force-push `master`.

### Finish checklist

- `npm run check` passes (application changes).
- Manual checks for the touched phase are done, in **both modes** for combat/saving changes.
- Screenshots for visual/input changes.
- No credentials, generated folders or unrelated files staged.
- `PROGRESS.md` updated with changed files, dated verification, remaining work and exact next action.
- Activity log entry appended.
- Documentation links and claims are consistent.

### Documentation-only changes

Link/consistency checks are enough; do not rerun unrelated game tests. State exactly what was and was not checked.

---

## 17. Documentation index

| File | What it holds | Authority |
| --- | --- | --- |
| `PROGRESS.md` | Live status, task claims, handoffs, activity log | **Live source of truth for status** |
| `AGENTS.md` | Contributor/agent commands, constraints, finish rules | Operational authority |
| `CLAUDE.md` | Claude-specific entry instructions | Operational |
| `docs/DECISIONS.md` | Agreed game rules and change policy | **Design authority** |
| `docs/ARCHITECTURE.md` | Original layout, ownership and state boundaries | Foundation-era; partly superseded |
| `docs/GUIDEBOOK.md` | Phase-by-phase build guide, prompts, manual checks, cut order | Planning |
| `docs/PLAYTHROUGH.md` | Approved story direction, dialogue, cutscene ledger, ending | **Story implementation authority** |
| `docs/COMBAT_DESIGN.md` | Combat philosophy, numbers, failure rules | Combat design |
| `docs/TASK_BOARD.md` | Roadmap, roles, organizer notes | Planning |
| `docs/VERIFICATION.md` | Dated test/release evidence | Evidence |
| `docs/TEAM_WORKFLOW.md` | Four-person split, branch/review process | Process |
| `docs/ASSET_CHECKLIST.md` | Asset audit, production gaps, credits ledger | Art/audio |
| `docs/DEPLOYMENT.md` | Vercel and Supabase setup | Release |
| `docs/OPTIONAL_HORDE_GUIDE.md` | Later horde/leveling design | Optional/post-MVP |
| `README.md` | Setup and Phase 0 manual checklist | Onboarding (foundation-era) |
| `WANT-Asset-Generation-Prompts.md` | Copy-ready art/audio prompts | Art production |
| `Script (2).pdf` | Supplied authoritative script | **Source material** |
| `Game_Idea_Want.pdf`, `Story_Want_.pdf` | Supplied background | Background |
| `output/pdf/*.pdf` | Generated printable guides | Generated from Markdown |
| `brief.md` (this file) | Complete project brief | Orientation/context |

### Source-vs-implementation note

`docs/PLAYTHROUGH.md` is the approved implementation script, adapted from `Script (2).pdf`. Where they differ, the playthrough records the approved direction and connective dialogue. The PDFs are planning snapshots, not live status.

---

## 18. Glossary

| Term | Meaning |
| --- | --- |
| **K** | The playable protagonist; the "wrong person" retrieved from 2026. |
| **Lina** | The 19-year-old courier K rescues; the emotional centre of Chapter One. |
| **Mai** | Resistance rescuer who brings K to 2085 and later apologises. |
| **Isshin** | Resistance fighter who gives K the pistol and covering fire. |
| **Kingsley** | K's roommate; the intended retrieval target and serum match. |
| **GenXO1** | The modified model behind the collapse, per Mai's exposition. |
| **Milestone** | A named, one-time recovery event (`girl-rescued`, reserved `resistance-covered`). |
| **Checkpoint** | A coarse campaign location in `RunState` (`campus`, `dorm`, `camp`, `rescue-start`, `girl-safe`, `ending`). |
| **Story flag** | A string marking a completed beat, used to gate NPCs, doors and objectives. |
| **RunState** | Serializable campaign state: difficulty, health, checkpoint, counter, rescue status, milestones. |
| **StoryProgress** | In-memory story state: maps, flags, completed sequences, objective, visited maps. |
| **Reflex Counter** | The perfect-dodge reward: bullet-time plus a piercing 3× shot. |
| **Snap Reload** | A timed reload sweet spot that grants one overcharged round. |
| **Exposed** | A staggered or cover-slammed enemy taking 1.5× damage. |
| **Breach** | The scripted machine incursion in the dorm; not a winnable fight. |
| **Horde / Resistance Trials** | Standalone survival mode, separate from the campaign. |
| **CRT shell** | The arcade cabinet + monitor presentation around the game. |
| **Manifest** | `assets/runtime-manifest.json`, the allow-list of shipped images. |
| **Inventory** | `assets/inventory.json`, the record of every source image and rights status. |

---

## 19. Copy-ready AI context prompt

Paste this with the repository (or with this file) when asking an AI to work on WANT:

```text
You are assisting on WANT — Chapter One: The Wrong Person, a story-led
top-down browser game built with Phaser 3, TypeScript (strict), and Vite.

Read these first, in order:
1. PROGRESS.md — live status, task claims, handoffs. Do not overwrite others.
2. AGENTS.md — commands, constraints, finish rules.
3. docs/DECISIONS.md — agreed game rules.
4. brief.md — complete project brief (this file).
5. docs/PLAYTHROUGH.md for story work; docs/COMBAT_DESIGN.md for combat.

Core facts:
- 768x432 canvas, 48px tiles, 16x9 maps. Exploration is grid-based;
  combat is continuous. Never mix coordinate systems mid-step.
- Health is campaign-global and persists. Only completeMilestone('girl-rescued')
  heals in a run, once. enterCheckpoint never heals. A failed rescue can be
  restarted at full health without replaying the opening.
- Story Mode: enemy HP x0.5, 25 damage/hit. Real Mode: 50 damage/hit, two hits kill.
  Enemy speed/counts/patterns are identical across modes.
- Dialogue, maps, cutscenes and encounter tuning are data-driven under src/content/.
  Keep character IDs stable. Skip and read must set the same flags exactly once.
- Phaser is lazy-loaded from src/main.ts. public/assets/ is generated and ignored.
  Never edit it. Register new art in assets/runtime-manifest.json and inventory.json.
- Local play must stay offline and credential-free. No secrets in VITE_ variables.
- No new dependencies or shared-contract changes without owner authorization.

Before coding:
- Claim a concrete task in PROGRESS.md with files and acceptance criteria.
- Inspect git status; never reset, clean or overwrite another agent's work.
- Keep changes consistent with existing structure and style.

Before finishing:
- Run `npm run check` for application changes.
- Do manual checks for the touched phase, both modes for combat/saving changes.
- Update PROGRESS.md with changed files, dated verification, remaining work and
  the exact next action. Append an activity-log entry.
- State clearly what was tested and what was not.
```

---

*End of brief. For current status, always check `PROGRESS.md`.*
