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
