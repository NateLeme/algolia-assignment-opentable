// Algolia index configuration as code: settings, replicas, synonyms, rules.
// Applied by `scripts/push-index.ts`. Every choice is explained in DevNotes §5.
import type { IndexSettings, Rule, SynonymHit } from 'algoliasearch';

export const indexName = (env = process.env) => env.VITE_ALGOLIA_INDEX_NAME || 'restaurants';

// ---------- Sort replicas ----------
// Virtual replicas: same records (no extra record usage), different ranking.
// relevancyStrictness 0 = sort *every* matching result. The default (100) only sorts the
// "most relevant" ones, and distance counts as relevance: with a location set, only the
// nearest distance band survived ("italian" in Houston, Top rated → 1 result of 890).
// The app keeps sorted results local instead, by defaulting to a 50-mile radius.
export const replicas = (primary: string) => ({
  rating: `${primary}_rating_desc`,
  reviews: `${primary}_reviews_desc`,
  priceAsc: `${primary}_price_asc`,
  priceDesc: `${primary}_price_desc`,
});

// Filter panel order, defined here (not in the UI) so business users can change it from
// the dashboard without a deploy. Shared by the primary index and every sort replica.
const renderingContent: IndexSettings['renderingContent'] = {
  facetOrdering: {
    facets: { order: ['cuisine_hierarchy.lvl0', 'cuisines', 'price', 'dining_style', 'metro_area', 'tags'] },
    values: { price: { order: ['2', '3', '4'], sortRemainingBy: 'alpha' } },
  },
};

// Replicas don't inherit renderingContent, and the frontend's DynamicWidgets shows no
// filter panels without it: every sort option needs the same facet ordering.
const replica = (customRanking: string[]): IndexSettings => ({ customRanking, relevancyStrictness: 0, renderingContent });

export const replicaSettings = (primary: string): Record<string, IndexSettings> => {
  const r = replicas(primary);
  return {
    [r.rating]: replica(['desc(rating_score)', 'desc(reviews_count)']),
    [r.reviews]: replica(['desc(reviews_count)', 'desc(rating_score)']),
    [r.priceAsc]: replica(['asc(price)', 'desc(rating_score)']),
    [r.priceDesc]: replica(['desc(price)', 'desc(rating_score)']),
  };
};

// ---------- Primary index settings ----------
export const settings = (primary: string): IndexSettings => ({
  // What's searchable, in priority order. A match higher in the list ranks higher
  // (the "attribute" ranking criterion). The name comes first: known-item search is
  // persona 1. `unordered` = position of the word inside the attribute doesn't matter.
  searchableAttributes: [
    'name',
    'unordered(cuisines)',
    'unordered(tags)',
    'unordered(food_type)',
    'unordered(neighborhood)',
    'unordered(city)',
    'unordered(metro_area)',
    'unordered(dining_style)',
    'unordered(address)',
  ],

  // Tie-breakers once textual relevance (and distance) are equal.
  // rating_score is rounded to 1 decimal so reviews_count gets a chance to act.
  customRanking: ['desc(rating_score)', 'desc(reviews_count)'],

  // Filters. `searchable()` lets the UI search inside a long facet list (70 cuisines).
  // `brand` is countable (not filterOnly) so each card's "N locations" link can show how
  // many locations of that chain match the current search and filters.
  attributesForFaceting: [
    'cuisine_hierarchy.lvl0',
    'cuisine_hierarchy.lvl1',
    'searchable(cuisines)',
    'searchable(tags)',
    'price',
    'dining_style',
    'searchable(metro_area)',
    'searchable(city)',
    'brand',
    'filterOnly(state)', // for the state-abbreviation rules ("steakhouse tx")
  ],

  // Language: English-only data (assumption 6).
  queryLanguages: ['en'],
  indexLanguages: ['en'],
  ignorePlurals: true, // "steakhouses" = "steakhouse"
  removeStopWords: true, // "the capital grille" = "capital grille"

  // Typos: Algolia defaults (1 typo from 4 letters, 2 from 8). No typos on numbers,
  // so "Seasons 52" doesn't match "25".
  typoTolerance: true,
  allowTyposOnNumericTokens: false,

  // Long descriptive queries ("cozy italian dinner in brooklyn") shouldn't return nothing:
  // if there are no results, words are made optional instead.
  removeWordsIfNoResults: 'allOptional',

  attributesToHighlight: ['name', 'cuisines', 'tags', 'neighborhood', 'city'],
  attributesToSnippet: [],
  hitsPerPage: 20,
  maxValuesPerFacet: 200, // 150 chains: all brand counts fit in one response

  renderingContent, // filter panel order (see above)

  replicas: Object.values(replicas(primary)).map((name) => `virtual(${name})`),
});

// ---------- Synonyms ----------
// Only for gaps Algolia can't close by itself (typos, plurals, prefixes and
// concatenations like "steak house" ↔ "steakhouse" are already handled natively).
const twoWay = (id: string, words: string[]): SynonymHit => ({ objectID: id, type: 'synonym', synonyms: words });
const oneWay = (id: string, input: string, words: string[]): SynonymHit => ({
  objectID: id, type: 'onewaysynonym', input, synonyms: words,
});

