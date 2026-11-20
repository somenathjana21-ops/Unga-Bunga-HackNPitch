import type { GameMap } from './types';

/** 02 / Library courtyard — Hachimi, Sayu and Nero, the bracelet scene. */
export const libraryMap: GameMap = {
  id: 'library',
  name: 'Library courtyard',
  grid: [
    '################',
    '#..............#',
    '#..............#',
    '#..............#',
    'D..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '################',
  ],
  spawn: { x: 2, y: 6 },
  objective: 'Find Hachimi outside the library.',
  npcs: [
    {
      id: 'hachimi-meet',
      characterId: 'hachimi',
      position: { x: 6, y: 5 },
      dialogueId: 'library-hachimi-meet',
      excludesFlag: 'library-hachimi-met',
    },
    {
      id: 'hachimi-farewell',
      characterId: 'hachimi',
      position: { x: 6, y: 5 },
      dialogueId: 'library-hachimi-farewell',
      requiresFlag: 'library-breakup-done',
      excludesFlag: 'library-hachimi-farewell-done',
    },
  ],
  interactables: [],
  triggers: [
    {
      id: 'bracelet-scene',
      position: { x: 8, y: 4 },
      dialogueId: 'library-bracelet-scene',
      requiresFlag: 'library-hachimi-met',
      excludesFlag: 'library-breakup-done',
    },
  ],
  doors: [
    {
      position: { x: 0, y: 4 },
      targetMap: 'campus',
      targetSpawn: { x: 14, y: 4 },
      objective: 'Reach the faculty library.',
    },
    {
      position: { x: 15, y: 4 },
      targetMap: 'dorm',
      targetSpawn: { x: 2, y: 6 },
      requiresFlag: 'library-breakup-done',
      objective: 'Go home.',
    },
  ],
};