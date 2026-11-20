export const checkpoints = [
  'campus', 'dorm', 'camp', 'rescue-start', 'girl-safe', 'ending',
] as const;
export type Checkpoint = typeof checkpoints[number];

export const milestones = ['girl-rescued', 'resistance-covered'] as const;
export type Milestone = typeof milestones[number];

// This is the implementation itinerary, not a claim that these scenes are playable yet.
export const campaign = [
  { id: 'campus', minutes: 4, objective: 'Reach the faculty library.', status: 'planned' },
  { id: 'dorm', minutes: 2, objective: 'Return home and try to rest.', status: 'planned' },
  { id: 'breach', minutes: 2, objective: 'Survive the arrival of the machine.', status: 'planned' },
  { id: 'camp', minutes: 4, objective: 'Learn why the resistance brought you here.', status: 'planned' },
  { id: 'settlement', minutes: 3, objective: 'Explore and follow the call for help.', status: 'planned' },
  { id: 'rescue', minutes: 6, objective: 'Reach Lina and open the extraction route.', status: 'planned' },
  { id: 'ending', minutes: 2, objective: 'Return to the resistance with Lina.', status: 'planned' },
] as const;
