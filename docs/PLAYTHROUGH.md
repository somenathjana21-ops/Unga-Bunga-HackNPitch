# WANT - complete campaign playthrough

## 00 / Reading this playthrough

**Version:** 1.0, 9 November 2026. **Target:** approximately 23 minutes for a first successful run, plus any retries. **Platform:** desktop keyboard and mouse. **Scope:** opening, arrival in 2085, one rescue mission and a complete emotional ending.

The supplied `Script (2).pdf` is the authoritative starting point. Scenes through K's release into the settlement adapt that script, keeping the central events and characters. Dialogue is tightened and Mai's exposition is split into playable sections. Lina, the rescue mission, counterattack growth and ending are new material developed from the creator's requested continuation. This is an implementation script, not a transcript of a finished game.

**Player promise:** You are not the person they needed. You can still choose to help.

**Story route:** campus and library > dorm > breach > resistance clinic > settlement > alley > shelter hold > extraction > return to camp.

**Main cast:** K, Kingsley, Hachimi, Sayu, Nero, Mai, Isshin. Supporting appearances: Kingsley's girlfriend, the news reporter, Man 1 and Man 2. New civilian: **Lina, 19**, a courier who knows the district and brings medicine to a shelter. Mick may appear as an offscreen medic; the arms dealer is an optional static interaction, not a trading system. No extra modeled character is required for a brief voice/text-only role.

**Presentation:** exploration uses modest top-down pixel scenes. Dialogue uses the existing speaking portraits. The major emotional moments use a few composed illustrations with restrained movement and captions. Combat is continuous real-time movement in bounded arenas reached from the grid world.

**Difficulty:** Story Mode halves enemy health and incoming damage. Real Mode kills K on his second damaging hit from full health. Wounds carry between battles; only a named achievement heals during a run. A failed rescue ends the attempt and offers an explicit mission restart at full health.

## 01 / A day already going wrong

**Budget:** 2 minutes. **Location:** campus approach, 2026. **Player objective:** Reach the faculty library. **Control lesson:** move, interact, read a phone message.

Begin on a quiet campus street. K stands near a crossing with a bag over one shoulder. The screen shows only the current objective and a brief movement prompt. Hold no dialogue longer than the player needs to learn one control.

K takes a few steps. His wallet falls from his pocket beside the crossing. A small sound and an interaction marker invite him to retrieve it; the story does not soft-lock if he walks past. Cars are atmosphere here, not a sudden lethal road-crossing minigame.

**K:** "Of course. Even my pocket's given up on me."

His phone vibrates. Movement pauses for the call.

**Nero:** "Results are up. Did you see?"

**K:** "Tell me I passed."

**Nero:** "You passed. Barely. I topped the class."

**K:** "Congratulations. I think I'm going back to bed."

The call ends. Let the player walk another short stretch. A second call arrives from an unfamiliar number.

**Unknown caller:** "K? Come to the faculty library. It's Sayu."

**K:** "What happened?"

**Unknown caller:** "Just come. I'll meet you outside."

The objective updates to **Find Hachimi outside the library** when she is visible. The street remains navigable; do not secretly impose a timer. A slightly faster music pulse suggests urgency without punishing exploration.

Optional bench interaction: **K:** "Yesterday I was worried about a result sheet. That was an easier problem."

**Exit condition:** K speaks to Hachimi at the library entrance. Record the call and arrival once; revisiting the crossing cannot replay them.

## 02 / The bracelet

**Budget:** 2 minutes. **Location:** library courtyard. **Format:** short dialogue, illustration, walk-away transition.

**Hachimi:** "I was the one who called. I didn't know how to tell you."

**K:** "Where is she?"

Hachimi steps aside. The camera frames Sayu and Nero in the distance. Shift to an illustration of K seeing them together; the image can show their closeness without requiring an animated kiss. Hold only long enough for the realization.

**K:** "Nero?"

The music thins. K steps into view.

**Sayu:** "K, wait."

**K:** "So that's why you've been so far away."

**Sayu:** "I'm sorry. Please let me explain."

K removes his bracelet. A close-up still shows it falling between them.

**K:** "I can't listen right now. Don't contact me."

**Nero:** "K..."

**K:** "Not you."

Return control for a short walk out of the courtyard. The objective is **Go home**. Hachimi does not block him with another exposition scene.

**Hachimi:** "You don't have to say anything. Just get home safely."

Fade through a short transition to the dorm. The player has acted and walked through the opening rather than watching a long unbroken movie.

