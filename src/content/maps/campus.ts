export const TILE_SIZE = 48;

export type Tile = '.' | '#';

export type MapObjectType = 'npc' | 'interactable' | 'door';

export interface MapObject {
  id: string;
  type: MapObjectType;
  x: number; // tile column
  y: number; // tile row
  name?: string; // shown in the E prompt
  targetRoom?: string; // door target room id
  spawnX?: number; // door spawn tile in target room
  spawnY?: number; // door spawn tile in target room
  facing?: 'up' | 'down' | 'left' | 'right'; // npc facing direction
  dialogueId?: string; // dialogue to open when interacted with
}

export interface MapRoom {
  id: string;
  width: number;
  height: number;
  tiles: Tile[][];
  objects: MapObject[];
  spawnX: number;
  spawnY: number;
}

function grid(rows: string[]): Tile[][] {
  return rows.map((row) => row.split('') as Tile[]);
}

export const campus: MapRoom = {
  id: 'campus',
  width: 16,
  height: 9,
  tiles: grid([
    '################',
    '#..............#',
    '#.##......##...#',
    '#.#....#..#....#',
    '#.#....#.......#',
    '#....#....##...#',
    '#......#.......#',
    '#.##......#....#',
    '################',
  ]),
  objects: [
    {
      id: 'hachimi',
      type: 'npc',
      x: 14,
      y: 4,
      name: 'Hachimi',
      facing: 'left',
      dialogueId: 'hachimi-greeting',
    },
    {
      id: 'wallet',
      type: 'interactable',
      x: 14,
      y: 6,
      name: 'Wallet',
    },
    {
      id: 'library-door',
      type: 'door',
      x: 8,
      y: 7,
      name: 'Library door',
      targetRoom: 'library',
      spawnX: 2,
      spawnY: 5,
    },
  ],
  spawnX: 2,
  spawnY: 5,
};

export const library: MapRoom = {
  id: 'library',
  width: 16,
  height: 9,
  tiles: grid([
    '################',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '################',
  ]),
  objects: [
    {
      id: 'campus-door',
      type: 'door',
      x: 8,
      y: 7,
      name: 'Campus door',
      targetRoom: 'campus',
      spawnX: 8,
      spawnY: 6,
    },
  ],
  spawnX: 2,
  spawnY: 5,
};

export const rooms: Record<string, MapRoom> = {
  campus,
  library,
};

export function getRoom(id: string): MapRoom {
  const room = rooms[id];
  if (!room) throw new Error(`Unknown map room: ${id}`);
  return room;
}

export function canEnter(room: MapRoom, x: number, y: number): boolean {
  if (y < 0 || y >= room.height || x < 0 || x >= room.width) return false;
  return room.tiles[y][x] === '.';
}
