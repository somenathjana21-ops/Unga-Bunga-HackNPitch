import type { GameMap } from './types';

/** 07 / Settlement — three local interactions, then the cry for help. */
export const settlementMap: GameMap = {
  id: 'settlement',
  name: 'Settlement',
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
  objective: 'Explore the settlement.',
  npcs: [
    {
      id: 'ration-civilian',
      characterId: 'k',
      position: { x: 4, y: 3 },
      dialogueId: 'settlement-ration-table',
      excludesFlag: 'settlement-ration-visited',
    },
    {
      id: 'isshin-barricade',
      characterId: 'isshin',
      position: { x: 9, y: 4 },
      dialogueId: 'settlement-barricade',
      excludesFlag: 'settlement-barricade-visited',
    },
  ],
  interactables: [
    {
      id: 'shelter-board',
      position: { x: 6, y: 2 },
      dialogueId: 'settlement-shelter-board',
      prompt: 'Read the shelter board',
      excludesFlag: 'settlement-shelter-board-seen',
    },
    {
      id: 'fragment-1',
      position: { x: 12, y: 3 },
      dialogueId: 'settlement-fragment-1',
      prompt: 'Listen',
      excludesFlag: 'settlement-fragment-1-seen',
    },
    {
      id: 'fragment-2',
      position: { x: 12, y: 6 },
      dialogueId: 'settlement-fragment-2',
      prompt: 'Listen',
      excludesFlag: 'settlement-fragment-2-seen',
    },
  ],
  triggers: [
    {
      id: 'cry-for-help',
      position: { x: 14, y: 4 },
      dialogueId: 'settlement-cry-for-help',
      requiresFlag: 'settlement-barricade-visited',
      excludesFlag: 'settlement-cry-heard',
    },
  ],
  doors: [
    {
      position: { x: 0, y: 7 },
      targetMap: 'clinic',
      targetSpawn: { x: 14, y: 4 },
      objective: 'Speak to Mai.',
    },
  ],
  backgroundImageId: 'post-apocalyptic-courtyard-camp',
};