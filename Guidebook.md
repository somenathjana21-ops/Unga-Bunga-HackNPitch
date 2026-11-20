# WANT — Project Guidebook

**Version 1.0 · November 2026**
**Project:** WANT — a story-driven 2D top-down browser game with real-time combat.
**Team:** 4 people total — 3 developers (Group A) + 1 creative lead (Group B), with any Group A member able to join Group B when needed.
**Tools:** Everyone works through AI agents. Humans write prompts, run checks, and manually test.

---

## 1. What we are building

WANT is a desktop browser game (keyboard + mouse) built from the `WANT-Playthrough.pdf` implementation script. A first successful run targets roughly 20–25 minutes.

**The experience:**
- **Act 1 (2026, campus):** K's day goes wrong — failed results, his best friend Nero and his girlfriend Sayu together, the bracelet dropped. Dorm scene with Kingsley. Night breach: a machine drags K through a barrier after a SCAN MISMATCH.
- **Act 2 (2085, Cebu ruins):** K wakes in a resistance clinic. Mai and Isshin explain: they retrieved the *wrong person* — they needed Kingsley. The serum match is negative, permanently. K chooses to act anyway.
- **Act 3 (the rescue):** K hears a cry in the east service lane and rescues Lina, a 19-year-old courier. Combat beats: solo alley fight (Scout, then Rusher), a 45-second shelter hold with the **COUNTER** unlock, a gate hold-and-extraction, and the emotional payoff.
- **Ending:** *"You were not the person they came for. You were the person who went back."* — Chapter One: The Wrong Person.

**What the project expects on top of the playthrough:**
1. Good character controls and backgrounds (top-down pixel exploration, responsive real-time combat).
2. Free / no-copyright SFX and music, tracked in an asset ledger with sources and licenses.
3. Strong desktop-browser appeal — juice, transitions, composed illustrations for emotional beats, clean UI.
4. A finished campaign: furnished chapters, plus a **Horde Mode** with a special **Maniac difficulty** — the player should go through hell.

**Canonical design facts (do not violate):**
- K is *always* the wrong person. The negative serum result is permanent story canon; nothing retcons it.
- Script-required losses are not winnable fights (the dorm breach). Playable combat starts after K is treated, at full health.
- Wounds carry between battles; only the named rescue-success achievement ("Resolve restored") heals mid-run.
- A failed rescue restarts from the alley boundary with full health, fresh enemies, no counter unlock, closed gate. Earlier story flags stay intact.
- No more than 3 active attackers at once in the hold; Lina is behind hard cover, not a simulated escort with health.
- Never impose hidden timers, secret fail states, or uninterruptible animations.

---

## 2. Source-of-truth documents