**Cutscene C01:** library/bracelet, approximately 12-18 seconds total; skippable. Normal completion and skip both set the same breakup flag.

## 03 / Kingsley leaves the light on

**Budget:** 2 minutes. **Location:** dorm room. **Player actions:** talk to Kingsley, inspect the television, go to bed.

K sits on the bed. Kingsley is preparing to leave; his girlfriend waits briefly by the door.

**Kingsley:** "You haven't moved since I got back."

**K:** "Today keeps finding new ways to get worse."

**Kingsley:** "Bad days happen. We'll get through this."

**K:** "You say that like it's easy. You have everything. How would you know?"

Kingsley stops packing. Leave a short beat rather than adding a speech.

**Kingsley:** "I don't know exactly how you feel. I can still stay."

**K:** "No. Go. I'm sorry. I just don't want advice."

**Kingsley:** "Okay. No advice. Nachos and BadRull are in the fridge. Dinner too. Call me if you need me."

Kingsley leaves. The light by the door stays on. K can inspect the food for one optional line; eating is narrative flavor and provides no healing mechanic.

**K:** "He even manages to be nice when I'm being awful."

At the television, the news reporter appears using the existing portrait.

**Reporter:** "The Bosom Heads particle-physics laboratory in Amsterdam claims an unprecedented result from its collider. The team has not yet published its research."

**Reporter:** "Elsewhere, major power surges have disrupted Cebu City's grid. Authorities are working to restore service."

**K:** "One more thing going wrong."

The objective becomes **Try to sleep**. Interact with the bed to advance. This is a deliberate player action, not an automatic transition while inspecting the room.

## 04 / Something at the door

**Budget:** 2 minutes. **Location:** dorm, late night. **Format:** controlled movement and scripted illustrated action. This is not a winnable combat encounter.

A loud impact and power failure wake K. Add an on-screen sound caption so mute does not hide the trigger. The objective is **Check the door**.

**K:** "What now?"

At the doorway, the hallway has become a hollow black barrier. The player can approach and interact once.

**K:** "That isn't the hall. It feels... empty."

Mechanical screams come from beyond. Man 1 and Man 2 burst through, firing back into the barrier.

**Man 1:** "Keep it inside! Fire!"

**K:** "Who are you? What's happening?"

**Man 2:** "Take this. If it comes through, shoot!"

He thrusts a weapon into K's hands. K cannot raise it. A mechanical limb emerges, catches Man 1, and pulls him out of frame. Use silhouette, impact, and the survivors' reactions to preserve the violent event without needing a bespoke gore animation. Man 2 is thrown across the room.

**K:** "No. No, no..."

The machine steps through and lifts K. Switch to its scanning perspective: **SCAN MISMATCH**. Its red optics shift to purple, following the authoritative script's order. K struggles to breathe.

Isshin enters and wedges an explosive into the machine's frame.

**Isshin:** "Mai! Take him. Now!"

**Mai:** "I've got him. Move!"

The machine drops K. Mai carries him through the barrier. A muffled blast ends the scene.

**Cutscene C02:** breach and rescue, approximately 35-45 seconds including captions. K's injuries are story presentation, not hidden reductions to the playable health pool. Do not ask the player to win a fight that the script requires them to lose. He begins the later playable combat after treatment at full health.

## 05 / A future with no room for surprises

**Budget:** 2 minutes. **Location:** resistance clinic, 2085. **Player actions:** wake, speak to Mai, inspect the clinic window.

Fade up on a makeshift bed, an IV stand, distant machinery, and the edge of a ruined skyline. K sees Mai nearby; Isshin is at the doorway. A medic's work can be implied through props and a brief offscreen line from Mick.

**K:** "Where am I? What happened to my room?"

**Mai:** "You're safe for the moment. Don't try to stand too quickly."

**K:** "For the moment? Where is this?"

**Mai:** "Cebu. The year is 2085."

**K:** "That's not funny."

**Mai:** "I know."

Let K inspect the window. A still panorama shows broken towers, makeshift lights and a machine patrol in the distance. His reaction comes before the history lesson.

**K:** "What happened to everyone?"

**Mai:** "Ten years ago, Panthropic released a model people thought would change everything. It did. A modified version called GenXO1 was used from a hijacked training facility in Taiwan. Markets collapsed. The people investigating it were killed."

**K:** "An AI did all this?"

**Mai:** "Someone helped it become this. We still don't know who. The conflict became nuclear. Then the machines came."

