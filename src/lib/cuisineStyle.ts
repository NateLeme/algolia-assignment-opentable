// Visual identity per cuisine, used on cards and the discovery hero.
// The data has no usable photos (Client Q2), so a cuisine icon + color stands in for
// one. It describes the cuisine, not the restaurant, so nothing is invented.

const ICONS: Record<string, string> = {
  'American': '🍔', 'Italian': '🍝', 'Steakhouse': '🥩', 'Seafood': '🦞', 'French': '🥐',
  'Japanese': '🍣', 'Mexican': '🌮', 'Tex-Mex': '🌮', 'Californian': '🥑', 'Mediterranean': '🫒',
  'Pan-Asian': '🥢', 'Southern': '🍗', 'Indian': '🍛', 'International': '🌍', 'Southwestern': '🌶️',
  'Spanish': '🥘', 'Gastropub': '🍺', 'Brewery': '🍺', 'Wine Bar': '🍷', 'Bar & Lounge': '🍸',
  'Latin American': '🫔', 'Cajun & Creole': '🦐', 'European': '🍷', 'Continental': '🍽️',
  'Tapas & Small Plates': '🍢', 'Greek': '🥙', 'Hawaiian': '🌺', 'Brazilian': '🍖', 'Barbecue': '🍖',
  'Pacific Northwest': '🐟', 'Fusion': '✨', 'Fondue': '🫕', 'Thai': '🍜', 'Vietnamese': '🍜',
  'Chinese': '🥟', 'Korean': '🍲', 'Farm-to-Table': '🥕', 'Afternoon Tea': '🫖',
  'Vegetarian': '🥗', 'Vegan': '🥗', 'Peruvian': '🐟', 'Caribbean': '🥥', 'Cuban': '🥪',
  'Turkish': '🥙', 'Middle Eastern': '🧆', 'Lebanese': '🧆', 'Persian': '🧆', 'Moroccan': '🧆',
  'German': '🥨', 'Irish': '☘️', 'British': '🫖', 'Belgian': '🍟', 'Swiss': '🧀',
};

export const cuisineIcon = (cuisine: string | undefined) => (cuisine && ICONS[cuisine]) || '🍽️';

/** Stable, distinct soft gradient per cuisine (hue derived from the name). */
export function cuisineGradient(cuisine: string | undefined) {
  const name = cuisine ?? '';
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${hash} 80% 88%), hsl(${(hash + 35) % 360} 75% 76%))`;
}

/** Quick picks on the discovery hero: real values of the `cuisines` facet. */
export const HERO_CUISINES = ['Italian', 'Steakhouse', 'Japanese', 'Mexican', 'Seafood', 'French', 'Indian', 'Barbecue'];

// Representative cuisine photos (Unsplash License: free to use, no attribution required),
// stored in public/cuisines at card size. NOT the restaurants' own photos: the export's
// image URLs are dead (Client Q2). With OpenTable's photo feed these become real photos.
const PHOTO_SETS: Record<string, string[]> = {
  italian: ['italian-1', 'italian-2', 'italian-3', 'italian-4'],
  american: ['american-1', 'american-2', 'american-3', 'american-4'],
  steakhouse: ['steakhouse-1', 'steakhouse-2', 'steakhouse-3', 'steakhouse-4'],
  seafood: ['seafood-1', 'seafood-2', 'seafood-3', 'seafood-4'],
  french: ['french-1', 'french-2', 'french-3', 'french-4'],
  japanese: ['japanese-1', 'japanese-2', 'japanese-3', 'japanese-4'],
  mexican: ['mexican-1', 'mexican-2', 'mexican-3', 'mexican-4'],
  californian: ['californian-1', 'californian-2'],
  mediterranean: ['mediterranean-1', 'mediterranean-2'],
  panAsian: ['pan-asian-1', 'pan-asian-2'],
  indian: ['indian-1'],
  southern: ['southern-1'],
  spanish: ['spanish-1'],
  thai: ['thai-1'],
  chinese: ['chinese-1'],
  barbecue: ['barbecue-1'],
  gastropub: ['gastropub-1'],
  hawaiian: ['hawaiian-1'],
  fondue: ['fondue-1'],
  generic: ['generic-1', 'generic-2'],
};

// Cuisine (facet value) → photo set. Related cuisines share the closest set.
const PHOTO_FOR_CUISINE: Record<string, keyof typeof PHOTO_SETS> = {
  'Italian': 'italian', 'American': 'american', 'Burgers': 'american', 'Steakhouse': 'steakhouse',
  'Brazilian': 'steakhouse', 'Argentinian': 'steakhouse', 'Seafood': 'seafood', 'Pacific Northwest': 'seafood',
  'French': 'french', 'Continental': 'french', 'European': 'french', 'Belgian': 'french',
  'Japanese': 'japanese', 'Mexican': 'mexican', 'Tex-Mex': 'mexican', 'Southwestern': 'mexican',
  'Latin American': 'mexican', 'Californian': 'californian', 'Farm-to-Table': 'californian',
  'Vegetarian': 'californian', 'Vegan': 'californian', 'Mediterranean': 'mediterranean', 'Greek': 'mediterranean',
  'Turkish': 'mediterranean', 'Middle Eastern': 'mediterranean', 'Lebanese': 'mediterranean', 'Persian': 'mediterranean',
  'Moroccan': 'mediterranean', 'Pan-Asian': 'panAsian', 'Korean': 'panAsian', 'Vietnamese': 'thai',
  'Indian': 'indian', 'Southern': 'southern', 'Cajun & Creole': 'southern', 'Spanish': 'spanish',
  'Tapas & Small Plates': 'spanish', 'Portuguese': 'spanish', 'Thai': 'thai', 'Chinese': 'chinese',
  'Barbecue': 'barbecue', 'Gastropub': 'gastropub', 'Brewery': 'gastropub', 'Irish': 'gastropub',
  'British': 'gastropub', 'German': 'gastropub', 'Hawaiian': 'hawaiian', 'Fondue': 'fondue', 'Swiss': 'fondue',
};

/**
 * Photo for a card. With a list position, consecutive cards of the same cuisine
 * rotate through the set (no identical neighbours); otherwise varied per restaurant.
 * These are representative images, so a restaurant's photo may differ between lists.
 */
export function cuisinePhoto(cuisine: string | undefined, objectID: string, position?: number) {
  const set = PHOTO_SETS[(cuisine && PHOTO_FOR_CUISINE[cuisine]) || 'generic'];
  let hash = 0;
  for (const ch of objectID) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `/cuisines/${set[(position ?? hash) % set.length]}.jpg`;
}
