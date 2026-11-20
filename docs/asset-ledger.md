# WANT — Asset Ledger

**Owner:** Group B (creatives). **Gate:** no ledger entry, no merge.

Every asset used by the game must appear in this table with its source URL and
license. Group A refuses to wire in unledgered files. Keep the file path exactly
as delivered so `src/systems/asset-manifest.js` can resolve it.

| Asset ID | File path | Type | Source / URL | License | Used in (beat/scene) | Status | Date added | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

## Column guide

- **Asset ID** — the ID used in code, e.g. `characters.k.sprites`. Must match
  the manifest. IDs are `dot.case`.
- **File path** — path relative to `assets/`, e.g.
  `characters/k/k-interaction-sprites-48px.png`.
- **Type** — image, audio, tileset, illustration, vfx, font, etc.
- **Source / URL** — direct link to the asset page or pack, not a search result.
- **License** — exact license name (CC0, CC BY 4.0, Pixabay License, …).
  Attribution-required assets need the credit text in **Notes**.
- **Used in** — chapter/beat/scene, e.g. `C01`, `alley fight`, `HUD`.
- **Status** — `planned`, `delivered`, `integrated`, `retired`.
- **Date added** — ISO date.
- **Notes** — author, attribution string, edits made, replacement history.

## How to add an asset

1. Confirm the destination path with the manifest (`planned` entries reserve
   paths). If the path must change, update the manifest first.
2. Add the row above **before** merging the file.
3. Put the file in `assets/<category>/…` with the exact name in the row.
4. Run `npm run check`; boot must stay clean and no new asset requests may fire
   at boot.
5. If replacing a file, keep the same path, update the row, and note the old
   source in **Notes**.

## Provisional material

The existing character art under `assets/<character>/` predates this scaffold.
It is **not yet ledgered**. Group B must verify its source and license, move it
into `assets/characters/<character>/` (or record a different agreed path), and
add rows here before any scene references it. Until then, Group A treats it as
reference material only.

## Attribution block

If any delivered asset requires attribution, the exact credit text goes here as
well as in the row's **Notes**.

_TBD — no attribution-required assets integrated yet._
