import type { CutscenePlaceholder } from './types';

/**
 * Cutscene IDs for Phase 4. These are placeholders now; the visual sequences (still images,
 * captions, optional pan/zoom) are implemented in Phase 4.
 * Skip must apply the same story flags as normal completion.
 */
export const cutscenePlaceholders: CutscenePlaceholder[] = [
  {
    id: 'C01',
    moment: 'Library and bracelet',
    requiredVisual: 'Courtyard composition; bracelet close-up',
    caption: 'K removes his bracelet. It falls between them.',
  },
  {
    id: 'C02',
    moment: 'Breach and retrieval',
    requiredVisual: 'Barrier, machine silhouette, K scan, Mai/Isshin rescue',
    caption: 'A muffled blast ends the scene.',
  },
  {
    id: 'C03',
    moment: '2085 skyline',
    requiredVisual: 'Ruined city view beyond clinic',
    caption: 'Broken towers, makeshift lights, a machine patrol in the distance.',
  },
  {
    id: 'C04',
    moment: 'Rescue payoff (Phase 5)',
    requiredVisual: 'K shielding Lina; service gate extraction',
    caption: 'The first emotional payoff, not the end of all conflict.',
  },
];