export const synonyms: SynonymHit[] = [
  twoWay('bbq', ['bbq', 'barbecue', 'barbeque', 'bar-b-que']),
  twoWay('pub', ['pub', 'gastropub', 'tavern']),
  twoWay('brunch', ['brunch', 'breakfast']),
  twoWay('hibachi', ['hibachi', 'teppanyaki']),
  twoWay('churrascaria', ['churrascaria', 'brazilian steakhouse']),
  twoWay('vegetarian', ['vegetarian', 'veggie']),
  twoWay('nyc', ['nyc', 'new york']),
  twoWay('sf', ['sf', 'san francisco']),
  twoWay('nola', ['nola', 'new orleans']),
  // One-way: searching "sushi" should also surface Japanese restaurants,
  // but searching "japanese" shouldn't be narrowed to sushi.
  oneWay('sushi-japanese', 'sushi', ['japanese']),
  oneWay('fish-seafood', 'fish', ['seafood']),
  oneWay('texmex-mexican', 'tex mex', ['mexican']),
];

// ---------- Query Rules ----------
// Turn intent words into filters instead of text matches. A text match on "cheap"
// would only find restaurants with "cheap" in their name.
const removeWords = (...words: string[]) => ({ edits: words.map((w) => ({ type: 'remove' as const, delete: w })) });
const contains = (...patterns: string[]) => patterns.map((pattern) => ({ pattern, anchoring: 'contains' as const }));

// Plan note: the free Build plan allows only 3 rules per index, which forced a choice
// (cuisine, budget, near me). Grow Plus allows 10,000, so all intents are on.
// A rule's automatic facet filter must appear in every one of its patterns, which is
// why cuisine and city detection are separate rules.
export const rules: Rule[] = [
  {
    objectID: 'detect-cuisine',
    description: 'A cuisine name in the query becomes a cuisine filter ("italian" → cuisines:Italian)',
    conditions: [{ pattern: '{facet:cuisines}', anchoring: 'contains' }],
    consequence: { params: { automaticFacetFilters: [{ facet: 'cuisines', disjunctive: true }] } },
  },
  {
    objectID: 'intent-budget',
    description: 'Budget words → $$ price filter',
    conditions: contains('cheap', 'inexpensive', 'affordable', 'budget'),
    consequence: { params: { filters: 'price = 2', query: removeWords('cheap', 'inexpensive', 'affordable', 'budget') } },
  },
  {
    objectID: 'intent-near-me',
    description: '"near me" → rank by distance from the user (IP location as fallback)',
    conditions: contains('near me', 'nearby', 'close by'),
    consequence: { params: { aroundLatLngViaIP: true, query: removeWords('near', 'me', 'nearby', 'close', 'by') } },
  },
  {
    objectID: 'detect-city',
    description: 'A city name in the query becomes a city filter ("sushi brooklyn" → city:Brooklyn)',
    conditions: [{ pattern: '{facet:city}', anchoring: 'contains' }],
    consequence: { params: { automaticFacetFilters: [{ facet: 'city' }] } },
  },
  {
    objectID: 'intent-upscale',
    description: 'Upscale words → Fine Dining filter',
    conditions: contains('fine dining', 'upscale', 'fancy', 'special occasion'),
    consequence: {
      params: { filters: 'dining_style:"Fine Dining"', query: removeWords('fine', 'dining', 'upscale', 'fancy', 'special', 'occasion') },
    },
  },
  {
    objectID: 'intent-expensive',
    description: 'Expensive words → $$$$ price filter (the opposite of intent-budget)',
    conditions: contains('expensive', 'pricey', 'splurge', 'high end', 'luxury'),
    consequence: { params: { filters: 'price = 4', query: removeWords('expensive', 'pricey', 'splurge', 'high', 'end', 'luxury') } },
  },
  // State abbreviations: "steakhouse tx" → state:TX. Only codes that can't be confused
  // with a common word or a name token. Excluded: IN OR ME OK HI OH LA AL PA CO ID MS NE
  // IL MI MO AR (words: "italian in brooklyn", "La Griglia"), MT ("Mt. Fuji"),
  // ND ("42nd"), NM ("NM Cafe" = Neiman Marcus). Full names ("texas") are excluded too:
  // they appear in restaurant names ("Texas de Brazil").
  ...['AZ', 'CA', 'CT', 'FL', 'IA', 'KS', 'MN', 'NC', 'NJ', 'NV', 'NY', 'TN', 'TX', 'WA', 'WI', 'WY'].map(
    (code): Rule => ({
      objectID: `state-${code.toLowerCase()}`,
      description: `"${code.toLowerCase()}" → state:${code} filter`,
      conditions: contains(code.toLowerCase()),
      consequence: { params: { filters: `state:${code}`, query: removeWords(code.toLowerCase()) } },
    }),
  ),
  // City abbreviations. detect-city only recognises full facet values ("San Francisco"),
  // so "sushi sf" matched SF by synonym text but returned the whole Bay Area.
  ...Object.entries({ sf: 'San Francisco', nyc: 'New York' }).map(([abbr, city]): Rule => ({
    objectID: `city-abbr-${abbr}`,
    description: `"${abbr}" → city:${city} filter`,
    conditions: contains(abbr),
    consequence: { params: { filters: `city:"${city}"`, query: removeWords(abbr) } },
  })),
];
