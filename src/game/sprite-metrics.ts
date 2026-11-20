/**
 * Shared visual display dimensions for character and enemy sprites across scenes.
 * Visual sprite sizes are intentionally decoupled from gameplay collision radii
 * so characters stay readable and proportionate to room doors and furniture
 * without inflating combat hurtboxes.
 */
export const SPRITE_DISPLAY = {
  /** World exploration sprites (K and NPCs) on the 768x432 (16x9 @ 48px) grid. */
  worldCharacter: 64,
  /** Base scale factor for 48px world sprites to reach worldCharacter height. */
  worldCharacterScale: 64 / 48,
  /** Subtle pulse peak scale for talkable quest NPCs. */
  worldNpcPulseScale: 67 / 48,
  /** Preview room character size. */
  previewCharacter: 60,
  /** Combat & rescue arena character sizes (decoupled from collision radius). */
  combatPlayer: 54,
  combatScout: 54,
  combatRusher: 60,
  rescueLina: 50,
  rescueMai: 54,
  rescueIsshin: 56,
} as const;

/**
 * Selects the 4-directional sprite frame (0=down, 1=left, 2=right, 3=up)
 * from a unit direction vector for Scout and Rusher sheets.
 */
export function directionFrame4Dir(dx: number, dy: number): number {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? 1 : 2;
  }
  return dy < 0 ? 3 : 0;
}
