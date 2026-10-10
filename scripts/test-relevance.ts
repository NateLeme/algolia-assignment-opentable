/**
 * Step 2 (relevance): relevance test suite.
 *
 * Runs realistic queries for both personas against the live index and checks the
 * results against what a diner would expect. Re-run after every config change;
 * results go into DevNotes §6 (Relevance Testing Log).
 *
 * Uses the search-only key: we test exactly what the browser will get.
 *
 * Run:  npm run test:relevance            (summary)
 *       npm run test:relevance -- -v      (show top hits for every case)
 */
import 'dotenv/config';
import { algoliasearch, type SearchParamsObject } from 'algoliasearch';
import type { Restaurant } from '../src/types/restaurant';
import { indexName } from './lib/index-config';

const client = algoliasearch(process.env.VITE_ALGOLIA_APP_ID!, process.env.VITE_ALGOLIA_SEARCH_KEY!);
const verbose = process.argv.includes('-v');

const AT = {
  houston: '29.7604, -95.3698',
  manhattan: '40.7484, -73.9857',
  sanFrancisco: '37.7749, -122.4194',
  miami: '25.7617, -80.1918',
};
// Distance buckets: within the same bucket, restaurants are ranked by quality
// (custom ranking) instead of pure distance. Mirrors what the frontend will send.
const AROUND_PRECISION = [
  { from: 0, value: 2000 },
  { from: 10000, value: 10000 },
  { from: 50000, value: 50000 },
];

type Hit = Restaurant;
// Full response fields some checks need (configuration regression tests).
interface Response {
  hits: Hit[];
  nbHits: number;
  nbSortedHits?: number;
  facets?: Record<string, Record<string, number>>;
  renderingContent?: { facetOrdering?: { facets?: { order?: string[] } } };
  appliedRules?: { objectID: string }[];
}

interface Case {
  /** 1 = knows what they want · 2 = exploring · 'C' = configuration regression */
  persona: 1 | 2 | 'C';
  label: string;
  query: string;
  /** Defaults to the primary index; config tests target sort replicas. */
  index?: string;
  params?: SearchParamsObject;
  expect: string;
  check: (hits: Hit[], nbHits: number, res: Response) => boolean;
}

const nameHas = (h: Hit | undefined, s: string) => !!h && h.name.toLowerCase().includes(s.toLowerCase());
const topN = (hits: Hit[], n: number, pred: (h: Hit) => boolean) => hits.slice(0, n).length > 0 && hits.slice(0, n).every(pred);
const near = (aroundLatLng: string): SearchParamsObject => ({ aroundLatLng, aroundPrecision: AROUND_PRECISION });
const within = (aroundLatLng: string, miles: number): SearchParamsObject => ({ ...near(aroundLatLng), aroundRadius: Math.round(miles * 1609.34) });
const typos = (h: Hit | undefined) => (h as { _rankingInfo?: { nbTypos?: number } } | undefined)?._rankingInfo?.nbTypos;
const rulesFired = (res: Response, ...ids: string[]) => ids.every((id) => res.appliedRules?.some((r) => r.objectID === id));
const MORTONS = "Morton's The Steakhouse";

