// Cuisine normalisation: maps OpenTable's raw `food_type` (114 values) to a clean model.
//
//  - cuisines: what kind of food. Main filter. Array, so compound values
//              ("Creole / Cajun / Southern") match every cuisine they mention.
//  - region:   parent group for each cuisine, for browsing ("Asian" → Thai, Japanese…).
//  - tags:     format or dish ("Sushi", "Pizza", "Wine Bar"). Kept separately so they
//              don't clutter the cuisine filter, but still searchable and filterable.
//
// Rules applied:
//  1. Merge variants of the same cuisine: "Contemporary X" / "Modern X" → X, Steak → Steakhouse.
//  2. Split compound values into several cuisines.
//  3. Keep genuinely distinct cuisines even when rare (Ethiopian ×2 is still Ethiopian).
//     The filter has search + "show more", so a long tail is fine; near-duplicates are not.
//  4. Never invent a cuisine we can't support: format-only values (Gastro Pub, Tapas,
//     Bistro) stay as their own cuisine rather than being guessed into "American".
//  5. The original `food_type` stays on the record, displayed and searchable.

type Mapping = { cuisines: string[]; tags?: string[] };

export const FOOD_TYPE_MAP: Record<string, Mapping> = {
  // American, including regional styles
  'American': { cuisines: ['American'] },
  'Contemporary American': { cuisines: ['American'] },
  'Californian': { cuisines: ['Californian'] },
  'Northwest': { cuisines: ['Pacific Northwest'] },
  'Southwest': { cuisines: ['Southwestern'] },
  'Southern': { cuisines: ['Southern'] },
  'Contemporary Southern': { cuisines: ['Southern'] },
  'Low Country': { cuisines: ['Southern'], tags: ['Low Country'] },
  'Creole': { cuisines: ['Cajun & Creole'] },
  'Cajun': { cuisines: ['Cajun & Creole'] },
  'Creole / Cajun / Southern': { cuisines: ['Cajun & Creole', 'Southern'] },
  'Hawaii Regional Cuisine': { cuisines: ['Hawaiian'] },
  'Hawaiian': { cuisines: ['Hawaiian'] },
  'Polynesian': { cuisines: ['Hawaiian'], tags: ['Polynesian'] },
  'Steakhouse': { cuisines: ['Steakhouse'] },
  'Steak': { cuisines: ['Steakhouse'] },
  'Prime Rib': { cuisines: ['Steakhouse'], tags: ['Prime Rib'] },
  'Seafood': { cuisines: ['Seafood'] },
  'Barbecue': { cuisines: ['Barbecue'] },
  'Burgers': { cuisines: ['American'], tags: ['Burgers'] },
  'Comfort Food': { cuisines: ['American'], tags: ['Comfort Food'] },
  'Breakfast': { cuisines: ['American'], tags: ['Breakfast & Brunch'] },
  'Wild Game': { cuisines: ['American'], tags: ['Wild Game'] },
  'Organic': { cuisines: ['Farm-to-Table'], tags: ['Organic'] },

  // Latin American & Caribbean
  'Mexican': { cuisines: ['Mexican'] },
  'Contemporary Mexican': { cuisines: ['Mexican'] },
  'Traditional Mexican': { cuisines: ['Mexican'] },
  'Regional Mexican': { cuisines: ['Mexican'] },
  'Mexican / Southwestern': { cuisines: ['Mexican', 'Southwestern'] },
  'Tex-Mex': { cuisines: ['Tex-Mex'] },
  'Latin American': { cuisines: ['Latin American'] },
  'Latin / Spanish': { cuisines: ['Latin American', 'Spanish'] },
  'South American': { cuisines: ['Latin American'] },
  'Brazilian': { cuisines: ['Brazilian'] },
  'Brazilian Steakhouse': { cuisines: ['Brazilian', 'Steakhouse'] },
  'Peruvian': { cuisines: ['Peruvian'] },
  'Argentinean': { cuisines: ['Argentinian'] },
  'Caribbean': { cuisines: ['Caribbean'] },
  'Cuban': { cuisines: ['Cuban'] },
  'Puerto Rican': { cuisines: ['Puerto Rican'] },

  // European
  'Italian': { cuisines: ['Italian'] },
  'Contemporary Italian': { cuisines: ['Italian'] },
  'Sicilian': { cuisines: ['Italian'], tags: ['Sicilian'] },
  'Pizzeria': { cuisines: ['Italian'], tags: ['Pizza'] },
  'French': { cuisines: ['French'] },
  'Contemporary French': { cuisines: ['French'] },
  'Provencal': { cuisines: ['French'], tags: ['Provençal'] },
  'French American': { cuisines: ['French', 'American'] },
  'Contemporary French / American': { cuisines: ['French', 'American'] },
  'Spanish': { cuisines: ['Spanish'] },
  'Basque': { cuisines: ['Spanish'], tags: ['Basque'] },
  'Portuguese': { cuisines: ['Portuguese'] },
  'German': { cuisines: ['German'] },
  'Austrian': { cuisines: ['Austrian'] },
  'Swiss': { cuisines: ['Swiss'] },
  'Belgian': { cuisines: ['Belgian'] },
  'Irish': { cuisines: ['Irish'] },
  'British': { cuisines: ['British'] },
  'English': { cuisines: ['British'] },
  'Scandinavian': { cuisines: ['Scandinavian'] },
  'Russian': { cuisines: ['Russian'] },
  'Eastern European': { cuisines: ['Eastern European'] },
  'European': { cuisines: ['European'] },
  'Contemporary European': { cuisines: ['European'] },
  'Modern European': { cuisines: ['European'] },
  'Continental': { cuisines: ['Continental'] },
  'Fondue': { cuisines: ['Fondue'] },
  'Afternoon Tea': { cuisines: ['Afternoon Tea'] },

  // Mediterranean & Middle Eastern
  'Mediterranean': { cuisines: ['Mediterranean'] },
  'Greek': { cuisines: ['Greek'] },
  'Turkish': { cuisines: ['Turkish'] },
  'Lebanese': { cuisines: ['Lebanese'] },
  'Syrian': { cuisines: ['Middle Eastern'], tags: ['Syrian'] },
  'Middle Eastern': { cuisines: ['Middle Eastern'] },
  'Persian': { cuisines: ['Persian'] },
  'Moroccan': { cuisines: ['Moroccan'] },
  'Afghan': { cuisines: ['Afghan'] },

  // Asian
  'Japanese': { cuisines: ['Japanese'] },
  'Sushi': { cuisines: ['Japanese'], tags: ['Sushi'] },
  'Hibachi': { cuisines: ['Japanese'], tags: ['Hibachi'] },
  'Chinese': { cuisines: ['Chinese'] },
  'Dim Sum': { cuisines: ['Chinese'], tags: ['Dim Sum'] },
  'Thai': { cuisines: ['Thai'] },
  'Korean': { cuisines: ['Korean'] },
  'Vietnamese': { cuisines: ['Vietnamese'] },
  'Filipino': { cuisines: ['Filipino'] },
  'Burmese': { cuisines: ['Burmese'] },
  'Southeast Asian': { cuisines: ['Southeast Asian'] },
  'Indian': { cuisines: ['Indian'] },
  'Contemporary Indian': { cuisines: ['Indian'] },
  'South Indian': { cuisines: ['Indian'], tags: ['South Indian'] },
  'Asian': { cuisines: ['Pan-Asian'] },
  'Pan-Asian': { cuisines: ['Pan-Asian'] },
  'Contemporary Asian': { cuisines: ['Pan-Asian'] },
  'Pacific Rim': { cuisines: ['Pan-Asian'], tags: ['Pacific Rim'] },

  // African
  'African': { cuisines: ['African'] },
  'Ethiopian': { cuisines: ['Ethiopian'] },
  'South African': { cuisines: ['South African'] },

  // International, fusion, dietary
  'International': { cuisines: ['International'] },
  'Global, International': { cuisines: ['International'] },
  'Fusion / Eclectic': { cuisines: ['Fusion'] },
  'Eurasian': { cuisines: ['Fusion'], tags: ['Eurasian'] },
  'Australian': { cuisines: ['Australian'] },
  'Modern Australian': { cuisines: ['Australian'] },
  'Tapas / Small Plates': { cuisines: ['Tapas & Small Plates'] },
  'Bistro': { cuisines: ['Bistro'] },
  'Vegetarian': { cuisines: ['Vegetarian'] },
  'Vegan': { cuisines: ['Vegan'] },
  'Kosher': { cuisines: ['Kosher'] },

  // Bars & pubs
  'Gastro Pub': { cuisines: ['Gastropub'] },
  'Wine Bar': { cuisines: ['Wine Bar'] },
  'Bar / Lounge / Bottle Service': { cuisines: ['Bar & Lounge'] },
  'Brewery': { cuisines: ['Brewery'] },
  'Beer Garden': { cuisines: ['Brewery'], tags: ['Beer Garden'] },
};

