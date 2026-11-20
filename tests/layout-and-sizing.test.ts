import { describe, expect, it } from 'vitest';
import { maps, canWalkTo } from '../src/content/maps';
import { SPRITE_DISPLAY, directionFrame4Dir } from '../src/game/sprite-metrics';

const NEIGHBORS = [
  { dx: 0, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

describe('map landmark alignment and reachability', () => {
  it('every map has a 16x9 grid, walkable spawn, door tiles marked D, and reachable interactables/NPCs', () => {
    for (const map of Object.values(maps)) {
      expect(map.grid.length, `${map.id} rows`).toBe(9);
      for (const row of map.grid) {
        expect(row.length, `${map.id} row width`).toBe(16);
      }

      expect(canWalkTo(map, map.spawn.x, map.spawn.y), `${map.id} spawn walkable`).toBe(true);

      for (const door of map.doors) {
        expect(map.grid[door.position.y]?.[door.position.x], `${map.id} door tile ${door.targetMap}`).toBe('D');
        expect(canWalkTo(map, door.position.x, door.position.y), `${map.id} door walkable`).toBe(true);
      }

      for (const item of map.interactables) {
        const reachable = NEIGHBORS.some(({ dx, dy }) =>
          canWalkTo(map, item.position.x + dx, item.position.y + dy),
        );
        expect(reachable, `${map.id} interactable ${item.id} reachable`).toBe(true);
      }

      for (const npc of map.npcs) {
        const reachable = NEIGHBORS.some(({ dx, dy }) =>
          canWalkTo(map, npc.position.x + dx, npc.position.y + dy),
        );
        expect(reachable, `${map.id} npc ${npc.id} reachable`).toBe(true);
      }
    }
  });

  it('aligns key doors and prop markers with their painted background landmarks', () => {
    // Campus: bench on the wooden bench, wallet with prop sprite, door on library entrance steps
    expect(maps.campus.interactables.find(i => i.id === 'bench')?.position).toEqual({ x: 6, y: 3 });
    expect(maps.campus.interactables.find(i => i.id === 'wallet')?.spriteId).toBe('pixel-art-leather-wallet-icon');
    expect(maps.campus.doors.find(d => d.targetMap === 'library')?.position).toEqual({ x: 13, y: 2 });

    // Dorm: fridge on far-left, TV at bottom-center, K's blue bed top-left, door in bottom-right alcove
    expect(maps.dorm.interactables.find(i => i.id === 'food')?.position).toEqual({ x: 1, y: 5 });
    expect(maps.dorm.interactables.find(i => i.id === 'tv-1')?.position).toEqual({ x: 7, y: 7 });
    expect(maps.dorm.interactables.find(i => i.id === 'bed')?.position).toEqual({ x: 4, y: 3 });
    expect(maps.dorm.doors.find(d => d.targetMap === 'library')?.position).toEqual({ x: 13, y: 7 });

    // Clinic: window & radio under top-center window, exit door on right doorway mat
    expect(maps.clinic.interactables.find(i => i.id === 'window')?.position).toEqual({ x: 8, y: 2 });
    expect(maps.clinic.interactables.find(i => i.id === 'radio')?.position).toEqual({ x: 7, y: 2 });
    expect(maps.clinic.doors.find(d => d.targetMap === 'settlement')?.position).toEqual({ x: 14, y: 4 });

    // Settlement: clinic return door under medical cross, ration civilian uses civilian sprite, east gate at (15,4)
    expect(maps.settlement.doors.find(d => d.targetMap === 'clinic')?.position).toEqual({ x: 3, y: 4 });
    expect(maps.settlement.npcs.find(n => n.id === 'ration-civilian')?.characterId).toBe('civilian');
    expect(maps.settlement.interactables.find(i => i.id === 'shelter-board')?.position).toEqual({ x: 7, y: 2 });
    expect(maps.settlement.doors.find(d => d.targetMap === 'rescue')?.position).toEqual({ x: 15, y: 4 });
  });
});

describe('character sprite sizing and directional facing', () => {
  it('keeps character sprites large and readable across world, combat, and rescue scenes', () => {
    expect(SPRITE_DISPLAY.worldCharacter).toBeGreaterThanOrEqual(60);
    expect(SPRITE_DISPLAY.worldNpcPulseScale).toBeGreaterThan(SPRITE_DISPLAY.worldCharacterScale);
    expect(SPRITE_DISPLAY.combatPlayer).toBeGreaterThanOrEqual(50);
    expect(SPRITE_DISPLAY.combatScout).toBeGreaterThanOrEqual(50);
    expect(SPRITE_DISPLAY.combatRusher).toBeGreaterThanOrEqual(54);
    expect(SPRITE_DISPLAY.rescueLina).toBeGreaterThanOrEqual(48);
    expect(SPRITE_DISPLAY.rescueMai).toBeGreaterThanOrEqual(50);
    expect(SPRITE_DISPLAY.rescueIsshin).toBeGreaterThanOrEqual(52);
  });

  it('maps unit aim vectors to the 4-directional enemy sheet frames', () => {
    expect(directionFrame4Dir(0, 1)).toBe(0);  // down
    expect(directionFrame4Dir(-1, 0)).toBe(1); // left
    expect(directionFrame4Dir(1, 0)).toBe(2);  // right
    expect(directionFrame4Dir(0, -1)).toBe(3); // up
  });
});
