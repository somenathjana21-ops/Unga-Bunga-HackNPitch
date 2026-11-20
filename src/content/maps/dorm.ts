import type { GameMap } from './types';

/** 03–04 / Dorm room — Kingsley, TV broadcast, bed, then the scripted breach. */
export const dormMap: GameMap = {
  id: 'dorm',
  name: 'Dorm room',
  grid: [
    '################',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    'D..............#',
    '################',
  ],
  spawn: { x: 2, y: 6 },
  objective: 'Talk to Kingsley, inspect the television, then go to bed.',
  npcs: [
    {
      id: 'kingsley-talk',
      characterId: 'kingsley',
      position: { x: 7, y: 4 },
      dialogueId: 'dorm-kingsley-talk',
      excludesFlag: 'dorm-kingsley-talked',
    },
  ],
  interactables: [
    {
      id: 'tv-1',
      position: { x: 11, y: 2 },
      dialogueId: 'dorm-tv-broadcast-1',
      prompt: 'Watch TV',
      excludesFlag: 'dorm-tv-seen-1',
    },
    {
      id: 'tv-2',
      position: { x: 11, y: 2 },
      dialogueId: 'dorm-tv-broadcast-2',
      prompt: 'Watch TV',
      requiresFlag: 'dorm-tv-seen-1',
      excludesFlag: 'dorm-tv-seen-2',
    },
    {
      id: 'food',
      position: { x: 13, y: 5 },
      dialogueId: 'dorm-food-inspect',
      prompt: 'Check the fridge',
      requiresFlag: 'dorm-kingsley-talked',
      excludesFlag: 'dorm-food-seen',
    },
    {
      id: 'bed',
      position: { x: 3, y: 2 },
      dialogueId: 'breach-wake',
      prompt: 'Go to sleep',
      requiresFlag: 'dorm-tv-seen-2',
      excludesFlag: 'breach-woke',
    },
  ],
  triggers: [
    {
      id: 'breach-door-trigger',
      position: { x: 7, y: 7 },
      dialogueId: 'breach-door',
      requiresFlag: 'breach-woke',
      excludesFlag: 'breach-door-examined',
    },
    {
      id: 'breach-door-exit-trigger',
      position: { x: 0, y: 7 },
      dialogueId: 'breach-door',
      requiresFlag: 'breach-woke',
      excludesFlag: 'breach-door-examined',
    },
    {
      id: 'breach-attack-trigger',
      position: { x: 7, y: 7 },
      dialogueId: 'breach-attack',
      requiresFlag: 'breach-door-examined',
      excludesFlag: 'breach-survived',
    },
    {
      id: 'breach-attack-exit-trigger',
      position: { x: 0, y: 7 },
      dialogueId: 'breach-attack',
      requiresFlag: 'breach-door-examined',
      excludesFlag: 'breach-survived',
    },
  ],
  doors: [
    {
      position: { x: 0, y: 7 },
      targetMap: 'library',
      targetSpawn: { x: 14, y: 4 },
      excludesFlag: 'breach-woke',
      objective: 'Find Hachimi outside the library.',
    },
  ],
  backgroundImageId: 'dorm-room-shared',
};