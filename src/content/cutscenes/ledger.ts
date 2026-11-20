// Phase 4 cutscene ledger - data for every cutscene in docs/PLAYTHROUGH.md
// section 13. Shots are still images, captions, optional restrained pan/zoom,
// and audio cues. Nothing here touches campaign state; completion flags are
// wired by the phase that owns each story beat (Phase 2 breakup flag, Phase 5
// girl-rescued milestone). Skip and normal completion apply the same story
// state exactly once - that guarantee is enforced by the player, not the ledger.
//
// Image kinds:
//   'portrait'   - a supplied speaking portrait of a character. Labelled as a
//                  character portrait, never presented as an environment.
//   'environment' - an environment composition. Now using generated assets.
//   'card'       - a labelled text card describing the moment. Safe fallback
//                   whenever the required art is missing.
//
// Every image reference below uses an ID already declared in
// assets/runtime-manifest.json (speaking portraits). New environment images
// are also declared in the manifest.

export interface CutscenePan {
  from: { scale: number; x: number; y: number };
  to: { scale: number; x: number; y: number };
  durationMs: number;
}

export interface CutsceneShot {
  id: string;
  kind: 'portrait' | 'environment' | 'card';
  imageId: string | null;
  // Optional supplied video. When present, the player attempts to play it and
  // falls back to a still/text card on load or play rejection.
  video?: string;
  caption: string;
  // Optional restrained camera move. Ignored under reduced motion.
  pan?: CutscenePan;
  // Sound cues played when the shot becomes visible.
  audio?: string[];
  // Milliseconds before auto-advancing. null = wait for the player.
  advanceAfterMs?: number;
}

export interface Cutscene {
  id: string;
  title: string;
  // Story flag/set applied on completion. Resolved by the owning phase.
  storyFlag?: string;
  shots: CutsceneShot[];
}

export const cutscenes: Record<string, Cutscene> = {
  c01: {
    id: 'c01',
    title: 'The bracelet',
    storyFlag: 'breakup',
    shots: [
      {
        id: 'c01-a',
        kind: 'environment',
        imageId: 'c01-courtyard-reveal',
        caption: 'K sees Sayu and Nero together in the library courtyard.',
        audio: ['phone-end'],
      },
      {
        id: 'c01-b',
        kind: 'portrait',
        imageId: 'sayu-speaking-pose',
        caption: "Sayu: 'I'm sorry. Please let me explain.'",
        pan: {
          from: { scale: 1, x: 0, y: 0 },
          to: { scale: 1.06, x: 0.02, y: -0.02 },
          durationMs: 900,
        },
      },
      {
        id: 'c01-c',
        kind: 'portrait',
        imageId: 'nero-speaking-pose',
        caption: 'Nero: "K..."',
        pan: {
          from: { scale: 1, x: 0, y: 0 },
          to: { scale: 1.04, x: -0.02, y: 0.02 },
          durationMs: 900,
        },
      },
      {
        id: 'c01-d',
        kind: 'environment',
        imageId: 'c01-bracelet-fall',
        caption: 'K removes his bracelet. It falls between them.',
        audio: ['metal-drop'],
        advanceAfterMs: 1400,
      },
      {
        id: 'c01-e',
        kind: 'card',
        imageId: null,
        caption: 'K: "I can\'t listen right now. Don\'t contact me."',
        audio: ['ui-confirm'],
      },
    ],
  },

  c02: {
    id: 'c02',
    title: 'Breach and retrieval',
    storyFlag: 'breach-rescued',
    shots: [
      {
        id: 'c02-a',
        kind: 'environment',
        imageId: 'c02-barrier-arrival',
        caption: 'A hollow black barrier fills the dorm hallway. Power fails.',
        audio: ['power-cut'],
      },
      {
        id: 'c02-b',
        kind: 'environment',
        imageId: 'c02-machine-silhouette',
        caption: 'Mechanical shrieks. Man 1 and Man 2 fire into the barrier.',
        audio: ['machine-shriek', 'gunshot'],
      },
      {
        id: 'c02-c',
        kind: 'portrait',
        imageId: 'man-1-speaking-pose',
        caption: 'Man 1: "Keep it inside! Fire!"',
      },
      {
        id: 'c02-d',
        kind: 'portrait',
        imageId: 'man-2-speaking-pose',
        caption: 'Man 2: "Take this. If it comes through, shoot!"',
      },
      {
        id: 'c02-e',
        kind: 'environment',
        imageId: 'c02-scan-base',
        caption: 'A mechanical limb pulls Man 1 out of frame. Man 2 is thrown across the room.',
        audio: ['muffled-blast'],
        advanceAfterMs: 1200,
      },
      {
        id: 'c02-f',
        kind: 'environment',
        imageId: 'c02-retrieval',
        caption: "Isshin wedges an explosive into the machine's frame. Mai carries K through the barrier.",
        audio: ['muffled-blast'],
        pan: {
          from: { scale: 1, x: 0, y: 0 },
          to: { scale: 1.05, x: 0.03, y: 0 },
          durationMs: 1000,
        },
      },
    ],
  },

  c03: {
    id: 'c03',
    title: 'The ruined skyline',
    storyFlag: 'clinic-arrival',
    shots: [
      {
        id: 'c03-a',
        kind: 'environment',
        imageId: 'c03-cebu-skyline',
        caption: 'Broken towers, makeshift lights, and a machine patrol beyond the clinic window.',
        audio: ['machinery', 'wind'],
      },
      {
        id: 'c03-b',
        kind: 'portrait',
        imageId: 'mai-speaking-pose',
        caption: 'Mai: "Cebu. The year is 2085."',
        pan: {
          from: { scale: 1, x: 0, y: 0 },
          to: { scale: 1.03, x: 0, y: 0.02 },
          durationMs: 1100,
        },
      },
    ],
  },

  c04: {
    id: 'c04',
    title: 'Rescue payoff',
    storyFlag: 'girl-rescued',
    shots: [
      {
        id: 'c04-a',
        kind: 'environment',
        imageId: 'c04-k-protects-lina',
        caption: 'K stands between Lina and the approaching machines at the service gate.',
        audio: ['gunshot'],
      },
      {
        id: 'c04-b',
        kind: 'portrait',
        imageId: 'mai-speaking-pose',
        caption: "Mai: 'I've got her. Isshin, fall back!'",
      },
      {
        id: 'c04-c',
        kind: 'environment',
        imageId: 'c04-extraction',
        caption: 'Lina reaches Mai alive. K is alive. Resolve restored.',
        audio: ['resolve'],
        advanceAfterMs: 1600,
      },
    ],
  },
};

export function cutscene(id: string): Cutscene | undefined {
  return cutscenes[id];
}

export function cutsceneIds(): string[] {
  return Object.keys(cutscenes);
}
