# WANT - shared decisions

Decision date: 9 November 2026. Planning horizon: four working days before offline polishing; this is not an assertion of the hackathon's calendar deadline.

**Change policy:** record the date, reason, affected phases and owner here before asking an AI to implement a changed rule. Keep the agreed stack and failure rules consistent across contributors.

## Confirmed with the creator

| Area | Decision |
| --- | --- |
| Authoritative source | `Script (2).pdf`; the other two PDFs supply background. Preserve the wrong-person premise and existing characters. |
| First release | A complete 20-25-minute opening, arrival in 2085, one civilian-rescue mission, and an ending. |
| Platform | Desktop keyboard and mouse. Top-down, grid-based exploration; sudden transitions into real-time battle arenas. |
| Story arc | K is overwhelmed and visibly grows through action. He fights alone first and alongside the resistance later. |
| Growth | Begin with weak pistol and dodge. Unlock a timed counterattack during the rescue. No XP/numeric levels in this campaign. |
| Difficulties | Story Mode: 50% enemy health and incoming damage. Real Mode: two damaging hits kill K from full health. |
| Attrition | Wounds persist between fights and scenes. Recovery during a run requires a named, meaningful achievement. |
| Rescue stakes | New local civilian. No branch where she dies and the story continues. Failure kills K and ends that attempt. |
| Retry | Game Over offers an explicit restart of the rescue mission with full health. The entire opening need not replay. |
| Scope split | Story campaign first; a separate combat/leveling/horde mode later with its own guide. |
| Services | Vercel + Supabase. Immediate guest play and local checkpoints; optional cloud saves must not block judging. |
| Team | Four people: two main coders, a third who can code with AI, all using AI tools. Assign the fourth role explicitly at kickoff. |
| Deliverables | Project foundation, phased guide with build/check prompts and human tests, team workflow, complete revised playthrough PDF. |

## Concrete design choices made for the four-day plan

These fill gaps in the brief; tune presentation and balance through playtesting rather than silently expanding scope.

- Civilian: **Lina, 19**, a local courier carrying medical supplies for the shelter. She has agency, route knowledge, and no secret genetic connection to K.
- Campaign length budget: campus 4 minutes; dorm 2; breach 2; arrival 4; exploration 3; rescue 6; ending 2 = approximately 23 minutes. Reading pace varies.
- Recovery event shipped in the MVP: `girl-rescued`, after Lina reaches safety. `resistance-covered` is a reserved later milestone, not an extra mandatory mission. Repeat events cannot heal twice.
- No passive regeneration, food healing, scene-load healing, or kill healing. Starting a genuinely new run or explicitly restarting a failed mission restores health as a new attempt.
- Story damage 25 and Real damage 50 against 100 health. No armor/headshots/variable damage in the first release. Enemy speed, counts, and attack patterns remain the same across difficulties.
- Menu: Start/Continue, difficulty, settings/controls, credits. Save difficulty with the run; switching mode starts a new run with an explicit confirmation, not a health-reset exploit.
- Real-time combat uses WASD/arrows, mouse aim, left click fire/counter, Space dodge; no dodge through solid walls. Exploration uses E to interact. Esc pauses in the finished campaign.
- A narrow successful dodge exposes a brief counter window. The next click uses the same attack control. K wins through improving technique, not suddenly obtaining unexplained powers.
- Illustrations with gentle camera movement are the primary cutscene format. Video is supported later or used only if ready. No voice acting requirement.
- Depict the scripted violence through silhouette, brief flashes, aftermath, and sound. Do not invent additional graphic scenes to fill missing animation.
- Linear core story, optional local conversations. No alternate ending or relationship-stat system in this sprint.
- English text; subtitles for meaningful audio cues. Menus and cues cannot rely on color alone. Sound starts only after a user gesture.
- Optional cloud save is an explicit passwordless email sign-in after local play works; no forced accounts or automatic anonymous-user creation.

## Open operational tasks, not design blockers

- Assign real teammate names/handles, verify the hackathon's prebuilt-code/AI/asset rules, and confirm final submission requirements from the organizer.
- Confirm ownership/usage rights for all provided and acquired assets; record sources.
- Create the shared GitHub repository and Vercel/Supabase projects with team access; set their actual URLs and credentials through environment settings.
- Have a new player measure readability, combat fairness, runtime, and volume. Current numeric tuning is a starting point, not tested balance.