Stop the explanation here. Allow a small movement/inspection beat: a ration shelf, medical supplies, or an old radio. The radio's optional archive contains the detailed financial/nuclear figures from the supplied script for players who want them; they are not mandatory narration.

**Cutscene C03:** ruined skyline, 10-15 seconds with a slow pan or static reduced-motion view. Return input reliably after it finishes or is skipped.

## 06 / The wrong name

**Budget:** 2 minutes. **Location:** same clinic. **Player action:** ask why the resistance brought K here.

**K:** "Why bring me here?"

**Mai:** "GenXO1 released a virus. People hallucinate. They stop being able to have children. We have a possible treatment, but it needs a serum linked to a genome from your time."

**Isshin:** "The collider gave us a narrow way back. Another branch of 2026. One retrieval."

**Mai:** "We know this is too much to take in. But we need your help, Kingsley."

Silence. K looks from Mai to Isshin.

**K:** "I'm not Kingsley. I'm K. He's my roommate."

Mai checks the retrieval record. Isshin asks for a blood sample. Show a small result screen: **SERUM MATCH: NEGATIVE**.

**K:** "He was out. He'll be home by now. Can't you go back?"

**Isshin:** "We can't simply reopen the same moment. The branch has moved. Another retrieval could lead somewhere else."

**Mai:** "We spent everything we had on this."

She turns to Isshin, anger breaking through exhaustion. Preserve the supplied script's slap as a brief implied reaction, not a prolonged spectacle.

**Mai:** "You brought the wrong person."

Mai leaves. K starts to speak, then stops.

**K:** "I can still... Is there something I can do?"

**Isshin:** "Stay close to camp. Give us time to think."

Give control back. The objective becomes **Explore the settlement**. No invisible chosen-one power rescues K's self-worth. The next action must be his choice.

**Implementation note:** the negative serum result is permanent story canon. The counterattack does not reverse it or make K secretly the intended target.

## 07 / People, not a prophecy

**Budget:** 3 minutes. **Location:** compact settlement map. **Player actions:** inspect three nearby points, then follow a cry for help.

Reuse the clinic exterior, a ration line, and the approach to an old service lane. The player should see the whole useful area without wandering through a large empty city.

At the ration table, a civilian argues with an empty crate.

**Civilian:** "Half a portion yesterday. Nothing today. What do I tell the people waiting?"

**K:** "Is there another delivery?"

**Civilian:** "There was supposed to be."

At a damaged barricade, Isshin checks a magazine. He notices K watching.

**Isshin:** "If you go past the lights, take this."

He gives K a worn pistol.

**K:** "I couldn't even lift one back there."

**Isshin:** "Then learn where to stand first. You don't beat a machine by standing still. Aim, fire, move. Watch the windup."

A safe marked corner introduces mouse aiming, firing at scrap, and a dodge prompt. It is short and cannot cause damage. Do not present a full tutorial menu or an XP reward.

At the shelter board, an optional note reads: **Lina - medical delivery, east service lane**. This establishes the civilian before she appears in danger.

Nearby conversation fragments show the settlement's despair: dwindling supplies, lost relatives, and uncertainty about tomorrow. Keep each to one or two lines. K does not solve all their problems by talking.

A metallic crash sounds beyond the lane. A human voice calls for help. The objective updates to **Find the person in the east lane**. A clear map marker points there.

**K:** "Someone's still out there."

**Mission boundary:** approaching the alley gives a clear notice: **Entering a dangerous area. Progress before this mission is saved.** The first attempt retains current health. In this script it will normally be full because earlier playable scenes caused no combat damage.

## 08 / He goes anyway

**Budget:** 1-1.5 minutes. **Location:** east service lane. **Combat beat:** solo approach.

The view reveals Lina crouched behind a delivery cart near a shelter shutter. A medicine bag is pinned beneath it. Distant machine silhouettes move through the adjoining street; only the current small encounter is active.

**Lina:** "Stay back! There are more behind the carts!"

K stops. His hand shakes. Briefly echo Mai's earlier line, **the wrong person**, as text or a remembered portrait. No extra cinematic is needed.

**K:** "I heard you. I can't just leave."

The camera settles and control remains with the player. A Scout marks a firing lane. The player moves, shoots and dodges. After it falls, a Rusher enters with an unmistakable charging warning. These are separate readable threats rather than a sudden pile of bodies.

Lina uses the pause in attacks to free her bag and duck behind the shelter's hard cover. She knows the route and actively helps.

**Lina:** "There's a service gate behind me. It opens from your side."

