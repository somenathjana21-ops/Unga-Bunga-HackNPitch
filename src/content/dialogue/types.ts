import type { CharacterId } from '../characters';

/** A single line of dialogue. Speaker ID maps to characters.ts. Portrait is optional; omit for narration or when no art exists. */
export interface DialogueLine {
  speaker: CharacterId;
  text: string;
  /** Runtime URL to a speaking portrait, or undefined for no portrait (narration, unknown speakers). */
  portrait?: string;
  /** Optional choice presented before this line. Player picks one; the chosen text becomes K's spoken line. */
  choice?: DialogueChoice;
}

/** A player choice. Selecting an option sets a flag and may change K's response, but never branches the main story. */
export interface DialogueChoice {
  prompt: string;
  options: DialogueChoiceOption[];
}

export interface DialogueChoiceOption {
  /** Text shown on the choice button. */
  label: string;
  /** Flag set when this option is chosen (for optional flavour tracking). */
  flag?: string;
  /** The line K speaks after choosing. Replaces the default text on this DialogueLine. */
  response: string;
}

/** A named sequence of dialogue lines. completionFlag is set when the sequence finishes (read or skipped). */
export interface DialogueSequence {
  id: string;
  /** Lines in order. */
  lines: DialogueLine[];
  /** Story flag set when this sequence completes (read or skipped). */
  completionFlag: string;
  /** Optional objective text to show when this sequence is active. */
  objective?: string;
  /** Optional cutscene ID (C01-C04) to trigger before or after this sequence. */
  cutsceneId?: string;
}

/** A cutscene placeholder for Phase 4. The ID and description are used now; the visual sequence comes later. */
export interface CutscenePlaceholder {
  id: string;
  moment: string;
  requiredVisual: string;
  caption?: string;
}