export const TILE_SIZE = 48;
export const previewRoom = [
  '################',
  '#..............#',
  '#..##..........#',
  '#..##.....##...#',
  '#.........##...#',
  '#..............#',
  '#......##......#',
  '#..............#',
  '################',
] as const;

export function canEnter(x: number, y: number): boolean {
  return previewRoom[y]?.[x] === '.';
}