**K:** "Then that's where we're going."

The objective updates to **Reach Lina's shelter**. Crossing into the shelter beat does not restore any lost health. If K dies here, Game Over offers a restart from the alley boundary, not a replay of the campus.

**Growth cue:** K begins this encounter with a defensive posture and uncertain line delivery. Do not simulate helplessness by ignoring the player's movement or reducing input responsiveness.

## 09 / An opening, not an army

**Budget:** about 2 minutes including teaching and dialogue. **Location:** shelter frontage. **Combat beat:** timed hold and counter unlock.

Lina finds a working radio beside the shutter.

**Lina:** "East service lane! We're cut off. Can anyone hear?"

**Isshin, radio:** "Lina? Hold where you are. The gate's jammed. Give me forty-five seconds."

**K:** "Forty-five?"

**Lina:** "You only have to stop the ones that can reach us."

A Rusher prepares a familiar attack. K notices the exposed joint as it recovers. Briefly pause before the active fight to introduce the new technique:

**COUNTER UNLOCKED**

**Dodge through a near hit. When COUNTER appears, click to fire into the opening.**

The teaching card uses a simple still diagram and the same controls already learned. A player dismissal resumes the fight. The attempt's `counterUnlocked` flag is now true. This is recognition of a pattern, not a supernatural transformation.

**K:** "One opening. I can do that."

A visible **Gate release: 45 seconds** timer begins. Fixed waves arrive from marked entries, with no more than three active attackers at once. Keep Lina behind hard cover and out of direct enemy simulation. The mission's failure condition is K's death, not a secret second timer or unseen civilian health bar.

On a perfect dodge, show a brief ring and **COUNTER - CLICK**. A successful counter gets a sharper sound, a clear hit effect, and one short reaction; avoid pausing for a movie every time.

**Lina, after the first counter:** "You got it!"

**K:** "Keep the radio on."

The player can still win with ordinary shots and movement; the counter makes taking initiative visibly more effective. It must not become an unexplained mandatory quick-time event.

At zero on the hold timer, Isshin enters a fixed cover position and fires down a marked lane. Any remaining local enemies remain a threat until cleared/suppressed; the game does not silently heal or teleport K.

**Isshin:** "Gate's open! Mai's coming through. Move when I cover you!"

## 10 / Get her through

**Budget:** about 1.5-2 minutes. **Location:** service gate and extraction marker. **Combat beat:** short movement objective with resistance support.

Mai appears at the far side of the gate. The objective is **Open the service gate and get Lina to Mai**.

**Mai:** "K? What are you doing out here?"

**K:** "Helping. Cover the gate!"

One final Rusher commits to the route. The player can dodge/counter or shoot it down while using cover. Isshin provides readable supporting shots rather than clearing the encounter instantly.

At the switch, a prompt reads **Hold E: open gate** with a one-second progress ring. Damage interrupts the hold. The player cannot be trapped in an uninterruptible animation while enemies attack.

Once the gate is open and the lane is safe, Lina follows the short fixed route to Mai. Her movement is a scripted extraction, not a complex escort system. K stays under player control until she reaches the marked safe zone.

**Lina:** "I'm through!"

**Mai:** "I've got her. Isshin, fall back!"

The rescue success moment is precise: Lina reaches Mai alive, and K is alive. Stop hostile simulation, mark **girl-rescued** once, restore K to full health, and show a quiet **Resolve restored** cue. If a lethal hit occurred first, death wins and success cannot revive him.

**K:** "Okay. Okay..."

His hands are still shaking, but he keeps the pistol lowered safely and follows the others. Survival has not made him invincible.

**Cutscene C04:** K standing between Lina and approaching machines, followed by the group at the gate. Use a modest 12-20-second illustrated sequence or a still with two captions. This is the first emotional payoff, not the end of all conflict.

## 11 / Someone who went back

**Budget:** 2 minutes. **Location:** shelter inside the resistance camp. **Format:** final dialogue, short controllable epilogue, ending card.

Lina puts the medicine bag on the clinic table. Mick's offscreen thanks or a nearby civilian's reaction establishes that the delivery mattered beyond the fight.

**Lina:** "I was bringing these back when the patrol cut through the lane. I thought nobody heard me."

**K:** "I almost kept walking."

**Lina:** "But you didn't."

Mai approaches. She looks at the rescued civilian before looking at K.

**K:** "I know I'm not who you came for."

**Mai:** "You're who went back for her."

Leave a pause. Mai's earlier mistake is not erased by an instant friendship.

