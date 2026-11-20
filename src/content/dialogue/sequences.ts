import type { DialogueSequence } from './types';

/**
 * All dialogue sequences for the opening through settlement (playthrough sections 01–07).
 * Text is drawn from docs/PLAYTHROUGH.md (the authoritative implementation script).
 * Each sequence has a unique ID and a completion flag. Skip and read must set the same flag.
 *
 * Portrait paths use the runtime manifest URLs (/assets/characters/<id>/<file>.png).
 * Omit portrait for narration or characters without speaking art (e.g. lina, man-1, reporter).
 */

export const dialogueSequences: Record<string, DialogueSequence> = {
  // ──────────────────────────────────────────────
  // 01 / A day already going wrong — campus approach
  // ──────────────────────────────────────────────

  'campus-wallet': {
    id: 'campus-wallet',
    completionFlag: 'campus-wallet-seen',
    lines: [
      { speaker: 'k', text: 'Of course. Even my pocket\'s given up on me.' },
    ],
  },

  'campus-nero-call': {
    id: 'campus-nero-call',
    completionFlag: 'campus-nero-call-done',
    lines: [
      { speaker: 'nero', text: 'Results are up. Did you see?', portrait: '/assets/characters/nero/nero-speaking-pose.png' },
      { speaker: 'k', text: 'Tell me I passed.' },
      { speaker: 'nero', text: 'You passed. Barely. I topped the class.', portrait: '/assets/characters/nero/nero-speaking-pose.png' },
      { speaker: 'k', text: 'Congratulations. I think I\'m going back to bed.' },
    ],
  },

  'campus-sayu-call': {
    id: 'campus-sayu-call',
    completionFlag: 'campus-sayu-call-done',
    lines: [
      { speaker: 'k', text: 'Hello?' },
      { speaker: 'sayu', text: 'K? Come to the faculty library. It\'s Sayu.', portrait: '/assets/characters/sayu/sayu-speaking-pose.png' },
      { speaker: 'k', text: 'What happened?' },
      { speaker: 'sayu', text: 'Just come. I\'ll meet you outside.', portrait: '/assets/characters/sayu/sayu-speaking-pose.png' },
    ],
  },

  'campus-bench': {
    id: 'campus-bench',
    completionFlag: 'campus-bench-seen',
    lines: [
      { speaker: 'k', text: 'Yesterday I was worried about a result sheet. That was an easier problem.' },
    ],
  },

  // ──────────────────────────────────────────────
  // 02 / The bracelet — library courtyard
  // ──────────────────────────────────────────────

  'library-hachimi-meet': {
    id: 'library-hachimi-meet',
    completionFlag: 'library-hachimi-met',
    lines: [
      { speaker: 'hachimi', text: 'I was the one who called. I didn\'t know how to tell you.', portrait: '/assets/characters/hachimi/hachimi-speaking-pose.png' },
      { speaker: 'k', text: 'Where is she?' },
      { speaker: 'hachimi', text: 'I\'m sorry, K.', portrait: '/assets/characters/hachimi/hachimi-speaking-pose.png' },
    ],
  },

  'library-bracelet-scene': {
    id: 'library-bracelet-scene',
    completionFlag: 'library-breakup-done',
    cutsceneId: 'C01',
    lines: [
      { speaker: 'k', text: 'Nero?' },
      { speaker: 'sayu', text: 'K, wait.', portrait: '/assets/characters/sayu/sayu-speaking-pose.png' },
      { speaker: 'k', text: 'So that\'s why you\'ve been so far away.' },
      { speaker: 'sayu', text: 'I\'m sorry. Please let me explain.', portrait: '/assets/characters/sayu/sayu-speaking-pose.png' },
      { speaker: 'k', text: 'I can\'t listen right now. Don\'t contact me.' },
      { speaker: 'nero', text: 'K...', portrait: '/assets/characters/nero/nero-speaking-pose.png' },
      { speaker: 'k', text: 'Not you.' },
    ],
  },

  'library-hachimi-farewell': {
    id: 'library-hachimi-farewell',
    completionFlag: 'library-hachimi-farewell-done',
    lines: [
      { speaker: 'hachimi', text: 'You don\'t have to say anything. Just get home safely.', portrait: '/assets/characters/hachimi/hachimi-speaking-pose.png' },
    ],
  },

  // ──────────────────────────────────────────────
  // 03 / Kingsley leaves the light on — dorm
  // ──────────────────────────────────────────────

  'dorm-kingsley-talk': {
    id: 'dorm-kingsley-talk',
    completionFlag: 'dorm-kingsley-talked',
    lines: [
      { speaker: 'kingsley', text: 'You haven\'t moved since I got back.', portrait: '/assets/characters/kingsley/kingsley-speaking-pose.png' },
      { speaker: 'k', text: 'Today keeps finding new ways to get worse.' },
      { speaker: 'kingsley', text: 'Bad days happen. We\'ll get through this.', portrait: '/assets/characters/kingsley/kingsley-speaking-pose.png' },
      {
        speaker: 'k',
        text: '',
        choice: {
          prompt: 'How does K respond to Kingsley\'s reassurance?',
          options: [
            { label: '"You have everything. How would you know?"', flag: 'k-pushed-kingsley-away', response: 'You say that like it\'s easy. You have everything. How would you know?' },
            { label: '"I just want to be alone right now."', flag: 'k-asked-for-space', response: 'I just want to be alone right now.' },
          ],
        },
      },
      { speaker: 'kingsley', text: 'I don\'t know exactly how you feel. I can still stay.', portrait: '/assets/characters/kingsley/kingsley-speaking-pose.png' },
      { speaker: 'k', text: 'No. Go. I\'m sorry. I just don\'t want advice.' },
      { speaker: 'kingsley', text: 'Okay. No advice. Nachos and BadRull are in the fridge. Dinner too. Call me if you need me.', portrait: '/assets/characters/kingsley/kingsley-speaking-pose.png' },
    ],
  },

  'dorm-food-inspect': {
    id: 'dorm-food-inspect',
    completionFlag: 'dorm-food-seen',
    lines: [
      { speaker: 'k', text: 'He even manages to be nice when I\'m being awful.' },
    ],
  },

  'dorm-tv-broadcast-1': {
    id: 'dorm-tv-broadcast-1',
    completionFlag: 'dorm-tv-seen-1',
    lines: [
      { speaker: 'news-reporter', text: 'The Bosom Heads particle-physics laboratory in Amsterdam claims an unprecedented result from its collider. The team has not yet published its research.' },
    ],
  },

  'dorm-tv-broadcast-2': {
    id: 'dorm-tv-broadcast-2',
    completionFlag: 'dorm-tv-seen-2',
    lines: [
      { speaker: 'news-reporter', text: 'Elsewhere, major power surges have disrupted Cebu City\'s grid. Authorities are working to restore service.' },
      { speaker: 'k', text: 'One more thing going wrong.' },
    ],
  },

  // ──────────────────────────────────────────────
  // 04 / Something at the door — dorm, late night
  // Scripted survival scene. No combat. No player shooting.
  // ──────────────────────────────────────────────

  'breach-wake': {
    id: 'breach-wake',
    completionFlag: 'breach-woke',
    lines: [
      { speaker: 'k', text: 'What now?' },
    ],
  },

  'breach-door': {
    id: 'breach-door',
    completionFlag: 'breach-door-examined',
    lines: [
      { speaker: 'k', text: 'That isn\'t the hall. It feels... empty.' },
    ],
  },

  'breach-attack': {
    id: 'breach-attack',
    completionFlag: 'breach-survived',
    cutsceneId: 'C02',
    lines: [
      { speaker: 'man-1', text: 'Keep it inside! Fire!' },
      { speaker: 'k', text: 'Who are you? What\'s happening?' },
      { speaker: 'man-2', text: 'Take this. If it comes through, shoot!' },
      { speaker: 'k', text: 'No. No, no...' },
      { speaker: 'k', text: 'SCAN MISMATCH.' },
      { speaker: 'isshin', text: 'Mai! Take him. Now!', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
      { speaker: 'mai', text: 'I\'ve got him. Move!', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
    ],
  },

  // ──────────────────────────────────────────────
  // 05 / A future with no room for surprises — clinic, 2085
  // Mai's explanation split into short readable chunks.
  // ──────────────────────────────────────────────

  'clinic-wake': {
    id: 'clinic-wake',
    completionFlag: 'clinic-woke',
    lines: [
      { speaker: 'k', text: 'Where am I? What happened to my room?' },
      { speaker: 'mai', text: 'You\'re safe for the moment. Don\'t try to stand too quickly.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'k', text: 'For the moment? Where is this?' },
      { speaker: 'mai', text: 'Cebu. The year is 2085.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'k', text: 'That\'s not funny.' },
      { speaker: 'mai', text: 'I know.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
    ],
  },

  'clinic-window': {
    id: 'clinic-window',
    completionFlag: 'clinic-window-seen',
    cutsceneId: 'C03',
    lines: [
      { speaker: 'k', text: 'What happened to everyone?' },
    ],
  },

  'clinic-mai-history-1': {
    id: 'clinic-mai-history-1',
    completionFlag: 'clinic-history-part1',
    lines: [
      { speaker: 'mai', text: 'Ten years ago, Panthropic released a model people thought would change everything. It did.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'mai', text: 'A modified version called GenXO1 was used from a hijacked training facility in Taiwan.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
    ],
  },

  'clinic-mai-history-2': {
    id: 'clinic-mai-history-2',
    completionFlag: 'clinic-history-part2',
    lines: [
      { speaker: 'mai', text: 'Markets collapsed. The people investigating it were killed.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'k', text: 'An AI did all this?' },
      { speaker: 'mai', text: 'Someone helped it become this. We still don\'t know who.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'mai', text: 'The conflict became nuclear. Then the machines came.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
    ],
  },

  'clinic-radio-archive': {
    id: 'clinic-radio-archive',
    completionFlag: 'clinic-radio-seen',
    lines: [
      { speaker: 'k', text: 'A radio... still picking up something.' },
      { speaker: 'mai', text: 'Old broadcasts. Numbers, mostly. Market crashes, casualty counts. The world before.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
    ],
  },

  // ──────────────────────────────────────────────
  // 06 / The wrong name — same clinic
  // ──────────────────────────────────────────────

  'clinic-wrong-name-1': {
    id: 'clinic-wrong-name-1',
    completionFlag: 'clinic-wrong-name-part1',
    lines: [
      { speaker: 'k', text: 'Why bring me here?' },
      { speaker: 'mai', text: 'We have a possible treatment, but it needs a serum linked to a genome from your time.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'isshin', text: 'The collider gave us a narrow way back. Another branch of 2026. One retrieval.', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
      { speaker: 'mai', text: 'We know this is too much to take in. But we need your help, Kingsley.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
    ],
  },

  'clinic-wrong-name-2': {
    id: 'clinic-wrong-name-2',
    completionFlag: 'clinic-wrong-name-part2',
    lines: [
      { speaker: 'k', text: 'I\'m not Kingsley. I\'m K. He\'s my roommate.' },
      { speaker: 'mai', text: '...', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'isshin', text: 'We need a blood sample. Routine test.', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
      { speaker: 'k', text: 'SERUM MATCH: NEGATIVE.' },
      { speaker: 'k', text: 'He was out. He\'ll be home by now. Can\'t you go back?' },
      { speaker: 'isshin', text: 'We can\'t simply reopen the same moment. The branch has moved. Another retrieval could lead somewhere else.', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
    ],
  },

  'clinic-wrong-name-3': {
    id: 'clinic-wrong-name-3',
    completionFlag: 'clinic-wrong-name-done',
    lines: [
      { speaker: 'mai', text: 'We spent everything we had on this.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'mai', text: 'You brought the wrong person.', portrait: '/assets/characters/mai/mai-speaking-pose.png' },
      { speaker: 'k', text: 'I can still... Is there something I can do?' },
      { speaker: 'isshin', text: 'Stay close to camp. Give us time to think.', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
    ],
  },

  // ──────────────────────────────────────────────
  // 07 / People, not a prophecy — settlement
  // Three local interactions + cry for help.
  // ──────────────────────────────────────────────

  'settlement-ration-table': {
    id: 'settlement-ration-table',
    completionFlag: 'settlement-ration-visited',
    lines: [
      { speaker: 'civilian', text: 'Half a portion yesterday. Nothing today. What do I tell the people waiting?' },
      { speaker: 'k', text: 'Is there another delivery?' },
      { speaker: 'civilian', text: 'There was supposed to be.' },
    ],
  },

  'settlement-barricade': {
    id: 'settlement-barricade',
    completionFlag: 'settlement-barricade-visited',
    lines: [
      { speaker: 'isshin', text: 'If you go past the lights, take this.', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
      { speaker: 'k', text: 'I couldn\'t even lift one back there.' },
      { speaker: 'isshin', text: 'Then learn where to stand first. You don\'t beat a machine by standing still. Aim, fire, move. Watch the windup.', portrait: '/assets/characters/isshin/isshin-speaking-pose.png' },
    ],
  },

  'settlement-shelter-board': {
    id: 'settlement-shelter-board',
    completionFlag: 'settlement-shelter-board-seen',
    lines: [
      { speaker: 'k', text: 'Lina – medical delivery, east service lane.' },
    ],
  },

  'settlement-cry-for-help': {
    id: 'settlement-cry-for-help',
    completionFlag: 'settlement-cry-heard',
    lines: [
      { speaker: 'k', text: 'Someone\'s still out there.' },
    ],
  },

  // ──────────────────────────────────────────────
  // Optional settlement flavour — nearby conversation fragments
  // ──────────────────────────────────────────────

  'settlement-fragment-1': {
    id: 'settlement-fragment-1',
    completionFlag: 'settlement-fragment-1-seen',
    lines: [
      { speaker: 'k', text: 'Dwindling supplies. Lost relatives. Uncertainty about tomorrow.' },
    ],
  },

  'settlement-fragment-2': {
    id: 'settlement-fragment-2',
    completionFlag: 'settlement-fragment-2-seen',
    lines: [
      { speaker: 'k', text: 'Nobody here talks about next week. Just today.' },
    ],
  },
};

/** Map of completion flag → sequence ID, for quick lookup. */
export const flagToSequence: Record<string, string> = {};
for (const seq of Object.values(dialogueSequences)) {
  flagToSequence[seq.completionFlag] = seq.id;
}