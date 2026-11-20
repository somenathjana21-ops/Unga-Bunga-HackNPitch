import type { GameMap } from './types';

/** 02 / Library courtyard — Hachimi, Sayu and Nero, the bracelet scene. */
export const libraryMap: GameMap = {
  id: 'library',
  name: 'Library courtyard',
  grid: [
    '################',
    '################',
    '################',
    '###########...##',
    '#..............#',
    '#..............D',
    '#D.............#',
    '#..............#',
    '################',
  ],
  spawn: { x: 2, y: 5 },
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
      position: { x: 9, y: 5 },
      dialogueId: 'library-bracelet-scene',
      requiresFlag: 'library-hachimi-met',
      excludesFlag: 'library-breakup-done',
    },
  ],
  doors: [
    {
      position: { x: 1, y: 6 },
      targetMap: 'campus',
      targetSpawn: { x: 13, y: 3 },
      label: 'Campus',
      objective: 'Reach the faculty library.',
    },
    {
      position: { x: 15, y: 5 },
      targetMap: 'dorm',
      targetSpawn: { x: 11, y: 6 },
      label: 'Home',
      requiresFlag: 'library-breakup-done',
      objective: 'Go home.',
    },
  ],
  backgroundImageId: 'twilight-library-courtyard-encounter',
};