**Mai:** "What I said in the clinic... You didn't choose to be dragged into this. I'm sorry."

**K:** "I still can't give you the cure."

**Isshin:** "Today you gave someone a way home. We can start there."

Let the player take a few steps through the same shelter area. The rescued medicine is now on the table; Lina is safe; an empty bed is being prepared for someone else. The world has changed in a small visible way because the player acted.

An optional final interaction with Lina gives:

**Lina:** "Tomorrow, if you're staying, I'll show you the lanes without the machines."

**K:** "I'd like that."

At the exit, a clear **Finish chapter** interaction triggers the ending. K looks toward the city.

**K, internal:** "I wanted someone to tell me what I was supposed to be. Maybe I can start with what I choose to do."

**Ending card:** **WANT - Chapter One: The Wrong Person**

**Closing line:** **You were not the person they came for. You were the person who stayed.**

Show credits and return-to-menu/replay options. Do not open an empty horde-mode button. Later chapters remain possible, but this release ends with a resolved rescue and emotional change.

## 12 / Failure, pause and continuation

**One attempt means one life inside the rescue.** The creator confirmed that a failed attempt may be restarted from the rescue mission boundary.

When health reaches zero, stop input, enemy attacks, objective timers and companion actions. Show a short collapse/silhouette and **GAME OVER - K couldn't make it through.** Do not depict Lina's future or offer a branch continuing without her.

Buttons: **Restart rescue mission** and **Return to title**. Restart begins at the alley with full health, the selected difficulty, no counter unlock yet, fresh enemies, an uncompleted hold timer and a closed gate. Earlier story flags remain intact. This is a new attempt, not healing inside the lost attempt.

Persist failed status immediately when local storage works. Returning to title and pressing Continue returns to the Game Over decision. Reloading must not resurrect K. If saving is unavailable, explain that progress cannot be kept; do not claim an ironclad anti-cheat system in a local single-player game.

For a non-failed interrupted rescue, save its beat, health, objective time and unlock state. Resume at the beat's defined safe spawn with those values. A checkpoint cannot turn a wound into full health. Repeated cutscene/mission triggers cannot grant the rescue recovery twice.

Esc pauses the finished game. All combat clocks pause too. Settings offer master/music/effects volume, mute, reduced motion and text speed. Cutscenes can be skipped and dialogue can reveal instantly. Important cues have text/shape equivalents. Losing browser focus automatically pauses.

The optional cloud service never decides whether a player may start. It is an explicit convenience after local saves work. Conflicting local/cloud progress requires a player choice.

## 13 / Production and cutscene ledger

| ID | Moment | Required visual | Sound/caption | Fallback |
| --- | --- | --- | --- | --- |
| C01 | Library and bracelet | Courtyard composition; bracelet close-up | Phone ends, small metal impact, music drops | Existing portraits plus bracelet prop on a flat background |
| C02 | Breach and retrieval | Barrier, machine silhouette, K scan, Mai/Isshin rescue | Power cut, mechanical shriek, shots, muffled blast; captions | 3-4 still panels with flashes disabled under reduced motion |
| C03 | 2085 skyline | Ruined city view beyond clinic | Distant machinery, wind; captioned if meaningful | Static skyline with dialogue |
| C04 | Rescue payoff | K shielding Lina; service gate extraction | Final shot, cover call, music resolves | Character compositions on the extraction map |

No video is required to complete this script. If a ready video is used, ship a local compressed file, captions, skip, and a still/text fallback. Do not make the deadline depend on rendering a new video.

**Environment needs:** campus/courtyard tiles, dorm interior, clinic/settlement tiles, alley/gate arena, barriers/cover/door props. Reuse clinic and settlement scenery for the ending.

**Character needs:** existing portraits and interaction poses; four-direction K walk cycle; minimal combat/dodge frame treatment; Lina idle/walk/portrait; Scout and Rusher sprites; readable projectile and telegraph effects. Isshin/Mai can use static combat positions in the first version.

**Sound needs:** UI confirm, footsteps, phone vibration, ambient loops, pistol, enemy windup, dodge, counter, hit, gate, victory/failure. Keep sources/licensing in the asset ledger. Do not require voice acting.

**Playtest questions:** Does the player know why K is the wrong person? Do they choose to rescue Lina without being confused about the route? Can they explain and use the counter? Does a death feel fair? Is the ending satisfying even though the larger war remains unresolved? Measure the runtime rather than assuming the timing budget is achieved.