| Document | Role |
|---|---|
| `WANT-Playthrough.pdf` | Authoritative implementation script: beats, budgets, dialogue, cutscenes C01–C04, systems, failure rules. |
| `Script (2).pdf` (creator's original) | Backing material for scenes through K's release into the settlement. Dialogue may be tightened. |
| `Prompts.md` | The full prompt library — every build prompt, check prompt, orchestration prompt. |
| `asset-ledger.md` | Group B maintains: every asset, its source, license, file path, and which beat uses it. |
| `decisions.md` (repo root) | Short dated log of technical decisions (engine, folder layout, conventions). |

If the playthrough and any other doc conflict, **the playthrough wins**.

---

## 3. Team structure

### Group A — Development (3 people: You + 2 friends)

Each member works in **their own git worktree** with their own AI agent sessions. Suggested ownership (adjust freely, but keep one clear owner per area):

| Member | Primary ownership |
|---|---|
| **Dev 1 — Core & Combat** | Player controller, camera, collision, aiming/shooting, dodge, counter system, enemy AI (Scout, Rusher), health/damage, hit feedback. |
| **Dev 2 — World & Story** | Scene/level system, tile environments, interactions, objective UI, dialogue system, portraits, cutscenes C01–C04, chapter flow. |
| **Dev 3 — Systems & QA** | Game state, save/checkpoint persistence, pause/settings, difficulty modes, game-over/restart flow, audio integration, performance, browser testing, the merge checklist. |

Every member still tests everything. Ownership means *you fix it first*, not *only you touch it*.

### Group B — Creatives (the 4th person; any Group A member may join)

Group B produces **assets only** — it does not edit game code, except in the optional Horde Mode worktree (§6). Any number of people may work in Group B at a time.

Responsibilities:
1. Run the **asset research prompt** (P-B1) against the existing character art in the `assets/` folder — analyze it first, *then* decide what else is needed.
2. Generate/commission all required assets using the produced prompt file: backgrounds, tiles, props, character animations, portraits, illustrations, VFX.
3. Curate **free / no-copyright SFX and music** (P-B2) and place them in the repo with the asset ledger updated.
4. Deliver assets into the agreed folder structure (§5) so Group A integrates them without renaming.

---

## 4. How work progresses: the Phase system

Group A never works as one big blob. Work proceeds in **phases**. Each phase has exactly this rhythm:

```
1. BUILD   → Each member sends their phase build prompt (from Prompts.md) to their agent,
             in their own worktree, on a branch named for the phase.
2. CHECK   → Each member sends the phase check prompt to their agent, then does the
             manual test checklist themselves (checks are in Prompts.md).
3. REPORT  → Each member posts a short result in the team channel: done / blocked / bugs.
4. ORCHESTRATE → ANY member (usually whoever finished first) sends the Orchestration Prompt.
             It merges all three worktrees, resolves conflicts, runs the full game,
             and tags the phase release. Only then does the next phase start.
```

Rules:
- **Never skip the orchestration step.** A phase is not done until the orchestrator merges and tags it.
- **Never start phase N+1 in a fresh area that phase N owns.** If you are blocked, say so in the report instead of hacking around someone else's system.
- Worktree branch naming: `phase/<n>-<short-name>` (e.g. `phase/4-combat-core`). Orchestration merges into `main` and tags `v0.<n>`.
- Agents only touch code inside the repo conventions (§5). If an agent wants to restructure something global, the human stops it and raises it in the team channel.
- Every prompt sent to an agent must be followed by its matching check prompt before manual testing. Treat "the agent said it's done" as *unverified*.

### Phase map (Group A)

| Phase | Goal | Main owner |
|---|---|---|
| 0 | Repo scaffold, conventions, tooling, asset folder skeleton | Dev 3 |
| 1 | Core loop: game shell, top-down player controller, camera, collision, input | Dev 1 |
| 2 | World kit: scene system, campus/courtyard/dorm environments, interactions, objective UI | Dev 2 |
| 3 | Story kit: dialogue system + portraits, cutscene framework, C01–C03 wired, chapter flow through the clinic | Dev 2 |
| 4 | Combat core: aim/shoot, dodge, Scout + Rusher AI, health, hit feedback, counter system | Dev 1 |
| 5 | The rescue: alley fight, 45s hold + COUNTER unlock, gate hold-E, extraction, game over/restart | Dev 1 + Dev 2 |
| 6 | Systems: difficulties (Story/Real), save/checkpoint, pause/settings, audio wiring, asset ledger conformance | Dev 3 |
| 7 | Polish: illustrations for emotional beats, transitions, juice, performance, browser appeal | Everyone |
| 8 | Full playthrough verification against the playthrough doc + fix pass | Dev 3 |

Group B runs **in parallel from day one** — asset research and SFX/music listing are Phase 0 tasks for them. Assets land continuously; phase 7 consumes whatever polish assets are ready.

---

## 5. Repo conventions (decided in Phase 0, recorded in `decisions.md`)

```
want/
  index.html              # entry point — desktop browser
  src/
    core/                 # engine loop, input, camera, collision, math
    world/                # scenes, tiles, props, interactables, objectives
    story/                # dialogue, portraits, cutscenes, flags, chapters
    combat/               # weapons, dodge, counter, enemies, damage, telegraphs
    ui/                   # HUD, menus, pause, settings, game over
    systems/              # saves, difficulty, audio, asset ledger loader
  assets/
    characters/           # Group B delivers here — K walk cycles, Lina, enemies...
    backgrounds/          # tiles and scene backgrounds
    portraits/            # speaking portraits
    illustrations/        # composed emotional-beat illustrations (C01–C04 etc.)
    audio/
      sfx/                # ui, footsteps, pistol, dodge, counter, hit, gate...
      music/              # ambient + combat loops
    vfx/                  # muzzle flash, counter ring, telegraphs, SCAN MISMATCH...
  docs/
    asset-ledger.md       # source + license for every asset — MANDATORY
    decisions.md
  tests/
    manual/               # human checklists per phase
```

Hard rules:
- Everything runs from a **static site** — no build server required at play time, no backend. (An optional cloud save is a later convenience and must never gate starting the game.)
- Code is modular ES modules; no framework lock-in beyond what Phase 0 records.
- All asset references go through one `asset manifest` module so Group A swaps Group B's files without touching logic.
- Nothing copyrighted. Every asset in `asset-ledger.md` with source URL and license.
- Target 60 fps on a mid-range desktop browser; the game must degrade gracefully on tab-blur (auto-pause).

---

## 6. Horde Mode & the Maniac difficulty

Horde Mode is the team's addition on top of the campaign. It runs as a **separate worktree** (`phase/horde-mode`) with the same phase rhythm as Group A.

- If built by Group B's optional worktree: it follows the same build/check/orchestrate discipline — a creative person may own it, but **merge must be reviewed by a Group A member**.
- Design constraints: reuses the combat core from Phase 4+ (never forks it — import, don't copy). Arena from the settlement/alley tiles. Wave director with escalating Scouts/Rushers (and any new enemy types approved by the team). **Maniac difficulty** = maximum simultaneous enemies, faster telegraphs-shorter windows, carried wounds *within* a run, no mid-run heals. It must be brutal but fair: every death explainable, telegraphs always readable.
- Maniac unlock: finish the campaign on Real Mode, or via a konami-style code for playtesters.
- Horde mode ships **after** the campaign is verified in Phase 8, and only enters `main` through orchestration.

---

## 7. Quality bar (Definition of Done)

A phase, and ultimately the game, is done only when:

- [ ] All items in the phase's check prompt pass, in the merged build (not just in one worktree).
- [ ] The human manual-test checklist for the phase is walked through on a desktop browser (Chrome and one other).
- [ ] No console errors; 60 fps on target hardware; auto-pause on tab blur works.
- [ ] New assets are in the ledger with license; nothing copyrighted shipped.
- [ ] Playthrough-doc rules honored: budgets, beat order, failure rules, no hidden punishments.
- [ ] The playtest questions from the playthrough's production ledger can all be answered "yes":
  - Does the player know *why* K is the wrong person?
  - Do they choose to rescue Lina without route confusion?
  - Can they explain and use the counter?
  - Does a death feel fair?
  - Is the ending satisfying even though the larger war is unresolved?
- [ ] Measured runtime is near the 23-minute target — measure, don't assume.

---

## 8. Common failure modes (learned the hard way, in advance)

1. **Prompting without the doc.** Every build prompt includes "paste the relevant playthrough section." Agents that guess the story invent wrong canon. Always feed the source.
2. **Agent says "done" ≠ done.** The check prompt exists because agents over-report. Run it every time, then test manually.
3. **Skipping orchestration.** Three worktrees diverge silently. The orchestration merge is the only place the real game exists.
4. **Assets arriving un-ledgered.** Group B: no ledger entry, no merge. Group A: refuse to wire in un-ledgered files.
5. **Combat creep.** Real-time combat is where scope explodes. The counter, dodge, and two enemy types are the whole kit until Phase 7. New enemy types need team approval.
6. **Forking combat for Horde Mode.** Import the combat core; never copy it. Two copies of combat logic = two games to debug.
7. **Scope ghosts.** No trading system, no XP menu, no escort health, no voice acting, no video cutscenes. The playthrough already lists these as out.

---

## 9. Quick start

1. Read this guidebook and the playthrough. Skim `Prompts.md` so you know what exists.
2. Phase 0: Dev 3 sends P-A0 (scaffold). Group B sends P-B1 (asset research) and P-B2 (SFX/music listing) in parallel.
3. From Phase 1 on, follow the rhythm: **Build → Check → Report → Orchestrate**.
4. Keep `docs/decisions.md` and `docs/asset-ledger.md` alive. They are how the next person (or the next agent session) orients in seconds.