const cases: Case[] = [
  // ---- Persona 1: knows what they want ----
  { persona: 1, label: 'Exact name', query: 'quince', expect: 'Quince Restaurant #1', check: (h) => nameHas(h[0], 'quince') },
  { persona: 1, label: 'No apostrophe', query: 'ruths chris', expect: "Ruth's Chris #1", check: (h) => nameHas(h[0], "ruth's chris") },
  { persona: 1, label: 'Typos', query: 'rutss cris', expect: "Ruth's Chris #1", check: (h) => nameHas(h[0], "ruth's chris") },
  { persona: 1, label: 'Concatenated', query: 'ruthschris', expect: "Ruth's Chris #1", check: (h) => nameHas(h[0], "ruth's chris") },
  { persona: 1, label: 'Partial (prefix)', query: 'flemin', expect: "Fleming's #1", check: (h) => nameHas(h[0], "fleming's") },
  { persona: 1, label: 'Misspelled word', query: 'capital grill', expect: 'The Capital Grille #1', check: (h) => nameHas(h[0], 'capital grille') },
  { persona: 1, label: 'Alternate spelling', query: 'texas de brasil', expect: 'Texas de Brazil #1', check: (h) => nameHas(h[0], 'texas de brazil') },
  { persona: 1, label: 'Possessive', query: 'mamas fish house', expect: "Mama's Fish House #1", check: (h) => nameHas(h[0], "mama's fish house") },
  { persona: 1, label: 'Stop word dropped', query: 'the melting pot', expect: 'Melting Pot #1', check: (h) => nameHas(h[0], 'melting pot') },
  { persona: 1, label: 'Chain + location (Houston)', query: 'melting pot', params: near(AT.houston), expect: 'Melting Pot Houston #1', check: (h) => nameHas(h[0], 'melting pot') && h[0].city === 'Houston' },
  { persona: 1, label: 'Chain, same city ×5', query: 'cyclone anaya', params: near(AT.houston), expect: "Top 5 = Cyclone Anaya's", check: (h) => topN(h, 5, (x) => nameHas(x, 'cyclone anaya')) },
  { persona: 1, label: 'Chain + neighborhood', query: 'cyclone anaya rice village', expect: 'Rice Village location #1', check: (h) => nameHas(h[0], 'rice village') },
  { persona: 1, label: 'Name + city', query: 'nobu new york', expect: 'Nobu Fifty Seven #1', check: (h) => nameHas(h[0], 'nobu fifty seven') },
  { persona: 1, label: 'Accent-insensitive', query: 'fogo de chão', expect: 'Fogo de Chao #1', check: (h) => nameHas(h[0], 'fogo de chao') },

  // ---- Persona 2: exploring ----
  { persona: 2, label: 'Cuisine', query: 'italian', expect: 'Top 10 all Italian', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Italian')) },
  { persona: 2, label: 'Cuisine near user', query: 'italian', params: near(AT.manhattan), expect: 'Top 5 Italian in NYC', check: (h) => topN(h, 5, (x) => x.cuisines.includes('Italian') && x.metro_area.startsWith('New York')) },
  { persona: 2, label: 'Dish → cuisine', query: 'sushi', expect: 'Top 10 Japanese', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Japanese') || nameHas(x, 'sushi')) },
  { persona: 2, label: 'Synonym', query: 'bbq', expect: 'Top 5 Barbecue', check: (h) => topN(h, 5, (x) => x.cuisines.includes('Barbecue') || /bbq|bar-b|barbe/i.test(x.name)) },
  // "Steak House No. 316" is labelled American in the client data: accept name matches (data issue, Client Q4).
  { persona: 2, label: 'Split word', query: 'steak house', expect: 'Top 10 Steakhouse or "steak" in name', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Steakhouse') || nameHas(x, 'steak')) },
  { persona: 2, label: 'Plural', query: 'steakhouses', expect: 'Top 10 Steakhouse', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Steakhouse')) },
  { persona: 2, label: 'Format synonym', query: 'pub', expect: 'Top 5 Gastropub/pub', check: (h) => topN(h, 5, (x) => x.cuisines.includes('Gastropub') || /pub|tavern/i.test(x.name)) },
  { persona: 2, label: 'Intent: budget', query: 'cheap mexican', expect: 'Top 10 Mexican + $$', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Mexican') && x.price === 2) },
  { persona: 2, label: 'Intent: upscale + city', query: 'fine dining new york', expect: 'Top 10 Fine Dining in NY', check: (h) => topN(h, 10, (x) => x.dining_style === 'Fine Dining' && x.city === 'New York') },
  { persona: 2, label: 'Cuisine + city', query: 'italian brooklyn', expect: 'Top 10 Italian in Brooklyn', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Italian') && x.city === 'Brooklyn') },
  { persona: 2, label: 'City abbreviation', query: 'sushi sf', expect: 'Top 5 Japanese in SF', check: (h) => topN(h, 5, (x) => x.city === 'San Francisco' && (x.cuisines.includes('Japanese') || nameHas(x, 'sushi'))) },
  // "Upper East Side" exists in both NYC and Miami: the user's location decides which one.
  { persona: 2, label: 'Neighborhood (in NYC)', query: 'upper east side', params: near(AT.manhattan), expect: 'Top 10 in NYC UES', check: (h) => topN(h, 10, (x) => x.neighborhood === 'Upper East Side' && x.city === 'New York') },
  { persona: 2, label: 'Neighborhood (in Miami)', query: 'upper east side', params: near(AT.miami), expect: 'Miami UES first', check: (h) => !!h[0] && h[0].city === 'Miami' && /Upper East Side/.test(h[0].neighborhood ?? '') },
  { persona: 2, label: 'Long descriptive query', query: 'cozy italian dinner in brooklyn', expect: 'Returns results (Italian)', check: (h, n) => n > 0 && h[0].cuisines.includes('Italian') },
  { persona: 2, label: 'Empty query', query: '', expect: 'Top 5 rating ≥ 4.8', check: (h) => topN(h, 5, (x) => x.rating_score >= 4.8) },
  { persona: 2, label: 'Empty query near user', query: '', params: near(AT.sanFrancisco), expect: 'Top 5 in SF Bay Area', check: (h) => topN(h, 5, (x) => x.metro_area === 'San Francisco Bay Area') },
  { persona: 2, label: 'Low-review 5.0 not on top', query: '', expect: 'No <50-review in top 20', check: (h) => h.slice(0, 20).every((x) => x.reviews_count >= 50) },
  { persona: 2, label: 'Gibberish', query: 'xqzvwk', expect: '0 results (UI fallback)', check: (_h, n) => n === 0 },

  // ---- Added 2026-10-09: more realistic queries ----
  { persona: 1, label: '"and" vs "&"', query: 'harry and izzys', expect: "Harry & Izzy's #1", check: (h) => nameHas(h[0], 'harry & izzy') },
  { persona: 1, label: 'No apostrophe, one word', query: 'maggianos', expect: "Maggiano's #1", check: (h) => nameHas(h[0], "maggiano's") },
  { persona: 1, label: 'Number in name', query: 'seasons 52', expect: 'Seasons 52 #1', check: (h) => nameHas(h[0], 'seasons 52') },
  { persona: 1, label: 'Wrong number (no typo)', query: 'seasons 25', expect: '"25" not typo-matched to 52', check: (h) => !nameHas(h[0], 'seasons 52') || typos(h[0]) === 0 },
  // 4-letter words get 1 typo max ("nubo" → "nobu" needs 2 and is correctly not matched).
  { persona: 1, label: 'Typo, short name', query: 'nobo', expect: 'Nobu #1', check: (h) => nameHas(h[0], 'nobu') },
  { persona: 1, label: 'Words from mid-name', query: 'chris steak', expect: "Ruth's Chris #1", check: (h) => nameHas(h[0], "ruth's chris") },
  { persona: 1, label: 'Chain + city', query: 'capital grille houston', expect: 'Capital Grille Houston #1', check: (h) => nameHas(h[0], 'capital grille') && h[0].city === 'Houston' },
  { persona: 2, label: 'Three intents at once', query: 'cheap sushi near me', expect: 'Top 5 $$ Japanese; budget + near-me rules', check: (h, _n, res) => rulesFired(res, 'intent-budget', 'intent-near-me') && topN(h, 5, (x) => x.price === 2 && (x.cuisines.includes('Japanese') || nameHas(x, 'sushi'))) },
  { persona: 2, label: 'Upscale + cuisine', query: 'fancy steakhouse', expect: 'Top 10 Fine Dining steakhouses', check: (h) => topN(h, 10, (x) => x.dining_style === 'Fine Dining' && x.cuisines.includes('Steakhouse')) },
  // A restaurant *named* "Dim Sum" is as good a match as one *tagged* Dim Sum.
  { persona: 2, label: 'Specialty tag', query: 'dim sum', expect: 'Top 3 Dim Sum (tag or name)', check: (h) => topN(h, 3, (x) => x.tags.includes('Dim Sum') || nameHas(x, 'dim sum')) },
  { persona: 2, label: 'Format cuisine', query: 'fondue', expect: 'Top 5 Fondue', check: (h) => topN(h, 5, (x) => x.cuisines.includes('Fondue')) },
  { persona: 2, label: 'Dish tag', query: 'pizza', expect: 'Top 5 Pizza tag or name', check: (h) => topN(h, 5, (x) => x.tags.includes('Pizza') || /pizz/i.test(x.name)) },
  { persona: 2, label: 'Dish without synonym', query: 'tacos', expect: 'Top 5 Mexican / Tex-Mex', check: (h) => topN(h, 5, (x) => x.cuisines.some((c) => c === 'Mexican' || c === 'Tex-Mex')) },
  // Name matches count: "SOHO Asian Bar & Grill" is labelled Kosher in the client data.
  { persona: 2, label: 'Region word', query: 'asian', expect: 'Top 10 Asian region or "Asian" in name', check: (h) => topN(h, 10, (x) => x.cuisine_hierarchy.lvl0.includes('Asian') || nameHas(x, 'asian')) },
  // Houston also has a "Bay Area" neighborhood (Clear Lake): location decides, like UES.
  { persona: 2, label: 'Metro name (in SF)', query: 'bay area', params: near(AT.sanFrancisco), expect: 'Top 10 SF Bay Area', check: (h) => topN(h, 10, (x) => x.metro_area === 'San Francisco Bay Area') },
  { persona: 2, label: 'Metro nickname', query: 'tri-state', expect: 'Top 10 NY Tri-State', check: (h) => topN(h, 10, (x) => x.metro_area === 'New York / Tri-State Area') },
  { persona: 2, label: 'State abbreviation', query: 'steakhouse tx', expect: 'Top 10 Texas steakhouses', check: (h) => topN(h, 10, (x) => x.state === 'TX' && x.cuisines.includes('Steakhouse')) },
  { persona: 2, label: 'Opposite of "cheap"', query: 'expensive italian', expect: 'Top 10 $$$$ Italian', check: (h) => topN(h, 10, (x) => x.price === 4 && x.cuisines.includes('Italian')) },

  // ---- Configuration regression tests (bugs found in browser testing) ----
  { persona: 'C', label: 'Sorted results not cut to 1', query: 'italian', index: `${indexName()}_rating_desc`, params: within(AT.houston, 50), expect: 'All Houston matches sorted (relevancyStrictness 0)', check: (_h, n, res) => n > 10 && res.nbSortedHits === n },
  ...['rating_desc', 'reviews_desc', 'price_asc', 'price_desc'].map((sort): Case => ({
    persona: 'C', label: `Filter order on ${sort}`, query: 'italian', index: `${indexName()}_${sort}`, params: { facets: ['*'] },
    expect: 'renderingContent facet order present', check: (_h, _n, res) => (res.renderingContent?.facetOrdering?.facets?.order?.length ?? 0) > 0,
  })),
  { persona: 'C', label: 'Live chain counts', query: 'steakhouse', params: { ...within(AT.houston, 50), facets: ['brand'] }, expect: "Morton's = 2 within 50 mi of Houston", check: (_h, _n, res) => res.facets?.brand?.[MORTONS] === 2 },
  { persona: 'C', label: 'Exact chain filter', query: 'steakhouse', params: { facetFilters: [[`brand:${MORTONS}`]] }, expect: "Only Morton's The Steakhouse (no Morton's Grille)", check: (h) => topN(h, 20, (x) => x.brand === MORTONS) },
];

// ---------- Run ----------
// Print only the API message on failure (the full dump includes request headers).
const fail = (error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
};
process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);

// Algolia accepts at most 50 queries per multi-query request: send in batches.
const BATCH = 50;
const requests = cases.map((c) => ({ indexName: c.index ?? indexName(), query: c.query, hitsPerPage: 20, getRankingInfo: true, ...c.params }));
const responses = { results: [] as unknown[] };
for (let i = 0; i < requests.length; i += BATCH) {
  const { results } = await client.search<Hit>({ requests: requests.slice(i, i + BATCH) });
  responses.results.push(...results);
}

let passed = 0;
cases.forEach((c, i) => {
  const res = responses.results[i] as Response;
  const ok = c.check(res.hits, res.nbHits, res);
  if (ok) passed++;
  const rulesUsed = res.appliedRules?.map((r) => r.objectID).join(',') ?? '';
  const group = c.persona === 'C' ? 'Cfg' : `P${c.persona}`;
  console.log(`${ok ? '✅' : '❌'} ${group.padEnd(3)} ${c.label.padEnd(28)} "${c.query}"`.padEnd(80) + ` ${res.nbHits} hits${rulesUsed ? `  [${rulesUsed}]` : ''}`);
  if (verbose || !ok) {
    console.log(`     expected: ${c.expect}`);
    res.hits.slice(0, 5).forEach((h, j) =>
      console.log(`     ${j + 1}. ${h.name} | ${h.cuisines.join('/')} | ${h.city} | ${h.price_label} | ${h.rating_score}★ (${h.reviews_count})`),
    );
  }
});
console.log(`\n${passed}/${cases.length} passed`);
