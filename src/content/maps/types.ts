import type { CharacterId } from '../characters';

/** A tile in the map grid: '#' = wall, '.' = floor, 'D' = door/transition. */
export type Tile = '#' | '.' | 'D';

/** A position on the map. */
export interface MapPosition {
  x: number;
  y: number;
}

/** An NPC placed on the map. Talking to them triggers a dialogue sequence. */
export interface MapNpc {
  id: string;
  characterId: CharacterId;
  position: MapPosition;
  /** Dialogue sequence ID to trigger when the player interacts. */
  dialogueId: string;
  /** Optional: only interactable if this flag is set. */
  requiresFlag?: string;
  /** Optional: only interactable if this flag is NOT set. */
  excludesFlag?: string;
}

/** An interactable object (bench, TV, bed, etc.). */
export interface MapInteractable {
  id: string;
  position: MapPosition;
  /** Dialogue sequence ID to trigger. */
  dialogueId: string;
  /** Label shown in the interaction prompt. */
  prompt: string;
  /** Optional prop image asset ID to render at this interactable tile. */
  spriteId?: string;
  /** Optional: only interactable if this flag is set. */
  requiresFlag?: string;
  /** Optional: only interactable if this flag is NOT set. */
  excludesFlag?: string;
}

/** A door/transition to another map. */
export interface MapDoor {
  position: MapPosition;
  targetMap: string;
  targetSpawn: MapPosition;
  /** Short world label displayed at the unlocked doorway. */
  label?: string;
  /** Optional: only usable if this flag is set. */
  requiresFlag?: string;
  /** Optional: only usable if this flag is NOT set. */
  excludesFlag?: string;
  /** Optional: objective text shown when entering this map. */
  objective?: string;
}

/** An automatic trigger that fires when the player steps on a tile (once per playthrough). */
export interface MapTrigger {
  id: string;
  position: MapPosition;
  /** Dialogue sequence ID to trigger. */
  dialogueId: string;
  /** Optional: only fires if this flag is NOT set. */
  excludesFlag?: string;
  /** Optional: only fires if this flag IS set. */
  requiresFlag?: string;
}

/** A complete map definition. */
export interface GameMap {
  id: string;
  name: string;
  grid: readonly string[];
  spawn: MapPosition;
  npcs: MapNpc[];
  interactables: MapInteractable[];
  triggers: MapTrigger[];
  doors: MapDoor[];
  /** Objective text shown when the player is on this map. */
  objective: string;
  /** Optional full-map backdrop image (asset ID from runtime-manifest.json). */
  backgroundImageId?: string;
}