# Optional combat and leveling mode - separate later track

**Priority: after the story campaign is complete, tested and submitted-ready.** Do not implement this during the four-day critical path. This guide is a roadmap, not a claim of working horde gameplay.

## Product boundary

The finished game can eventually have two entry points: **Story** for the narrative campaign and **Resistance Trials** for replayable combat, waves and level-ups. Trials uses K's combat controls, enemies and art, but owns its own run state, wave scheduler, XP and rewards. It never changes a story save or becomes a prerequisite for seeing the ending.

Begin Trials as a training scenario at the resistance base, outside the main timeline. This lets the mode focus on practice without rewriting the meaning of Lina's one-life rescue attempt. Keep Story and Real difficulty labels consistent: half enemy HP/damage in Story; two hits from full health in Real. Do not add max-health level-ups unless the creator explicitly changes that rule.

## H0 - define the smallest trial

**Outcome:** one arena, two existing enemy types, five finite waves, one end screen. Endless waves are a later extension. **Depends on:** campaign combat proven stable.

**Build/design prompt**

```text
Plan Resistance Trials as an optional mode using existing WANT combat. Read
DECISIONS, COMBAT_DESIGN and this guide. Specify one arena, five wave definitions,
safe spawn rules and a separate HordeRun type/save namespace. No story dependencies,
shared health progression, online scores or new enemy art requirements. List exact
shared code to reuse; do not refactor the whole campaign to prepare for this mode.
```

**Check prompt:** "Trace the proposed boundaries. Could starting/retrying a trial alter the campaign save, heal story K, unlock its counter early, or mark Lina rescued? Identify coupling before implementation."

**Human gate:** describe the objective and controls in one sentence; start Story normally after returning from the proposed Trials menu; confirm the scope remains five waves.

## H1 - waves with fair spawns

**Outcome:** playable five-wave survival challenge with an explicit start and finish.

**Build prompt**

```text
Implement H1 only: a separate Trials scene with the approved five-wave data,
visible wave number, remaining enemies, safe telegraphed spawn entries, and a
strict active-enemy cap. Reuse player/enemy behaviors from campaign combat without
changing story routing. Waves advance only after their queue and live enemies are
empty. Pause/focus loss/death must stop the entire wave loop. No XP yet.
```

**Check prompt:** "Test empty/overlapping wave transitions, death during a spawn, repeated restart, maximum live count, offscreen projectiles and menu exit cleanup. Verify wave completion cannot fire twice and difficulty multipliers apply at every spawn."

**Human gate:** finish all five waves in both difficulties; lose in each wave; retry ten times; no spawn appears under K or inside walls. A player can tell why the next wave begins.

## H2 - XP and meaningful level-ups

**Outcome:** a small, understandable progression loop within the trial run.

**Build prompt**

```text
Add run-scoped XP earned once per defeated enemy. Use a small explicit XP threshold
table, no exponential economy framework. At a level-up pause combat and offer one
of three readable upgrades: pistol damage, shorter dodge cooldown with a safe
minimum, or a slightly longer counter window. Cap each upgrade. No max-health
increase, kill healing or campaign rewards. Show before/after values and resume
without stuck input. Reset run upgrades on a new trial.
```

**Check prompt:** "Audit duplicate kill/XP events, threshold crossings with large XP awards, upgrade caps, stacking and negative cooldowns. Verify a level-up cannot grant invulnerability or process damage while the choice UI is open. Confirm health rules remain unchanged."

**Human gate:** each choice is understandable without a wiki; try all upgrade combinations; reaching two levels at once handles both deliberately; holding fire cannot accidentally choose an upgrade.

## H3 - bounded variety and achievement recovery

**Outcome:** replay value without adding an unmanageable art/content burden.

**Build prompt**

```text
Add a few authored wave patterns using the existing enemies: crossfire lanes,
staggered chargers and a mixed pressure wave. Increase challenge through patterns
before raw enemy count. If recovery is needed, define one named milestone such as
finishing a five-wave tier, restoring health once; ordinary wave transitions do
not heal. Keep all tunable values in trial content data. No new story mission.
```

**Check prompt:** "Find unavoidable two-hit situations, overlapping untelegraphed attacks, spawn trapping, duplicate milestone healing and runaway scaling. Verify every pattern has a plausible escape lane at the minimum movement speed."

**Human gate:** a fresh tester can survive by reading patterns, not exploiting a corner; Real Mode stays fair; healing occurs only at the visible named milestone.

## H4 - separate persistence and presentation

**Outcome:** Trials menu, results and optional persistence independent of Story.

**Build prompt**

```text
Add a Trials entry point only now that it is playable. Store its settings/best
local results separately from want.campaign.v1. Use a schema-versioned horde save
if resuming runs is needed; do not overload RunState. Keep permanent unlocks small
and cosmetic initially. Show waves survived and counter accuracy on the result
screen. Do not add a public leaderboard or claim client-side scores are trusted.
```

**Check prompt:** "Load Story and Trials saves independently, corrupt one, and confirm the other survives. Review mode-switch cleanup, difficulty identity, result double counting and local/cloud conflict behavior if cloud is later added."

**Human gate:** leave Trials, continue the story at the exact prior checkpoint/health; overwrite/reset a trial without erasing the campaign; the menu explains the difference between modes.

## H5 - performance, accessibility, then endless extension

**Outcome:** measured stability and a conscious choice about expanding beyond five waves.

**Build prompt**

```text
Profile the actual Trials build on the target laptops. Fix measured bottlenecks
before increasing enemies; pool bullets/enemies only if allocation churn is proven.
Verify non-color telegraphs, mute, reduced motion, pause and readable upgrades.
Only after finite Trials passes, propose a capped endless wave schedule with
rest moments and bounded growth. Keep the tested finite challenge available.
```

**Check prompt:** "Run a 20-minute soak and repeated mode switches. Record frame time, live object count, memory growth, input responsiveness and cleanup. Do not replace measurements with claims of optimization. Identify whether endless mode introduces unwinnable scaling or save bloat."

**Human gate:** stable long session on the weakest supported laptop, no accumulating audio/listeners, no unreadable telegraph pileups. Endless extension is optional even after this gate.

## Further improvements, outside both first releases

- **Phones:** touch stick, aim/fire solution, larger buttons, safe-area layout, landscape/portrait decision, low-end performance and real-device testing. A responsive menu alone is not mobile gameplay support.
- **More story:** another meaningful resistance mission may grant `resistance-covered`; author it before wiring healing to it.
- **Accessibility:** remappable controls, alternative aim assists and difficulty-specific timing aids as explicit settings, keeping scoring distinctions understandable if scores matter.
- **More media:** voice acting or local videos only when they improve pacing and have captions/fallbacks.
- **Online competition:** requires a separate trust/validation design. Supabase storage of a client-reported number is not anti-cheat.
