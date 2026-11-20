export const characters = [
  { id: 'k', name: 'K', role: 'Playable protagonist' },
  { id: 'kingsley', name: 'Kingsley', role: 'K’s roommate; intended retrieval target' },
  { id: 'hachimi', name: 'Hachimi', role: 'Campus witness' },
  { id: 'sayu', name: 'Sayu', role: 'K’s girlfriend at the opening' },
  { id: 'nero', name: 'Nero', role: 'K’s classmate' },
  { id: 'isshin', name: 'Isshin', role: 'Resistance fighter' },
  { id: 'mai', name: 'Mai', role: 'Resistance rescuer' },
  { id: 'man-1', name: 'Man 1', role: 'Retrieval team' },
  { id: 'man-2', name: 'Man 2', role: 'Retrieval team' },
  { id: 'news-reporter', name: 'News Reporter', role: 'Television broadcast' },
  { id: 'kingsleys-girlfriend', name: 'Kingsley’s girlfriend', role: 'Brief dorm scene' },
  { id: 'lina', name: 'Lina', role: 'Local civilian rescued by K; new art required' },
] as const;

export type CharacterId = typeof characters[number]['id'];