export const CUISINE_REGION: Record<string, string> = {
  'American': 'American', 'Californian': 'American', 'Pacific Northwest': 'American',
  'Southwestern': 'American', 'Southern': 'American', 'Cajun & Creole': 'American',
  'Hawaiian': 'American', 'Steakhouse': 'American', 'Seafood': 'American',
  'Barbecue': 'American', 'Farm-to-Table': 'American',

  'Mexican': 'Latin American & Caribbean', 'Tex-Mex': 'Latin American & Caribbean',
  'Latin American': 'Latin American & Caribbean', 'Brazilian': 'Latin American & Caribbean',
  'Peruvian': 'Latin American & Caribbean', 'Argentinian': 'Latin American & Caribbean',
  'Caribbean': 'Latin American & Caribbean', 'Cuban': 'Latin American & Caribbean',
  'Puerto Rican': 'Latin American & Caribbean',

  'Italian': 'European', 'French': 'European', 'Spanish': 'European', 'Portuguese': 'European',
  'German': 'European', 'Austrian': 'European', 'Swiss': 'European', 'Belgian': 'European',
  'Irish': 'European', 'British': 'European', 'Scandinavian': 'European', 'Russian': 'European',
  'Eastern European': 'European', 'European': 'European', 'Continental': 'European',
  'Fondue': 'European', 'Afternoon Tea': 'European',

  'Mediterranean': 'Mediterranean & Middle Eastern', 'Greek': 'Mediterranean & Middle Eastern',
  'Turkish': 'Mediterranean & Middle Eastern', 'Lebanese': 'Mediterranean & Middle Eastern',
  'Middle Eastern': 'Mediterranean & Middle Eastern', 'Persian': 'Mediterranean & Middle Eastern',
  'Moroccan': 'Mediterranean & Middle Eastern', 'Afghan': 'Mediterranean & Middle Eastern',

  'Japanese': 'Asian', 'Chinese': 'Asian', 'Thai': 'Asian', 'Korean': 'Asian',
  'Vietnamese': 'Asian', 'Filipino': 'Asian', 'Burmese': 'Asian', 'Southeast Asian': 'Asian',
  'Indian': 'Asian', 'Pan-Asian': 'Asian',

  'African': 'African', 'Ethiopian': 'African', 'South African': 'African',

  'International': 'International & Fusion', 'Fusion': 'International & Fusion',
  'Australian': 'International & Fusion', 'Tapas & Small Plates': 'International & Fusion',
  'Bistro': 'International & Fusion', 'Vegetarian': 'International & Fusion',
  'Vegan': 'International & Fusion', 'Kosher': 'International & Fusion',

  'Gastropub': 'Bars & Pubs', 'Wine Bar': 'Bars & Pubs', 'Bar & Lounge': 'Bars & Pubs',
  'Brewery': 'Bars & Pubs',
};

/** Normalise one raw food_type. Throws on unknown values so new data can't slip through unmapped. */
export function normaliseCuisine(foodType: string) {
  const mapping = FOOD_TYPE_MAP[foodType.trim()];
  if (!mapping) throw new Error(`Unmapped food_type: "${foodType}"`);
  const regions = [...new Set(mapping.cuisines.map((c) => {
    const region = CUISINE_REGION[c];
    if (!region) throw new Error(`Cuisine "${c}" has no region`);
    return region;
  }))];
  return {
    cuisines: mapping.cuisines,
    tags: mapping.tags ?? [],
    // Algolia hierarchical facet format: lvl0 = region, lvl1 = "Region > Cuisine".
    cuisine_hierarchy: {
      lvl0: regions,
      lvl1: mapping.cuisines.map((c) => `${CUISINE_REGION[c]} > ${c}`),
    },
  };
}
