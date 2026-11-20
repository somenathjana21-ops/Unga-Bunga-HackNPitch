# WANT — asset generation prompt pack

**Prepared:** 9 November 2026. **Scope:** Chapter One, approximately 20–25 minutes; campus → dorm → breach → 2085 clinic → settlement → Lina rescue → camp ending.

**Character art update, 10 November 2026.** Apply [section 13](#13-character-art-revisions) before reusing any affected character reference in this pack. The original art remains available for provenance and for pose references.

This is a production prompt document, not a collection of already-generated assets. Use it with an image or audio generator, then review and prepare the results for the game. The prompts preserve the supplied cast and the campaign in the two PDFs. New visual details and export dimensions below are **proposed production choices**, not extra story canon or changes to the game's shared contracts.

## 1. How to use this file

1. Choose an asset ID. Attach the reference images listed beside it; writing a local filename in a prompt does **not** upload the image to a generator.
2. Copy the matching common style block from section 4, followed by the asset's prompt. For a table of variants, run the prompt separately for each row, replacing its bracketed fields.
3. When a reference is an earlier output, generate and approve that output first. Reattach it on every subsequent request; do not rely on a tool remembering an earlier design.
4. Save the approved master under a new filename. Never overwrite the supplied PNGs. Proposed names in this file describe future outputs; they do not imply those files exist.
5. Verify dimensions, transparency, identity, game-size readability, frame alignment and map clearances. An image generator's promise of a precise sprite atlas is not evidence that the atlas is usable.

**Generate first:** K's movement, Lina, Scout/Rusher, world tiles and the five environment families. **Then:** props, cutscene compositions and audio. Reuse existing portraits and map scenery wherever possible. UI text, collision maps, timers and combat warning geometry should be built in the game, not painted into background images.

## 2. Sources and campaign coverage

Page numbers below are one-based PDF pages, including the cover. **P** means [WANT-Playthrough.pdf](WANT-Playthrough.pdf); **G** means [WANT-Development-Guidebook.pdf](WANT-Development-Guidebook.pdf). The supplied [Script (2).pdf](Script%20%282%29.pdf) remains the original story authority. The playthrough supplies the approved adaptation and rescue continuation.

| Story / requirement | Source | Prompts or reuse |
| --- | --- | --- |
| Campus crossing, wallet, phone, library approach | [P p. 3](WANT-Playthrough.pdf#page=3) | ENV-01, PROP-01, K-01 |
| Hachimi, Sayu/Nero, bracelet breakup | [P p. 4](WANT-Playthrough.pdf#page=4) | ENV-02, PROP-01, C01-A/B; existing portraits |
| Kingsley, girlfriend, dorm, TV, sleep | [P p. 5](WANT-Playthrough.pdf#page=5) | ENV-03, PROP-02; existing cast art |
| Barrier, retrieval team, machine scan, Mai/Isshin rescue | [P p. 6](WANT-Playthrough.pdf#page=6) | ENV-03 night variant, PROP-03, MACH-03, C02-A–D |
| Clinic, ruined skyline, wrong-person result | [P pp. 7–8](WANT-Playthrough.pdf#page=7) | ENV-04, PROP-04, C03; existing Mai/Isshin portraits |
| Rations, barricade training, shelter notice | [P p. 9](WANT-Playthrough.pdf#page=9) | ENV-05, PROP-04/05, NPC-01 |
| Solo lane, shelter hold, service-gate extraction | [P pp. 10–12](WANT-Playthrough.pdf#page=10) | ENV-06, LINA-01–03, K-02, MACH-01/02, PROP-05, FX/UI |
| Medicine delivery, camp epilogue, chapter ending | [P p. 13](WANT-Playthrough.pdf#page=13) | ENV-04 reuse, PROP-04/05, END-01 |
| Failure, restart and accessibility | [P p. 14](WANT-Playthrough.pdf#page=14) | K-02 collapse, UI-01, SFX-01 |
| C01–C04 and minimum media inventory | [P p. 15](WANT-Playthrough.pdf#page=15) | All cutscene and audio prompts |
| World, dialogue, combat, media, rescue phases | [G pp. 8–12](WANT-Development-Guidebook.pdf#page=8) | Functional requirements throughout |
| Scout/Rusher cues, counter and health display | [G pp. 20–22](WANT-Development-Guidebook.pdf#page=20) | MACH-01/02, FX-01, UI-01/02 |
| Supplied art, missing assets and delivery requirements | [G pp. 23–25](WANT-Development-Guidebook.pdf#page=23) | Reference index, specifications and acceptance checklist |

Useful living documents: [asset checklist](docs/ASSET_CHECKLIST.md), [playthrough](docs/PLAYTHROUGH.md), [combat design](docs/COMBAT_DESIGN.md), [decisions](docs/DECISIONS.md). Future changes should follow these and the progress tracker rather than silently expanding this pack.

## 3. Reference images: what to attach

Paths are relative to the project folder containing this file. This table records the supplied baseline. For revised character identities and gestures, attach the corresponding [section 13](#13-character-art-revisions) files. Use the identity image for the person and the sprite image for pixel treatment. Use poster lettering only when updating that same poster.

| Reference ID | Existing local file | Use |
| --- | --- | --- |
| R-K-BODY | [k-full-body.png](assets/characters/k/k-full-body.png) | K's outfit, proportions, purple hoodie, gray trousers, sneakers and tan shoulder bag |
| R-K-FACE | [k-speaking-pose.png](assets/characters/k/k-speaking-pose.png) | K's face, hair, expression treatment and visible wrist accessory |
| R-K-PIXEL | [k-interaction-sprites-48px.png](assets/characters/k/k-interaction-sprites-48px.png) | Pixel palette and relative scale only; six interaction poses, not walking |
| R-K-POSTER | [k-persona-poster.png](assets/characters/k/k-persona-poster.png) | Existing title/menu illustration; reuse before generating another |
| R-MAI-FACE | [mai-speaking-pose.png](assets/characters/mai/mai-speaking-pose.png) | Mai's identity and clothing |
| R-MAI-RESCUE | [mai-full-body.png](assets/characters/mai/mai-full-body.png) | Mai carrying K; useful C02 rescue pose, not a solo neutral turnaround |
| R-MAI-PIXEL | [mai-interaction-sprites-48px.png](assets/characters/mai/mai-interaction-sprites-48px.png) | Pixel scale; includes interaction/rescue poses |
| R-ISSHIN-FACE | [isshin-speaking-pose.png](assets/characters/isshin/isshin-speaking-pose.png) | Isshin's identity |
| R-ISSHIN-BODY | [isshin-full-body.png](assets/characters/isshin/isshin-full-body.png) | Long coat, equipment and action silhouette; includes part of a machine |
| R-ISSHIN-PIXEL | [isshin-interaction-sprites-48px.png](assets/characters/isshin/isshin-interaction-sprites-48px.png) | Pixel scale and palette |
| R-HACHIMI | [hachimi-speaking-pose.png](assets/characters/hachimi/hachimi-speaking-pose.png) | Courtyard witness identity |
| R-SAYU | [sayu-full-body.png](assets/characters/sayu/sayu-full-body.png) | Sayu identity, outfit and silhouette |
| R-NERO | [nero-full-body.png](assets/characters/nero/nero-full-body.png) | Nero identity, outfit and silhouette |
| R-KINGSLEY | [kingsley-speaking-pose.png](assets/characters/kingsley/kingsley-speaking-pose.png) | Dorm dialogue; reuse |
| R-GIRLFRIEND | [kingsleys-girlfriend-speaking-pose.png](assets/characters/kingsleys-girlfriend/kingsleys-girlfriend-speaking-pose.png) | Dorm doorway; reuse |
| R-REPORTER | [news-reporter-speaking-pose.png](assets/characters/news-reporter/news-reporter-speaking-pose.png) | TV broadcast; reuse inside a separately built screen |
| R-MAN1 | [man-1-full-body.png](assets/characters/man-1/man-1-full-body.png) | Retrieval-team member 1 in C02 |
| R-MAN2 | [man-2-full-body.png](assets/characters/man-2/man-2-full-body.png) | Retrieval-team member 2 in C02 |

All eleven supplied characters have an interaction sheet and speaking pose in their own folder. Do not generate replacements just because a portrait is not in the current runtime manifest. There is **no supplied Lina, complete environment pack or dedicated Scout/Rusher sheet**. A machine fragment in Isshin's illustration can inform material design, but does not establish a complete canonical enemy model.

**Reference priority:** supplied character identity → approved new character/machine design → approved environment layout → style block. If references disagree, preserve identity and layout; adapt lighting. Label each attachment in the request, especially when one image contains two people.

## 4. Common style and delivery blocks

### PIXEL — maps, props and gameplay sprites

```text
Create a production candidate for WANT, a top-down 2D story game. Match the
attached supplied pixel-character reference in pixel density, silhouette scale
and palette discipline. Use a consistent orthographic overhead RPG view with
visible front faces, no isometric diamond grid, no perspective vanishing point.
Use deliberate crisp pixel clusters and controlled shading. Keep traversable
ground quiet and actors, obstacles and warning effects easy to distinguish.
Do not imitate the background, lettering or page layout of a reference sheet.
No text, labels, logos, watermarks, UI, baked-in grid lines or decorative frames.
No photorealism, depth-of-field blur, painterly smearing or tiny noisy textures.
Render only the requested asset. Where transparency is requested, deliver real
alpha transparency, not a drawn checkerboard. Follow the specific dimensions,
state, camera and reference instructions in the asset prompt below.
```

### STILL — composed illustrations, not playable maps

```text
Create a landscape story illustration for WANT. Match the attached original
character art: expressive anime/manga-inspired drawing, clean confident lines,
controlled cel shading, grounded anatomy, restrained textured environments.
Preserve each character's exact face, hair, skin tone, outfit and accessories
from that character's attachment. Keep each identity distinct. Use cinematic
composition without changing the established story or adding new characters.
Reserve the lower 22 percent as visually quiet caption space; keep important
faces, hands and story objects above it. Leave modest outer crop safety.
No generated dialogue, lettering, HUD, logos, watermarks or borders. No gore,
sexualized posing, unexplained magical effects or redesigned costumes.
Deliver one 16:9 still, target 1920 x 1080, suitable for a static reduced-motion
presentation as well as a restrained pan. Follow the shot description below.
```

### Proposed export targets

| Asset | Target | Notes |
| --- | --- | --- |
| World base tiles | 48 × 48 px PNG | Matches the foundation's proof grid; proposed continuation, not a newly changed contract |
| Map artboards | 24 × 14 tiles = 1152 × 672 px | Working composition size; not a claim about final viewport or map dimensions |
| Human sprite frame | 48 × 48 px RGBA | Match source character height; foot anchor at x=24, y=44 proposed; prevent clipping |
| Scout / Rusher frame | 48 × 48 / 96 × 96 px RGBA | Proposed visual sizes; collision bodies remain separate and need tuning |
| Walk cycle | 4 frames per direction; 4 directions | Pack only after inspection: 4 columns × 4 rows = 192 × 192 px for humans |
| Illustration | 1920 × 1080 px master | Optimize a derived runtime copy; no exact-size guarantee from a generator |
| Speaking portrait | 1024 × 1536 px master | Matches supplied speaking-image dimensions; prepare a background-free runtime crop if needed |
| Small effect frame | 48 × 48 or 96 × 96 px RGBA | Timing, rotation and hit detection belong in the engine |
| Audio | WAV master, 48 kHz, no clipping | Derived browser files chosen during integration; seamless loops tested by listening |

If a generator cannot deliver the exact target, keep its larger master and prepare a derived export. For sprites, inspect/redraw pixels at final size; do not merely shrink a detailed painting and call it pixel art. Generate individual frames or directions when a full sheet drifts. Pad atlas exports as the renderer requires; padding is separate from frame dimensions.

## 5. Environments and background prompts

These six entries cover five reusable families: campus/library, dorm, clinic, settlement and rescue lane. For gameplay, generate clean floors and separate walls/props, then assemble a map with explicit collision data. A beautiful single painting does not supply a functional tilemap.

### ENV-00 — shared environment tile kit

**Source:** G pp. 8, 24. **Style:** PIXEL. **Attach:** R-K-PIXEL and R-MAI-PIXEL for scale; then the first approved campus/clinic artboard for palette consistency. **Output:** `world-tiles-{material}.png`.

```text
Create a small modular tile set for WANT using 48 x 48 pixel tiles. Generate
only the selected material family: [MATERIAL FAMILY]. Make one clean center
tile, two subtle center variations, straight boundary edges and matching inner
and outer corners. Flat surfaces must join on all four edges without seams;
edge and corner pieces must connect consistently. Use the same overhead camera
and scale as the attached character sprite. Neutral top-left illumination.
Keep surface contrast below character and projectile contrast. No characters,
props, cast shadows from absent objects, perspective convergence or grid lines.
Present separated pieces on transparency; do not invent an unreadable atlas.
```

Run for: campus paving/grass/curb; dorm floor/plaster wall; clinic concrete/patched wall; settlement road/rubble boundary; service-lane asphalt/industrial wall. These are proposed materials, not historical architecture claims. Check seams and assemble the final atlas manually.

### ENV-01 — campus approach, 2026

**Source:** P p. 3; G p. 8. **Style:** PIXEL. **Attach:** R-K-PIXEL; approved ENV-00 campus tiles if available. **Output:** `campus-approach-layout.png` plus floor/prop layers.

```text
Create an empty playable campus-approach artboard for WANT in 2026, 24 columns
by 14 rows at 48 pixels per tile, 1152 x 672 pixels. A quiet contemporary campus
street leads from a lower-left arrival point across one clearly marked crossing
toward the faculty library approach at the upper right. Include sidewalks,
a bench recess, restrained planting and a small place beside the crossing where
a dropped wallet sprite can be placed. Use warm muted daylight, ordinary lived-in
materials and an understated student setting. Keep the main route at least
three tiles wide in this proposed layout. Cars, if included, stay outside the
walkable route as separate decorative props. The crossing is not a hazard arena.
No people, wallet, mission markers or text. Keep the route and interaction spaces
unobstructed; show clear distinction between ground and solid boundaries.
```

### ENV-02 — faculty library courtyard

**Source:** P p. 4; G pp. 8–9. **Style:** PIXEL. **Attach:** approved ENV-01 and R-K-PIXEL. **Output:** `library-courtyard-layout.png`.

```text
Create the next compact campus map using the attached campus approach's exact
materials, scale and daylight. Use a 1152 x 672 pixel artboard. Place a recognizable
faculty-library entrance along the upper boundary, a courtyard arrival at lower
left, and a clear exit back toward the dorm route. Reserve a foreground standing
area for K and Hachimi, and a second visible area deeper in the courtyard for
Sayu and Nero. Keep an unobstructed sightline between the two groups and a small
clear patch for a dropped bracelet. Quiet benches and planting frame the scene
without hiding actors. The library facade is scenery; do not add a large playable
library interior. No people, bracelet, text, objective markers or UI.
```

### ENV-03 — dorm room and blackout variant

**Source:** P pp. 5–6. **Style:** PIXEL. **Attach:** R-K-PIXEL and approved ENV-00 dorm tiles. **Output:** `dorm-evening-layout.png`, `dorm-blackout-layout.png`.

```text
Create a modest shared student dorm room for WANT, in the same overhead game
camera and 48-pixel scale, on a 1152 x 672 pixel artboard. Establish two sleeping
spaces, K's accessible bed, a TV facing the seating area, a small fridge/dinner
corner, desks and one entrance doorway. Keep a clear path from K's bed to the
TV, fridge and door, plus standing room for Kingsley and a visitor near the exit.
Use modest warm evening light with a distinct lamp by the door. The room should
feel ordinary and inhabited, not luxurious or futuristic. Keep furniture as
separate object layers where possible. No people, broadcast image, lettering,
barrier or weapons in this normal version.
```

**Blackout edit prompt — attach the approved evening map, not a fresh layout:**

```text
Edit only the lighting and doorway state of the attached WANT dorm map. Preserve
every wall, furniture footprint, camera coordinate and walkway exactly. Show
late-night power failure with faint cool ambient light; keep traversable space
readable. Replace the doorway's view into the hall with a hollow black barrier,
a nearly featureless absence with a restrained irregular edge. No bright fantasy
vortex, runes, debris blocking the route, characters or combat HUD. Also supply
the barrier separately as a transparent overlay aligned to this doorway.
```

### ENV-04 — resistance clinic, 2085, reused for the ending

**Source:** P pp. 7–8, 13. **Style:** PIXEL. **Attach:** R-K-PIXEL, R-MAI-PIXEL, approved ENV-00 clinic tiles. **Output:** `clinic-layout.png`, later `clinic-medicine-delivered-overlay.png`.

```text
Create a small improvised resistance clinic in ruined Cebu in 2085, using WANT's
48-pixel overhead game scale on a 1152 x 672 pixel artboard. Show a makeshift bed
with space for an IV stand, an examination table with a small blank result-screen
housing, medical storage, ration shelf, an old radio, a window toward the damaged
city and a doorway to camp. Repaired fabric and salvaged concrete suggest scarce
resources, while tidy care suggests people still trying. Cool ambient light and
small warm practical lamps. Leave accessible standing positions beside the bed,
window, radio and doorway. No people, printed medical results or futuristic
luxury equipment. Keep props separable and the floor route readable.
```

**Ending edit:** “Keep the approved clinic geometry unchanged. Add the approved Lina medicine bag on the examination table, a few delivered supplies and clean bedding being prepared on an empty bed. Export these changes as a separate overlay. No glowing healing station, new room, people or text.” Attach the approved bag from PROP-05. Recovery occurs at the rescue milestone, not by interacting with this furniture.

### ENV-05 — compact resistance settlement

**Source:** P p. 9. **Style:** PIXEL. **Attach:** approved ENV-04, R-K-PIXEL and R-ISSHIN-PIXEL. **Output:** `settlement-layout.png`.

```text
Create a compact resistance settlement courtyard in Cebu, 2085, matching the
attached clinic's materials and lighting. Use a 1152 x 672 pixel overhead artboard.
Include the clinic exterior and accessible door, a ration table with empty crates,
a damaged barricade, a safe practice corner with scrap targets, a blank shelter
noticeboard, and a clearly visible eastern service-lane exit. Arrange these as
three nearby points of interest on one legible loop. Warm camp lights define
safety; the eastern lane is cooler and dimmer but readable. Suggest scarcity
through worn objects rather than graphic suffering. Keep clear routes between
all interactions. No people, target hit effects, text, ammunition pickups,
shops, healing stations or extra districts. Targets and board should be separate
props so interactions can be added later.
```

### ENV-06 — connected rescue arena: alley, shelter, gate

**Source:** P pp. 10–12; G pp. 21–22. **Style:** PIXEL. **Attach:** approved ENV-05 and R-K-PIXEL; approved Lina idle later for scale. **Output:** `rescue-lane-layout.png` and separate floor, cover, gate and foreground layers.

```text
Design one compact, connected WANT rescue arena on a 1152 x 672 pixel overhead
artboard using the same 48-pixel world scale. A western entry opens into an east
service lane. Near the middle-right is a shelter shutter, a delivery cart and
solid cover with a safe recess behind it for Lina. Place a radio by the shutter.
Farther east is a service gate with an accessible switch on K's side; beyond it
is a small safe area for Mai. Provide a fixed cover position for Isshin with a
clear supporting firing lane. Connect the entry, shelter and gate with open
routes and generous dodge space; no single-tile combat choke. Use only a few
clearly solid obstacles. Keep potential enemy-entry openings visible at the
arena boundary, away from the arrival point. Dark ruined-city surroundings
frame readable medium-value ground. No actors, bullets, blood, warning lanes,
timer, extraction marker, labels or UI. Place distant ruins outside the playable
boundary; do not imply an explorable city or an active army. Keep the gate and
cart separate so their states can change without repainting the arena.
```

This is a proposed layout, not validated encounter geometry. Review dodge clearance, line of sight, cover, safe spawns and extraction distance in-engine. If more space is needed, extend with the same tiles; do not shrink actors or squeeze the route to preserve this artboard.

## 6. Characters and machines

### K-01 — K's genuine four-direction walk cycle

**Source:** G pp. 23–24; P p. 15. **Style:** PIXEL. **Attach:** R-K-BODY, R-K-PIXEL. **Output:** `k-walk-{direction}.png`, then reviewed `k-walk-48px.png`.

```text
Create four sequential walk-cycle frames of K facing [DIRECTION], using the
attached full-body image for identity and the supplied interaction sheet only
for pixel style and scale. Preserve his purple hoodie, dark hair, gray trousers,
sneakers, shoulder-bag strap and bag on the correct anatomical side. The body
faces [DIRECTION] in every frame; this is not a sequence of dialogue expressions.
Use contact, passing, opposite contact, passing poses with modest natural motion.
Each frame is 48 x 48 pixels, on transparency, feet anchored consistently around
x=24 and y=44. Match the reference's apparent height and fit the entire body and
bag within the cell. No baked ground shadow, weapon, labels, frame borders or
extra copies. Four equal cells in one horizontal strip, target 192 x 48 pixels.
```

Run independently for **down/front, left, right, up/back**. Do not blindly mirror an asymmetric bag or accessories. Pack final rows in exactly that order only after checking every frame. Keep the first neutral standing pose separately as `k-idle-48px.png`.

### K-02 — minimal combat poses, dodge and collapse

**Source:** G pp. 20, 24; P pp. 10–14. **Style:** PIXEL. **Attach:** approved K-01 standing frame, R-K-BODY, approved PROP-05 pistol. **Output:** `k-{state}-{direction}.png`.

```text
Create one WANT gameplay frame of K in [STATE], facing [DIRECTION]. Use the
attached approved K sprite as the exact identity, palette, scale and outfit
reference. Use the approved pistol when the state calls for it. The pose must
fit a 48 x 48 transparent frame with the same stable placement as K's idle.
Keep his silhouette readable and hands anatomically coherent. No aura, armor
upgrade, magical counter power, new costume, blood or environmental effects.
```

| State | Run for | Minimum use |
| --- | --- | --- |
| cautious pistol-ready stance | Four directions | Combat base; aim rotation/weapon treatment must be chosen by the combat owner |
| low lateral dodge lean, pistol held safely | Four directions | One frame plus engine movement is sufficient for the first pass |
| controlled recoil after an accurate shot | Four directions, if needed | Optional enhancement; ordinary and counter shot can share body pose |
| brief recoiling hurt pose | Front initially | Optional; do not replace readable game feedback |
| collapsed silhouette with weapon lowered | Front initially | Short failure presentation; no alternate scene showing Lina's fate |

These are states, not a promised continuous animation. Extra aim directions or recovery frames are optional polish after the minimal version works.

### LINA-01 — design anchor for the new courier

**Source:** P pp. 2, 10–13; G p. 4. **Attach:** R-K-FACE and R-MAI-FACE as **style-only** references, not identities. **Output:** `lina-design-master.png`.

```text
Design Lina, an original 19-year-old civilian courier in WANT's resistance camp
in Cebu, 2085. Match the linework, cel shading and grounded proportions of the
attached WANT portraits, but create a distinct face and silhouette. She carries
medicine, knows the local service lanes and acts resourcefully under pressure.
Proposed design: practical tied-back dark hair, a worn muted ochre overshirt,
plain dark trousers, sturdy shoes and a compact cross-body medical delivery bag.
Show a neutral full-body front three-quarter view, a back view and a clear head
study on a simple light background. Keep clothes civilian and functional, with
the bag visible and repeatable. No weapons, military rank, glamorous styling,
school uniform, genetic symbols or chosen-one iconography. No labels or text.
Make this a consistent character-design reference, not a busy story scene.
```

Her age, role and agency are canon; hair, colors and clothing here are proposals to review once. Approve one design before creating portraits, sprites or C04. Do not drift toward a second Mai or depict Lina as a child.

### LINA-02 — speaking portrait

**Source:** G p. 24. **Attach:** approved LINA-01 identity and R-MAI-FACE for rendering style. **Output:** `lina-speaking-pose.png`.

```text
Create one speaking portrait of the attached approved Lina for WANT, target
1024 x 1536 pixels. Preserve her exact face, hairstyle, age, outfit colors and
medical bag. Match the supplied speaking portrait's linework and shading.
Show her from head to mid-thigh, facing slightly toward the viewer, alert and
earnest with one small conversational hand gesture. Hands and head fully inside
the canvas, no props crossing her face. Isolate on transparency if supported;
otherwise use a plain removable background. No text, framing or new costume.
```

One portrait is sufficient. A frightened-but-focused and a relieved expression are optional derived edits; preserve her identity and framing.

### LINA-03 — idle, walk and shelter pose

**Source:** P pp. 10–13; G p. 24. **Style:** PIXEL. **Attach:** approved LINA-01 and K-01 for scale. **Output:** `lina-idle-48px.png`, `lina-walk-48px.png`, `lina-shelter-48px.png`.

```text
Translate the approved Lina design into a WANT pixel sprite matching the
attached K sprite's camera, pixel density and height. Preserve her distinct
hair, civilian clothes and medical bag. Create [POSE] on real transparency,
48 x 48 pixels per frame with a stable foot anchor. Keep the medicine bag's
shape and strap consistent; she is a capable courier, not an armed fighter.
No blood, labels, weapons, UI or decorative ground shadow.
```

Run for a neutral idle; four-direction walk strips using K-01's four-frame recipe; one low crouch behind the cart; and one standing bag-held pose after freeing it. Lina's extraction uses a short scripted path, not a combat animation set or health-bar asset.

### NPC-01 — two reusable settlement civilians

**Source:** P p. 9. **Style:** PIXEL. **Attach:** approved Lina idle and R-MAI-PIXEL for scale only. **Output:** `camp-civilian-{a|b}-idle.png`.

```text
Create one original adult civilian for WANT's 2085 settlement. Use [VARIANT]:
A is a tired ration attendant with a practical apron over worn everyday clothes;
B is a waiting resident in a patched jacket holding an empty container. Match
the attached pixel sprite scale and camera, with a 48 x 48 transparent frame.
Ordinary humane posture, distinct from the named cast, no graphic suffering,
weapons, military uniform, text or elaborate animation. One idle pose only.
```

Only generate these if silhouettes or existing neutral NPC treatment are insufficient. Mick can remain offscreen; an arms dealer does not require a new trading system or bespoke full character set.

### MACH-01 — Scout, ranged threat

**Source:** G pp. 20–21; P p. 10. **Style:** PIXEL. **Attach:** R-K-PIXEL for scale; R-ISSHIN-BODY for industrial material cues only. **Output:** `scout-design.png`, then `scout-{direction}-{state}.png`.

```text
Design an original small ranged Scout machine for WANT. Match the attached
game sprite's overhead pixel treatment. Proposed silhouette: compact narrow
chassis, angular sensor head and a plainly visible forward barrel. Worn dark
metal with restrained light accents. It must be recognizable by shape without
depending on color. Keep the design simple enough to read in a 48 x 48 pixel
transparent frame. No humanoid celebrity face, franchise robot imitation,
organic gore, decorative wings, giant weapons or background. Show one neutral
front-facing design first, with a clear firing direction and consistent scale.
```

After approval: “Using this exact Scout, make one **[idle / barrel-braced windup / recoil / disabled]** frame facing **[down / left / right / up]**, 48 × 48, stable center, transparent background. No projectile or warning line baked into the sprite.” Minimum runtime states are idle, windup and recoil; disabled can be a brief darkened base sprite. The warning lane remains engine geometry.

### MACH-02 — Rusher, charging threat

**Source:** G pp. 20–21; P pp. 10–12. **Style:** PIXEL. **Attach:** approved Scout, R-K-PIXEL. **Output:** `rusher-design.png`, then `rusher-{direction}-{state}.png`.

```text
Design an original charging Rusher from the same machine family as the approved
Scout. Proposed silhouette: broad low armored body, braced mechanical limbs,
heavy front profile and a visible joint that becomes exposed after a charge.
Make it visibly different from the narrow ranged Scout through shape, not just
color. Use the same worn-metal palette and pixel treatment. Target a transparent
96 x 96 pixel frame, with a body roughly one-and-a-half human sprite widths;
leave space for windup motion. No gun barrel, magical weak-point glow, spikes
obscuring its facing, blood, background, text or warning graphics. One neutral
design first, readable at actual gameplay size.
```

After approval: “Using this exact Rusher, create **[idle / compressed pre-charge windup / forward committed charge / off-balance recovery with exposed joint]**, facing **[down / left / right / up]**, same 96 × 96 transparent frame and stable body placement. Never change limb count or armor design.” These states explain a counter opening without creating a new superpower.

### MACH-03 — breach machine, illustration only

**Source:** P p. 6; original Script pp. 3–4. **Attach:** R-ISSHIN-BODY for the visible machine fragment; approved Scout/Rusher for family consistency if already made. **Output:** `breach-machine-design.png`.

```text
Develop an original intimidating retrieval-breach machine for WANT's story
illustrations. Use the attached machine fragment only as a material and shape
cue; do not pretend it reveals a complete design. A tall industrial skeletal
frame, claw-like gripping arm, articulated mechanical tendril and recessed
optics. Design it to fit through a dorm doorway and loom over K. Provide one
clear full-body three-quarter reference on a neutral background. No human
celebrity likeness or recognizable franchise design, no gore, no text, no extra
victims. Optics initially red; supply a matching purple-optic variant without
changing any structure. This is a scripted cutscene threat, not a new boss.
```

## 7. Props and state variants

**Sources:** P pp. 3–13; G p. 24. Use PIXEL for gameplay props. One object per generation is easier to inspect than a crowded pack. For cutscene close-ups, regenerate only the needed object with STILL and the approved pixel/design reference; preserve the same shape.

**Reusable prop prompt:**

```text
Create [OBJECT AND STATE] for WANT, using the attached [REFERENCE] for design
continuity and the approved environment for camera, scale and lighting. Target
[CANVAS] pixels, with real alpha transparency, no ground plane and no baked
shadow extending outside the object. Keep this one prop legible beside a 48-pixel
human sprite. No lettering, logos, UI, extra objects or decorative border.
For a state variant, preserve the original camera, footprint and alignment.
```

| ID / output stem | Object and state; suggested canvas | Attach / continuity |
| --- | --- | --- |
| PROP-01 `wallet` | Dropped plain student wallet, 48 × 48, object smaller than cell | R-K-BODY + ENV-01; new plain design |
| PROP-01 `phone` | Simple smartphone, dark screen and separately lit blank screen, 48 × 48 | ENV-01; one approved device reused for both calls |
| PROP-01 `bracelet` | Small dropped wrist accessory, 48 × 48; then illustration close-up | R-K-FACE wrist detail first; preserve its visible design, do not invent a gemstone or inscription. If detail is insufficient, approve a simple matching band before C01-B |
| PROP-02 `dorm-tv` | TV housing with blank screen, 96 × 96 | ENV-03; composite R-REPORTER later rather than asking the generator to redraw the broadcast |
| PROP-02 `dorm-fridge` | Compact fridge, closed/open states, 48 × 96 | ENV-03; same pivot/footprint |
| PROP-02 `dinner-tray` | Small meal and unbranded drink container, 48 × 48 | ENV-03; story flavor only, no healing symbol |
| PROP-02 `dorm-door-lamp` | Door lamp off/on, 48 × 48 | ENV-03; light can be engine overlay |
| PROP-03 `black-barrier` | Nearly featureless hollow black doorway overlay, 96 × 144 | Approved ENV-03 doorway; resize to actual opening during assembly |
| PROP-03 `breach-debris` | A few small non-graphic debris pieces, 96 × 96 | ENV-03 and MACH-03; story-only placement, not invisible new collisions |
| PROP-04 `clinic-iv` | IV stand and small suspended bag, 48 × 96 | ENV-04; no readable medical labels |
| PROP-04 `clinic-monitor` | Small examination result monitor with blank screen, 48 × 48 | ENV-04; add SERUM MATCH: NEGATIVE as live text |
| PROP-04 `camp-radio` | Worn portable radio with visible antenna, 48 × 48 | ENV-04; same family for shelter radio |
| PROP-04 `ration-crate` | Empty and sparsely filled crate states, 48 × 48 | ENV-05; no pickup sparkle |
| PROP-04 `noticeboard` | Worn board with blank paper pinned to it, 96 × 96 | ENV-05; add Lina's delivery note as text |
| PROP-04 `clinic-bedding` | Folded clean bedding and a few medical supplies, 48 × 48 each | ENV-04 ending variant; understated relief |
| PROP-05 `pistol` | Worn compact pistol, right-facing neutral reference, 48 × 48 | R-ISSHIN-BODY style cue; approved single design reused by K, no upgrades |
| PROP-05 `scrap-target` | Safe practice scrap plate and short stand, 48 × 96 | ENV-05; no enemy silhouette confused with live danger |
| PROP-05 `barricade` | Solid patched cover section, 96 × 48 | ENV-05/06; clearly solid base, consistent collision footprint |
| PROP-05 `delivery-cart` | Wheeled delivery cart, 96 × 96 | ENV-06; space for Lina's bag beneath it |
| PROP-05 `medicine-bag` | Lina's medical courier bag, trapped/loose/on-table placement variants, 48 × 48 | Approved LINA-01; identical bag through rescue and ending |
| PROP-05 `shelter-shutter` | Industrial shelter shutter, 144 × 144 | ENV-06; fixed cover frontage, no implied alternate mission |
| PROP-05 `service-gate` | Closed and fully open sliding gate, 144 × 144 | ENV-06; same frame/anchors, opening visible and unblocked in open state |
| PROP-05 `gate-switch` | Reachable wall switch with idle/active states, 48 × 48 | ENV-06; status also differs by lever position, not color alone |

Furniture, benches and walls already obtained as environment layers do not need to be regenerated. The extraction marker and interaction rings belong in UI-01, rather than being baked into scenery.

## 8. Cutscene stills and ending

Use STILL for every shot. Environment artboards are **layout references**, not a request to turn the cinematic into enlarged pixel art. If many characters cause identity blending, generate an empty background first, then add or composite one referenced character at a time. The durations describe the entire C01–C04 sequence, not each image.

### C01-A — seeing Sayu and Nero

**Source:** P p. 4; sequence total 12–18 seconds. **Attach:** R-K-BODY, R-SAYU, R-NERO, approved ENV-02. **Output:** `c01-courtyard-reveal.png`.

```text
Illustrate the approved faculty-library courtyard from near K's shoulder.
K occupies the left foreground, recognizing Sayu and Nero standing close together
in the middle distance. Preserve all three identities from the labeled images.
Their closeness makes the betrayal understandable without requiring an animated
kiss. K's posture tightens; Sayu and Nero are caught in a private moment.
Ordinary daylight, quiet emotional discomfort, no exaggerated villain expressions.
Keep the courtyard architecture consistent with the map. Do not add another K,
Hachimi, speech bubbles or text. Leave the lower caption area clear.
```

Hachimi remains in the dialogue/map beat, so the still does not require a fourth generated face.

### C01-B — bracelet falls

**Source:** P p. 4. **Attach:** approved PROP-01 bracelet, R-K-BODY, approved C01-A. **Output:** `c01-bracelet-fall.png`.

```text
Close-up of K's hand just releasing the approved bracelet above the same
courtyard paving as the attached scene. Keep the bracelet's exact shape and
material; K's sleeve matches his purple hoodie. A small gap between the accessory
and ground conveys the fall in one still. Partial shoes at the distant edge may
suggest the other people without introducing new faces. Restrained emotion,
not melodramatic sparkles. No inscription, text, magical light or broken jewelry
unless already present in the approved prop. Keep the object above caption space.
```

### C02-A — the hallway is gone

**Source:** P p. 6; C02 total 35–45 seconds. **Attach:** approved ENV-03 blackout, R-K-BODY, R-MAN1, R-MAN2. **Output:** `c02-barrier-arrival.png`.

```text
Inside the exact established dorm after a power failure, K has approached the
doorway, where a hollow black barrier replaces the hall. The two referenced
retrieval-team men have burst through and brace to fire back toward it. K is
confused and unprepared. Preserve room geometry and the three distinct identities.
Use cool dim ambient light with small readable highlights, not a bright portal.
Convey noise and urgency through posture. No firing UI, visible injuries,
extra soldiers, lettering or fabricated explosive effects.
```

### C02-B — mechanical threat and reaction

**Source:** P p. 6; original Script p. 3. **Attach:** C02-A, MACH-03, R-MAN1, R-MAN2, R-K-BODY. **Output:** `c02-machine-silhouette.png`.

```text
Continue the same dorm composition and lighting. A mechanical tendril catches
Man 1 and pulls his silhouette out of the frame; imply the violent event through
occlusion and K's shocked reaction, without visible wounds or dismemberment.
Man 2 has been thrown toward the far side of the room, partly obscured by existing
furniture. K cannot bring the handed weapon to bear. The approved machine emerges
from the black doorway. No added victims, gore, exposed anatomy or heroic attack
by K. Preserve identities and geography, and leave the caption area quiet.
```

### C02-C — scan mismatch

**Source:** P p. 6; original Script p. 3. **Attach:** MACH-03, R-K-FACE, R-K-BODY, C02-A. **Output:** `c02-scan-base.png`, `c02-optics-red.png`, `c02-optics-purple.png` if needed.

```text
Create the breach machine's scanning point of view looking at K as its claw-like
grip lifts him. Show K's recognizable face, frightened and struggling to breathe,
with his outfit unchanged and no graphic injury. Preserve the dorm behind him.
The machine's gripping arm may enter the frame to establish the viewpoint.
Keep clear negative space for a simple scan overlay that will be added later.
Do not draw any numbers, scan words, HUD, crosshairs or new story information.
```

Build **SCAN MISMATCH** and the scan framing as separate text/graphics. A brief insert or overlay shows **red optics first, purple second**; do not reverse the order or change the result to a match. The base POV image itself need not show the machine's eyes.

### C02-D — Mai carries K out

**Source:** P p. 6; original Script pp. 3–4. **Attach:** R-MAI-RESCUE, R-ISSHIN-BODY, MACH-03, C02-A. **Output:** `c02-retrieval.png`.

```text
Compose the rescue inside the established dorm. Use the supplied image of Mai
carrying K as the exact identity and carrying-pose reference: K is the injured
purple-hooded person; Mai is the rescuer carrying him. They move into the black
barrier. Isshin, with his supplied identity and long coat, covers their escape
beside the machine after placing a small explosive in its frame. Suggest an
impending blast with restrained light and smoke, not a graphic explosion or a
detailed device close-up. No duplicate K, extra rescuer, victory pose or gore.
Keep the doorway and room consistent and preserve readable silhouettes.
```

The explosive is a distant fictional scene prop; no construction detail is needed. A muffled sound and fade finish the sequence. Four panels suffice; video is optional and is not part of this asset requirement.

### C03 — the ruined city beyond the clinic

**Source:** P p. 7; total 10–15 seconds. **Attach:** approved ENV-04 and ENV-05; approved MACH-01/02 only if patrol silhouettes are included. **Output:** `c03-cebu-2085-skyline.png`.

```text
Create the view from WANT's clinic window over ruined Cebu in 2085. Broken
modern towers, patched low-rise shelters and small improvised warm lights show
a city where people still live among the damage. A very distant machine patrol
is suggested by a few small silhouettes, never a foreground boss. Cool haze,
quiet machinery implied, grounded post-conflict atmosphere. Frame one edge with
the established clinic window so the view belongs to that room. Keep useful
detail across a wide 16:9 composition for a gentle pan, while making the static
view complete and readable. No nuclear explosion, world map, readable billboards,
new city name, giant army, people in close-up or text.
```

No real landmark accuracy is claimed. If a recognizable landmark is later desired, supply a documented location reference before generating that variant.

### C04-A — K holds the opening

**Source:** P p. 12; C04 total 12–20 seconds. **Attach:** R-K-BODY, approved LINA-01, MACH-02, ENV-06. **Output:** `c04-k-protects-lina.png`.

```text
Create a grounded WANT rescue-payoff illustration on the approved service lane.
K stands between Lina and the remaining machine threat, using the existing cover
and his worn pistol. His expression shows fear managed through concentration,
not invincibility. Lina moves with purpose toward the established service gate,
holding her exact approved medicine bag. Use the approved Rusher only as the
threat in the background. No magical aura, new weapon, armor transformation,
extra army, romantic pose or rewritten rescue outcome. Keep all geography
consistent with the arena and leave caption space.
```

### C04-B — through the gate

**Source:** P p. 12. **Attach:** C04-A, R-MAI-FACE, R-ISSHIN-BODY, approved ENV-06. If needed, reattach LINA-01 and R-K-BODY in separate character passes. **Output:** `c04-extraction.png`.

```text
Continue the approved rescue sequence at the same service gate, now visibly
open. Lina has reached Mai on the safe side alive, carrying the same medicine
bag. K remains alive just behind them with the pistol safely lowered. Isshin
withdraws from his recognizable cover position. Show exhausted relief and a
small human success; the city beyond remains damaged. Preserve all four named
identities. No victory parade, fresh wounds, magical healing light, romantic
embrace, text or additional enemies attacking during the success moment.
```

Fallback: compose the existing/approved character images over ENV-06. C04 must accompany the successful extraction, not replace its gameplay or imply success before Lina reaches safety.

### END-01 — chapter-ending background, optional new illustration

**Source:** P p. 13. **Attach:** R-K-BODY, C03, approved ENV-05. **Output:** `chapter-one-ending-background.png`.

```text
Create a quiet final WANT illustration: K at the camp exit looking toward the
same damaged city, still in his ordinary purple hoodie and shoulder bag. His
stance is steadier, but he is no chosen hero and the war is not over. Small warm
camp lights contrast with the cool distance. Place K on the right third; leave
the left and lower regions calm enough for an ending title and closing sentence
to be added separately. No text, logos, heroic monument, new weapons, magical
effects or new locations. Preserve the approved skyline and camp materials.
```

Reuse C03 or camp scenery if time is short. Add these exact lines as live text:

> WANT — Chapter One: The Wrong Person
>
> You were not the person they came for. You were the person who stayed.

## 9. Effects, teaching diagrams and interface assets

### FX-01 — small reusable effect sprites

**Source:** G pp. 20–21; P pp. 11, 15. **Style:** PIXEL. **Attach:** approved K combat sprite and Scout/Rusher sprites for contrast. **Output:** one `fx-{effect}.png` per row.

```text
Create one small WANT effect: [EFFECT], with [FRAME PLAN]. Use crisp restrained
pixel shapes that remain visible over the approved dark arena. Real transparent
background, no text, decorative glow cloud or full-screen flash. Keep the active
shape compact so enemies and warning lanes stay visible. Consistent center and
frame size. It is a visual effect only, not an additional weapon or power.
```

| Effect | Frame plan / target |
| --- | --- |
| pistol muzzle flash | 2 frames, 48 × 48 each; local pale wedge, no blinding screen flash |
| ordinary bullet | 1 small bright dash in 16 × 16; leave clear space, rotate in engine |
| machine hit spark | 3 frames, 48 × 48 each; short metal spark that dissipates |
| stronger counter impact | 3 frames, 48 × 48 each; sharper geometric burst, same weapon language |
| dodge dust | 3 frames, 48 × 48 each; subtle trailing puffs, no teleport trail |
| disabled-machine smoke | 3 frames, 48 × 48 each; short quiet puff, no persistent visual obstruction |

Frames are proposals; playback timing and reduced-motion alternatives need integration. Plain engine shapes can replace this entire set for the minimum build.

### UI-01 — build exact, readable cues with shapes and text

**Source:** G pp. 20–21, 25; P pp. 11–14. **Generation route:** give this prompt to the UI/game developer or a vector-capable tool. Raster generation is unnecessary for these exact elements.

```text
Create a minimal WANT interface asset set using editable vector or engine-drawn
geometry and real text. Make: an interaction prompt frame; objective pointer;
mouse-aim reticle; Scout firing warning line; Rusher charging lane with repeated
chevrons; boundary spawn warning; perfect-dodge counter ring; gate-hold progress
ring; and a clearly distinct extraction marker. Use different shapes and labels
as well as color, with readable contrast on light and dark maps. Warning lanes
must be scalable geometry aligned to actual attacks, never painted scenery.
The counter ring accompanies COUNTER - CLICK. Gate interaction reads Hold E:
open gate; the shelter timer reads Gate release: 45 seconds and updates in code.
Use four health segments for Story Mode and two for Real Mode, with filled,
empty and focus states distinguishable without color. Add no XP, levels, mana,
civilian health meter, paid currency or horde-mode button. Provide static
reduced-motion variants and let all essential labels remain editable.
```

Also use real UI text for **SCAN MISMATCH**, **SERUM MATCH: NEGATIVE**, **Resolve restored**, **GAME OVER — K couldn't make it through**, pause, settings, Continue and credits. Existing K poster supplies title art. Buttons and settings controls need functional states, not separate AI-painted screens.

### UI-02 — counter teaching card

**Source:** P p. 11; G p. 20. **Attach:** approved K combat frame and Rusher recovery frame. **Preferred route:** compose approved sprites with editable arrows and text. **Output:** `counter-teaching-diagram` as editable composition.

```text
Compose a simple three-panel WANT teaching diagram using the attached approved
sprites without redrawing their identities. Panel 1: Rusher telegraphs a straight
charging lane. Panel 2: K narrowly dodges the committed attack. Panel 3: the
Rusher's exposed joint is visible and K has a brief opportunity to fire. Keep
the shapes uncluttered and distinct in grayscale. Add editable arrows and
separate editable captions: Watch the windup / Dodge the near hit / Click during
COUNTER. Use the existing movement, Space dodge and left-click fire controls.
Do not show healing, magic, a new weapon or a mandatory quick-time event.
```

The game adds **COUNTER UNLOCKED** and the approved explanation. A normal dodge before the shelter does not grant the counter; the illustration must not imply otherwise.

## 10. Audio generation prompts

**Sources:** P pp. 6, 15; G pp. 11, 24–25. Use an audio generator, not an image generator. These are original sound briefs; no supplied audio reference exists. Durations, tempo and instrumentation below are proposed starting points. Do not clone a real person's voice or a recognizable soundtrack. Voice acting is not required.

### SFX-01 — reusable sound-effect prompt

```text
Create one original sound effect for WANT: [DESCRIPTION]. Duration [DURATION].
Designed for a desktop story game, readable at modest listening volume, clean
onset, controlled transient, no clipping, no speech, no music and no long leading
silence. Keep room coloration minimal unless the description asks for ambience.
Deliver a clean 48 kHz WAV master. Do not combine unrelated effects into one file.
```

Run separately for each row:

| Filename stem | Description | Duration | On-screen equivalent when meaningful |
| --- | --- | --- | --- |
| `ui-confirm` | Soft short tactile tick | 0.1–0.2 s | Button state |
| `step-campus` | Single sneaker step on dry pavement; make 3 variations | 0.15–0.3 s | Walking sprite |
| `step-interior` | Single soft shoe step on hard indoor floor; 3 variations | 0.15–0.3 s | Walking sprite |
| `step-debris` | Single light gravel/ruin step; 3 variations | 0.15–0.35 s | Walking sprite |
| `phone-vibration` | Short restrained phone vibration against cloth | 0.5–0.8 s | Phone vibrates |
| `wallet-drop` | Small soft wallet hitting pavement | 0.2–0.4 s | Wallet marker |
| `bracelet-drop` | Tiny accessory contacting stone; material matches approved bracelet | 0.3–0.6 s | Bracelet falls |
| `power-cut-impact` | Abrupt dull doorway impact followed by electrical shutdown | 1–2 s | Loud impact; power fails |
| `machine-shriek` | Brief metallic servo strain, mechanical rather than animal | 0.7–1.2 s | Mechanical shriek beyond door |
| `pistol-shot` | Compact dry fictional pistol report, controlled peak | 0.2–0.4 s | Muzzle flash |
| `scout-windup` | Focused electronic charging tone with a clear start | about 0.8 s | Scout warning line |
| `rusher-windup` | Distinct bracing metal ratchet rising into tension | about 0.8 s | Rusher chevrons |
| `dodge` | Short clothing movement and restrained air swish | 0.15–0.25 s | Dodge pose |
| `counter-ready` | Brief clear high metallic tick, distinct from UI confirm | 0.1–0.2 s | COUNTER - CLICK |
| `counter-impact` | Sharper metallic crack layered with compact impact | 0.25–0.45 s | Counter impact shape |
| `k-hit` | Dull non-graphic impact, no scream or spoken voice | 0.2–0.4 s | Health loss and hurt shape/text |
| `machine-hit` | Small metal strike with short decay | 0.15–0.3 s | Spark |
| `machine-disabled` | Compact mechanical shutdown and falling small part | 0.5–0.9 s | Disabled state |
| `breach-blast` | Muffled distant fictional blast behind a barrier | 1–1.5 s | Muffled blast |
| `lane-crash` | Metal cart crash from a nearby street | 0.8–1.2 s | Crash from east lane; Help! as text |
| `radio-connect` | Brief radio static and connection click; no words | 0.3–0.5 s | Radio speaker label/dialogue |
| `gate-open` | Old service gate motor and sliding metal latch | 1–2 s | Gate visibly opens |
| `resolve-restored` | Quiet warm resolving two-note cue | 1–2 s | Resolve restored |
| `failure` | Restrained unresolved low tone with short decay | 1.5–2 s | GAME OVER |

Windup sound length must follow actual attack timing during integration; it must not promise a different attack time. Avoid sudden extreme loudness on the breach and pistol sounds. Human calls and cover orders can remain captioned dialogue; no voice asset is necessary.

### AMB-01 — ambient loops

```text
Create an original seamless 30-second ambient loop for [LOCATION] in WANT:
[SOUND PALETTE]. Very restrained under dialogue, no intelligible speech, no
melody, no startling foreground events, no combat warnings and no silence at
the loop seam. Stable perceived volume, clean WAV master, gentle stereo width.
```

| Output | Location and sound palette |
| --- | --- |
| `amb-campus` | Ordinary 2026 campus; distant traffic, light breeze, indistinct activity |
| `amb-dorm` | Quiet room at night; faint electrical hum and far city noise; stop the hum on power failure |
| `amb-clinic-camp` | Improvised 2085 clinic/camp; low ventilation, soft fabric, distant utility machinery |
| `amb-ruined-city` | Broken city and service lane; dry wind, distant non-threatening metal movement and far machine hum |

Use the same clinic/camp loop for the ending. Do not place attack-like warning tones in ambience; they would obscure the real combat cues.

### MUS-01 — compact original music set

```text
Compose an original instrumental game cue for WANT: [BRIEF]. Target [TEMPO]
BPM and a seamless 45–60-second loop. Restrained dynamics with room for dialogue,
windups and gunshots. A small palette of soft keyboard, muted synth texture,
subtle low pulse and light percussion as appropriate. No vocals, quoted melodies,
recognizable film/game theme or imitation of a named artist. Deliver a clean WAV
master; optional separate percussion stem only if supported. Do not add a long
intro or a dramatic ending that breaks the loop.
```

| Output | Brief | Tempo starting point |
| --- | --- | --- |
| `music-campus` | Ordinary day with a slight unsettled undertone; thin the music at the bracelet reveal | 76 |
| `music-future` | Sparse unease and loneliness for arrival, wrong-person reveal and settlement | 64 |
| `music-rescue` | Controlled urgency, vulnerable rather than triumphant, leaving space for short warning sounds | 104 |
| `music-ending` | Quiet earned relief using a small recurring motif; larger conflict remains unresolved | 72 |

Minimum fallback: two original loops (unease and rescue) plus a short resolve cue, using silence effectively for the breakup and identity reveal. Export and test loop joins; generator output is not automatically seamless. Record audio sources alongside images.

## 11. Production order and practical fallbacks

| Order | Work batch | Gate before moving on |
| --- | --- | --- |
| 1 | Inspect supplied references; K-01; LINA-01; Scout/Rusher designs | Identity, camera, palette and game-size silhouettes agreed |
| 2 | ENV-00 and ENV-01/02 | One playable campus slice assembled; no perspective or scale clash |
| 3 | ENV-03/04/05 and essential props | Normal/blackout dorm align; clinic/settlement share materials |
| 4 | ENV-06, K-02, Lina sprites, gate/cart/bag | Readable open arena and required state changes; no hidden cover mismatch |
| 5 | C01–C04 | Same cast and locations; correct scan and rescue sequence |
| 6 | FX/UI, audio, ending reuse | Readability muted and reduced-motion; loop and volume checks |

This is an asset production order, not a request to implement all game phases. Existing static portraits, simple props and vector effects are valid fallbacks. Do not add horde/XP art, extra bosses, new districts, alternate dead-Lina endings, mandatory video, a modeled laboratory or a full nuclear-war montage. Those assets are outside the first campaign.

## 12. Acceptance and handoff checklist

Before calling any output ready:

- Compare generated people with the current identity references in sections 3 and 13. Confirm K and Kingsley are visually distinct and that both characters in Mai's rescue reference have clearly separated limbs.
- Inspect pixel assets at 1× and 3× nearest-neighbor scale on both checkerboard and dark game backgrounds. Confirm true alpha, no pale fringe, consistent feet, no clipped bag/limbs and real direction coverage.
- Check tile edges and corners in repeated arrangements. Check map floor, obstacles, open/closed gates and collision data agree. Decorations must not hide bullets, warning lanes or actors.
- Keep cast, active enemies, objectives and warning effects out of map paintings. Leave illustration caption space clear. Ensure generated text has not crept into screens or scenery.
- Preserve story facts: negative serum, red-to-purple optics, no special genetics for K, counter as technique, Lina alive at success, ordinary clothes throughout. No glowing health pickups or automatic room-healing implications.
- Preview audio loops across the seam and compare effect volume. Test the game muted and with reduced motion; text and shapes must still communicate danger and success.
- Preserve masters, export smaller runtime derivatives, declare frame dimensions/order and update the runtime manifest during the relevant implementation task. Do not ship all source illustrations as the initial load.
- Record source/creator, generator/model and date, prompt ID, reference filenames, modifications, output path, permission/license status and attribution in the [asset ledger](docs/ASSET_CHECKLIST.md). Do not invent permission or mark unreviewed output approved.

Suggested per-asset handoff record:

```text
Asset ID and output file:
Status: Draft / Approved design / Runtime checked
Prompt ID and any edits:
Attached reference files:
Generator/model and creation date:
Source master and derived export paths:
Dimensions / frame order / pivot / transparency:
Used in scene or cutscene:
Rights / attribution / review status:
Checks actually performed:
Remaining fixes and next owner:
```

**Document verification:** source page references and local image paths were checked for the original pack. Section 13 records the separate character revision pass. Environment, cutscene, animation and audio prompts still require production and integration checks.

## 13. Character art revisions

**10 November 2026.** The directions below take precedence over the older reference gallery when an affected character appears in a new asset. Use the revised art where listed. Use the original files for alternate expressions, exact old layout or pose donors. Character IDs, story beats and the six-frame interaction order carry forward. Number poses left to right across the first row, then the second row.

**Downstream prompts.** For K-01, K-02, C01-A, C02-C/D, C04-A/B and END-01, attach revised K. In C01-B retain the existing red cord bracelet. In C02-D use the revised Mai/K rescue composition. For C02-B/C keep the established machine sequence and the separate scripted Man 2 handoff. For dorm dialogue and the TV broadcast use the revised girlfriend and reporter poses. For clinic conversation use the restrained Isshin portrait. For action, keep his original breach reference.

**Shared edit instruction.** Attach the original output type as the edit target and the named character or gesture donor separately. Preserve face identity, costume, handedness, crop and the existing clean ink and cel shading. For portraits and pixel art use true alpha. For persona posters match the original lettering, position, panel layout and graphics. Apply the same revision to visible figure and detail panels wherever the changed feature appears.

### ART-K — K's face and hair

```text
Make K read as a slightly older college student. Shorten and soften the pointed chin and keep his dark hair uneven, messy and spiky, with less fringe over the eyes. Keep the purple hoodie, tan crossbody bag and red cord bracelet. Match the revised full-body face across the speaking portrait, persona poster and new story illustrations.
```

[Full-body art](assets/characters/_revisions/k/k-full-body.png) · [Speaking portrait](assets/characters/_revisions/k/k-speaking-pose.png) · [Poster](assets/characters/_revisions/k/k-persona-poster.png)

### ART-GIRLFRIEND — relaxed speaking gesture

```text
Use pose 2 of the girlfriend's interaction sheet as the gesture reference. Keep the bag-strap hand by the shoulder. Lift the free hand to lower-chest height, elbow bent and relaxed palm facing up. Preserve the lilac jacket, high ponytail and friendly expression. Carry the gesture into the poster's detail panel.
```

[Speaking portrait](assets/characters/_revisions/kingsleys-girlfriend/kingsleys-girlfriend-speaking-pose.png) · [Poster](assets/characters/_revisions/kingsleys-girlfriend/kingsleys-girlfriend-persona-poster.png)

### ART-HACHIMI — concerned speaking portrait

```text
Use Hachimi's full-body face as the identity reference. Give her a concerned speaking expression with relaxed brows. Fold both forearms loosely as in pose 6, with the hands resting naturally. Keep her bob, mustard hoodie and purple bag. Show the folded arms and concerned look in the relevant poster panels.
```

[Speaking portrait](assets/characters/_revisions/hachimi/hachimi-speaking-pose.png) · [Poster](assets/characters/_revisions/hachimi/hachimi-persona-poster.png)

### ART-ISSHIN — clinic expression

```text
Ease the brow and part the lips slightly for a calm, stern clinic line. Keep the weathered face, jaw, coat and gloves. Retain the forceful breach pose in the action reference and poster. Use the restrained expression for the poster's quiet close-up.
```

[Speaking portrait](assets/characters/_revisions/isshin/isshin-speaking-pose.png) · [Poster](assets/characters/_revisions/isshin/isshin-persona-poster.png)

### ART-MAI — K's supported carry pose

```text
Use Mai's full-body rescue image as the base and revised K as his face reference. Rest K's head close to Mai's shoulder with eyes closed and arms draped naturally, one across each shoulder. Show Mai's gloved hands supporting his bent legs. Preserve Mai's stance, teal costume and pale straps. Repeat this carry in the poster and C02-D.
```

[Full-body art](assets/characters/_revisions/mai/mai-full-body.png) · [Poster](assets/characters/_revisions/mai/mai-persona-poster.png)

### ART-MAN1 — lowered gloved hand

```text
Use pose 2 of Man 1's interaction sheet. Move the speaking hand down toward the lower torso and turn the relaxed glove palm-up with slightly spread fingers. Preserve the urgent face, olive armor and yellow chest tab. Carry that hand into the matching poster detail.
```

[Speaking portrait](assets/characters/_revisions/man-1/man-1-speaking-pose.png) · [Poster](assets/characters/_revisions/man-1/man-1-persona-poster.png)

### ART-MAN2 — open-hand reference

```text
Use Man 2's speaking portrait for the empty raised palm, natural bent elbow and opposite hand on the vest strap. Replace the extended pistol arm in the full-body reference, poster and pose 3 of the six-pose sheet. Preserve goggles, cap, blue-gray costume, other pose slots and the sprite foot baseline. Stage the scripted pistol handoff separately in C02.
```

[Full-body art](assets/characters/_revisions/man-2/man-2-full-body.png) · [Poster](assets/characters/_revisions/man-2/man-2-persona-poster.png) · [Pose sheet](assets/characters/_revisions/man-2/man-2-interaction-poses.png) · [48 px atlas](assets/characters/_revisions/man-2/man-2-interaction-sprites-48px.png)

### ART-REPORTER — longer, gently curled hair

```text
Extend the reporter's dark hair to the shoulders, with a swept side part and loose curls at the ends. Keep the face, navy blazer, white shirt, note cards and existing hand positions. Repeat the hairstyle across the body art, speaking portrait, interaction poses and poster. Check that the hair reads inside the dorm TV crop.
```

[Full-body art](assets/characters/_revisions/news-reporter/news-reporter-full-body.png) · [Speaking portrait](assets/characters/_revisions/news-reporter/news-reporter-speaking-pose.png) · [Poster](assets/characters/_revisions/news-reporter/news-reporter-persona-poster.png) · [Pose sheet](assets/characters/_revisions/news-reporter/news-reporter-interaction-poses.png) · [48 px atlas](assets/characters/_revisions/news-reporter/news-reporter-interaction-sprites-48px.png)
