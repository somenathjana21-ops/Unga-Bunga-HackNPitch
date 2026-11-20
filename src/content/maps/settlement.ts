import type { GameMap } from './types';

/** 07 / Settlement — three local interactions, then the cry for help. */
export const settlementMap: GameMap = {
  id: 'settlement',
  name: 'Settlement',
  grid: [
    '################',
    '################',
    '################',
    '####...........#',
    '###D...........D',
    '#..............#',
    '#..............#',
    '################',
    '################',
  ],
  spawn: { x: 3, y: 5 },
  objective: 'Explore the settlement.',
  npcs: [
    {
      id: 'ration-civilian',
      characterId: 'civilian',
      position: { x: 6, y: 5 },
      dialogueId: 'settlement-ration-table',
      excludesFlag: 'settlement-ration-visited',
    },
    {
      id: 'isshin-barricade',
      characterId: 'isshin',
      position: { x: 11, y: 4 },
      dialogueId: 'settlement-barricade',
      excludesFlag: 'settlement-barricade-visited',
    },
  ],
  interactables: [
    {
      id: 'shelter-board',
      position: { x: 7, y: 2 },
      dialogueId: 'settlement-shelter-board',
      prompt: 'Read the shelter board',
      excludesFlag: 'settlement-shelter-board-seen',
    },
    {
      id: 'fragment-1',
      position: { x: 5, y: 3 },
      dialogueId: 'settlement-fragment-1',
      prompt: 'Inspect supplies',
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
      position: { x: 3, y: 4 },
      targetMap: 'clinic',
      targetSpawn: { x: 13, y: 4 },
      label: 'Clinic',
      objective: 'Speak to Mai.',
    },
    {
      position: { x: 15, y: 4 },
      targetMap: 'rescue',
      targetSpawn: { x: 0, y: 0 },
      label: 'East Gate',
      requiresFlag: 'settlement-cry-heard',
      objective: 'Head into the east service lane.',
    },
  ],
  backgroundImageId: 'post-apocalyptic-courtyard-camp',
};