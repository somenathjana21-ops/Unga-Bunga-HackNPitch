# Asset audit and production checklist

## Found in the supplied folder

55 PNGs across 11 characters, approximately 95.94 MiB total. Each character has full-body art, interaction poses, a 144x96 sprite sheet, a persona poster and a speaking pose. `assets/inventory.json` records all source paths, dimensions and byte sizes.

Characters: K, Kingsley, Hachimi, Sayu, Nero, Mai, Isshin, Man 1, Man 2, News Reporter, Kingsley's girlfriend. Lina is new and has no supplied art. The script also names supporting roles without matching folders; use offscreen text/static environmental treatment where the playthrough specifies it.

Each 48px sheet is **3 columns x 2 rows = 6 interaction poses**. Inspection of K's sheet confirms these are not up/down/left/right walk cycles. The foundation uses the first frame as a static moving placeholder; do not fabricate an animation sequence by cycling unrelated emotions.

## Character production audit, 10 November 2026

Reviewed all 11 source sets across full-body art, dialogue portraits, large pose sheets, 48px exports and posters. Pose numbers run left to right across the top row, then left to right across the bottom row. Use the [character revision instructions](../WANT-Asset-Generation-Prompts.md#13-character-art-revisions) to choose references for new work.

| Character | Use and production gate |
| --- | --- |
| K | Keep the purple hoodie, satchel and bracelet as identity anchors. Carry the shorter, softer chin and messy dark hair into dialogue, promo art and new C01/C02/C04 illustrations. A real four-direction walk cycle and combat poses are still needed. |
| Kingsley | Green overshirt and cream polo distinguish him from K in the mistaken-identity sequence. Existing dialogue and static dorm poses are suitable as references. |
| Kingsley's girlfriend | Keep the lilac jacket, high ponytail and bag. Use pose 2 for dialogue, with the strap hand up and the free palm lifted in an easy conversational gesture. |
| Hachimi | The mustard hoodie and bob read well at small size. Default dialogue should look concerned, with the full-body face and the folded arms of pose 6. Reserve sharper gestures for specific beats. |
| Sayu | Burgundy cardigan and longer dark hair read clearly against the other campus characters. Keep the pleading portrait and reaching pose for the courtyard. |
| Nero | Blue shirt and folio distinguish him from Kingsley and K. Keep his folio and profile in the courtyard composition. |
| Mai | Preserve teal and pale straps. The full-body image is a two-character rescue composition. Confirm K's limbs read as supported and belong to him. Use Mai's separate portrait or solo interaction pose as a solo reference. |
| Isshin | Keep the intense breach illustration and action pose. Use restrained, stern delivery for the default clinic portrait, so the breach expression remains meaningful. Use a solo pose if a machine-free gameplay reference is needed. |
| Man 1 | The close-cropped head, ochre marker and olive armor read separately from Man 2. Match the speaking hand to pose 2, with a lowered, gloved palm-up gesture. |
| Man 2 | Keep the goggles and blue-gray jacket. Use the open palm from the speaking portrait in the body reference, poster and revised pose 3. Keep the scripted handoff as its own C02 story beat. |
| News reporter | Keep the navy blazer, white shirt and cards. The new silhouette has shoulder-length dark hair with soft curls. Check the portrait inside the dorm TV frame before export. |

The supplied portraits have alpha and are 1024 × 1536. The 11 supplied small sheets contain 66 nonempty, transparent 48 × 48 frames. All 66 original frames share the same bottom edge at row 44, using zero-based pixel coordinates and an alpha threshold of 128. Check revised frames against that baseline, then inspect them at 1× and 3× on dark and checkerboard backgrounds. Review posters at menu size for readable names, intact panels and matching character details.

The audit covers static art and interaction frames. Final game approval still depends on genuine movement/combat sprites, Lina's missing art, in-scene crop and performance checks, and permission/credit confirmation. The later scene owner should load the selected portrait per scene and keep posters and full-body masters out of dialogue preloads.

Source images remain unchanged. The runtime manifest selects 19 files: 11 small interaction sheets, seven speaking portraits, and K's poster. Six sources point to revisions: K's title poster, the K/Hachimi/Isshin portraits, and the Man 2/reporter atlases. The girlfriend, Man 1 and reporter speaking portraits are available for future scene integration. `npm run assets:prepare` copies the selected files to the ignored `public/assets/` directory under their existing game paths. `npm run assets:check` checks files, PNG headers, dimensions, unique IDs and safe paths.

## Required before final campaign art pass

| Asset | Minimum useful delivery | Owner | Priority |
| --- | --- | --- | --- |
| K walking | Four directions, consistent feet/pivot; a short walk loop per direction | D | Critical |
| K combat | Reuse consistent base pose plus aim/dodge/counter effects; custom frames only if ready | D/B | Critical |
| Lina | 48px idle/walk and one speaking portrait, matching palette | D | Critical |
| Machines | One Scout and one Rusher silhouette, windup/readability differences | D/B | Critical |
| World tiles | Shared floor/wall/road/ruin set at a declared tile size | D/A | Critical |
| Rooms/maps | Campus/library, dorm, clinic/camp, alley/gate; reuse camp for ending | A/D | Critical |
| Props | Bracelet, TV, barrier, cover, cart, medicine bag, gate switch, extraction marker | D | Required, simple shapes acceptable |
| Cutscene stills | Library, breach, ruined skyline, rescue; reuse compositions where sensible | D | Required presentation, quantity reducible |
| Audio | UI, steps, phone, pistol, windup, dodge, counter, hit, gate, victory/failure; ambient/music loops | D/C | Required |
| Video | Only if already ready and compressible; still fallback required | D | Optional |

## Delivery specification

- Declare frame dimensions and order in the manifest; one consistent foot anchor and transparent background. Maintain character silhouette at actual game size.
- Use descriptive lowercase kebab-case names. Never overwrite a source sheet to fit a loader; create a derived file and record its source.
- Preview sprite atlases on a checkerboard and on the dark game background. Check halos, clipping, inconsistent feet, frame bleed and direction coverage.
- For maps, use one chosen grid size consistently and separate collision data from decoration. The foundation proof uses 48px tiles; the team may choose a different world tile size once, updating the contract and maps together.
- For new illustrations, use a landscape composition suitable for the game viewport with space for captions. Do not hide essential faces behind the dialogue panel.
- Audio should have consistent perceived volume; use short local effects and compact loops. Never assume autoplay will work.
- Optimize derived runtime portraits/stills in Phase 4. Keep source PNGs; load only what the current scene needs. The supplied artwork total is not an acceptable initial network payload.

## Source/credits ledger

Record a row for every new pack, track, generated image or external asset. Existing assets are creator-supplied but their usage rights still need confirmation; do not invent a license.

| Asset/group | Source or creator | License/permission | Attribution text | Review status |
| --- | --- | --- | --- | --- |
| Supplied 55 character PNGs | Project creator supplied files | Confirm with creator | To be confirmed | Needs confirmation |
| 22 character revisions, 10 November 2026 | OpenAI image generation using the supplied art, with two 48 px atlas exports assembled from edited pose art | Confirm rights to the source art and event use | Pending confirmation | Visual and format checks complete. Scene-specific checks pending. [Prompt IDs and art files](../WANT-Asset-Generation-Prompts.md#13-character-art-revisions) |
| New Lina art | Not created yet | Record when created | Record when created | Missing |
| Environment/machine art | Not selected yet | Record exact pack/source | As required | Missing |
| Cutscene audio cues (UI confirm, phone end, metal drop, power cut, machine shriek, gunshot, muffled blast, wind, machinery, gate open, resolve) | Synthesized at runtime in `src/services/audio.ts` (no external files) | WANT code, no third-party samples | WANT | Implemented; volumes persisted via `src/services/preferences.ts` |
| Cutscene stills/portraits used (C01-C04) | Existing supplied speaking portraits: sayu, nero, man-1, man-2, mai | Confirm with creator (supplied 55 PNGs) | To be confirmed | Environment shots use labelled text cards; no supplied environment art exists yet |
| Sound/music (future packs) | Not selected yet | Record exact files/source | As required | Missing |

Check the hackathon's rules on generated assets and prebuilt materials with the organizer. Keep the credits ledger in the repository so every teammate uses the same approved pool.
