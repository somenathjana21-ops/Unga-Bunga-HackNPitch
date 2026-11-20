import type { GameMap } from './types';

/** 01 / Campus approach — quiet campus street, 2026. */
export const campusMap: GameMap = {
  id: 'campus',
  name: 'Campus approach',
  grid: [
    '################',
    '################',
    '#############D##',
    '###########...##',
    '#...............',
    '#..............#',
    '#..............#',
    '#..............#',
    '################',
  ],
  spawn: { x: 2, y: 6 },
  objective: 'Reach the faculty library.',
  npcs: [],
  interactables: [
    {
      id: 'wallet',
      position: { x: 4, y: 4 },
      dialogueId: 'campus-wallet',
      prompt: 'Pick up wallet',
      spriteId: 'pixel-art-leather-wallet-icon',
      excludesFlag: 'campus-wallet-seen',
    },
    {
      id: 'bench',
      position: { x: 6, y: 3 },
      dialogueId: 'campus-bench',
      prompt: 'Sit on bench',
      excludesFlag: 'campus-bench-seen',
    },
  ],
  triggers: [
    {
      id: 'nero-call',
      position: { x: 4, y: 6 },
      dialogueId: 'campus-nero-call',
      excludesFlag: 'campus-nero-call-done',
    },
    {
      id: 'sayu-call',
      position: { x: 8, y: 5 },
      dialogueId: 'campus-sayu-call',
      excludesFlag: 'campus-sayu-call-done',
    },
  ],
  doors: [
    {
      position: { x: 13, y: 2 },
      targetMap: 'library',
      targetSpawn: { x: 2, y: 5 },
      label: 'Library',
      objective: 'Find Hachimi outside the library.',
    },
  ],
  backgroundImageId: 'campus-library-approach',
};