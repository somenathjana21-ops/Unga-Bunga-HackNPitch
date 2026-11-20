import type { GameMap } from './types';
import { campusMap } from './campus';
import { libraryMap } from './library';
import { dormMap } from './dorm';
import { clinicMap } from './clinic';
import { settlementMap } from './settlement';

export const maps: Record<string, GameMap> = {
  campus: campusMap,
  library: libraryMap,
  dorm: dormMap,
  clinic: clinicMap,
  settlement: settlementMap,
};

export const TILE_SIZE = 48;

export function getMap(id: string): GameMap {
  const map = maps[id];
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}

export function canWalkTo(map: GameMap, x: number, y: number): boolean {
  return map.grid[y]?.[x] === '.' || map.grid[y]?.[x] === 'D';
}

export function isWall(map: GameMap, x: number, y: number): boolean {
  return map.grid[y]?.[x] === '#';
}