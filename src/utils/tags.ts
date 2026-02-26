export const CATEGORY_FILTERS = [
  { label: 'All', id: 'all' },
  { label: 'Stories', id: 'lbl-reader' },
  { label: 'Books', id: 'book' },
  { label: 'Worksheets', id: 'worksheet' },
  { label: 'Games', id: 'grammar-game' },
  { label: 'Speaking', id: 'speaking' },
  { label: 'Listening', id: 'listening' },
  { label: 'Pronunciation', id: 'pronunciation' },
];

export const LANGUAGES = [
  { code: 'english', label: 'English' },
  { code: 'french', label: 'French' },
  { code: 'german', label: 'German' },
  { code: 'spanish', label: 'Spanish' }
];

export const getLevelFromTags = (tags: any[]) => {
  if (!tags) return null;
  const match = tags.find((t: any) => /A1|A2|B1|B2/.test(t.name.toUpperCase()));
  if (!match) return null;
  const name = match.name.toUpperCase();
  if (name.includes('A1')) return 'a1';
  if (name.includes('A2')) return 'a2';
  if (name.includes('B1')) return 'b1';
  if (name.includes('B2')) return 'b2';
  return null;
};
