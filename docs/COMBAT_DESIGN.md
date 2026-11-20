# Combat - survive, notice, answer

This is the selected implementation design for the story campaign. The foundation contains rule constants and state tests; real-time combat is built in Phase 3.

## Player experience

At first K moves awkwardly, fires a weak pistol, and survives by dodging. Machines are frightening because a mistake matters, but their windups tell the player how to respond. In the rescue, K learns to dodge **toward an opening** and fire a strong counter. The enemy is still dangerous; the player's improved timing is the growth.

Keep the first playable version to two enemies: a ranged Scout and a charging Rusher. Reuse their sprites with readable color/shape variations rather than making a new boss.

## Controls and a typical exchange

| Input | Exploration | Combat |
| --- | --- | --- |
| WASD / arrows | One grid step | Continuous movement, normalized diagonals |
| Mouse | Menus | Aim |
| Left click | Menus | Fire; counter if a window is active |
| Space | No action | Short dodge in movement direction; otherwise toward aim |
| E | Talk/interact | Use extraction switch when in range |
| Esc | Pause | Pause, including enemy timers and bullets |

A Scout draws a warning line for 800 ms, locks its direction near the end, then fires. K moves/dodges out. A Rusher marks a lane, commits, then recovers. K can shoot while it recovers. Do not make every enemy track K throughout a committed attack.

## Counter: earned technique, not a new superpower

1. The first alley fight teaches movement, aiming and ordinary dodge with only one Scout.
2. At Lina's shelter, K sees a Rusher repeat a recognizable pattern. A brief paused teaching card explains the exposed mechanism after a near miss. The `counterUnlocked` flag becomes true once for this attempt.
3. A **perfect dodge** means K would have been hit by one committed, hostile attack during the dodge's invulnerable interval; proximity to any enemy alone is insufficient. Track attack IDs so one attack cannot award several counters.
4. Show a ring and the words **COUNTER - CLICK** for 250 ms after that successful dodge. The next left click fires one shot for 3x pistol damage at the aim direction. A missed window becomes a normal shot, never an extra punishment.
5. Consuming the window clears it. No stacked counters, unlimited invulnerability, health gain, or XP. New damaging hits and scene exits clear stale windows.

Tuning starts at a 180 ms dodge, 900 ms dodge cooldown, 1000 ms invulnerability after taking damage, and 800 ms enemy windups. Human playtests may widen the counter window. Both modes use the same patterns/windows; Story Mode changes enemy health and incoming damage only.

## Health, death and fairness

| Rule | Story Mode | Real Mode |
| --- | --- | --- |
| K's full health | 100 | 100 |
| Each accepted damaging hit | 25 | 50 |
| Ordinary hits from full health | 4 | 2 |
| Enemy base health (Scout example) | 30 | 60 |
| Scene/battle transition | Preserve wounds | Preserve wounds |
| First `girl-rescued` milestone | Restore to 100 | Restore to 100 |
| Defeat during rescue | Game Over, then explicit mission retry | Same |

The HUD should show four clear health segments in Story Mode and two in Real Mode. A single multi-frame collision or overlapping same-frame attacks cannot consume the entire health pool. Damage feedback must include a shape/flash/text cue and an optional sound; it must not depend only on red color.

No player damage during dialogue, cutscenes, loading, pause, or the teaching card. Window focus loss auto-pauses. Pausing freezes cooldowns and enemy/objective clocks. On resume, clear held fire/dodge inputs and offer a short ready countdown if necessary.

## Rescue mission: three beats, one attempt

**Entry snapshot:** outside the alley, retaining current health. This marks the rescue mission boundary. A retry starts here at full health, resets all three beats and the counter unlock, and preserves the earlier story. Moving between these beats never heals.

1. **Alley approach (about 60-90 seconds).** One Scout, then one Rusher. K chooses to enter after hearing Lina. Let the player retreat inside the arena to find space; no forced damage or surprise rear spawn.
2. **Hold the shelter (about 2 minutes including teaching).** Reach Lina and unlock the counter explanation. She gets behind hard cover and radios the resistance. Survive a clearly displayed 45-second hold while Isshin opens the extraction route. Use a fixed queue of six attackers, at most three active, with visible spawn warnings and safe spacing. Lina is not an independently simulated health bar; this avoids escort AI and a second hidden failure condition. All enemies still threaten K. No kill-count healing.
3. **Extraction (about 90 seconds).** Mai joins at a fixed safe marker. One final Rusher covers the short route to an old gate. K clears/suppresses it and holds E at a nearby switch for one second; taking damage interrupts the hold. Lina follows a short scripted path only after the lane is safe. When she reaches Mai's extraction marker, freeze enemies, mark `girl-rescued` once, restore health, and begin the ending.

Total with dialogue and transitions: approximately six minutes. The larger horde exists in distant silhouettes, sound and background animation, not hundreds of active bodies. Cap **all** gameplay enemies at four, including late spawns; first mission normally uses three or fewer.

If K reaches zero health at any point, stop simulation, record failed status, and show Game Over. The story cannot advance. Lina has no alternative death ending. On restart, clear enemies, bullets, timers, input listeners, windows and objective flags, then restore the attempt snapshot. A browser refresh after death must still show Game Over, not revive K.

## Companion behavior

Isshin supplies scripted covering fire from fixed positions, aimed at a chosen attacker at readable intervals. Mai waits at extraction and provides short cues. They do not require autonomous navigation or party inventory. Solo combat uses the same K controls and rules.

## Implementation acceptance

- A player can describe the dodge/counter after one teaching encounter and survive by reading cues rather than memorizing invisible timers.
- Dodge cannot tunnel through walls. Diagonal movement has no speed advantage. Aim matches the pointer at all canvas sizes.
- Enemy body/projectile overlap produces one damage event within the invulnerability window; the second Real hit kills after it expires.
- At zero health, the enemy/objective loop stops immediately. Clear a lethal-hit/milestone race in favor of death, not a last-frame heal.
- Story Mode multipliers affect every enemy spawn, including retries. No healing on scene load, enemy kill, pause, reload, or repeated milestone trigger.
- Holding a key through a transition does not fire/skip/dodge on the next screen.
- No enemy spawns inside K, solid cover, Lina's shelter, or the extraction destination.
- Test the actual 60 FPS and throttled-frame behavior before adding more enemies. Balance is not established by the unit tests alone.
