/**
 * Step 2: Relevance test suite.
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
};
// Distance buckets: within the same bucket, restaurants are ranked by quality
// (custom ranking) instead of pure distance. Mirrors what the frontend will send.
const AROUND_PRECISION = [
  { from: 0, value: 2000 },
  { from: 10000, value: 10000 },
  { from: 50000, value: 50000 },
];

type Hit = Restaurant;
interface Case {
  persona: 1 | 2;
  label: string;
  query: string;
  params?: SearchParamsObject;
  expect: string;
  check: (hits: Hit[], nbHits: number) => boolean;
}

const nameHas = (h: Hit | undefined, s: string) => !!h && h.name.toLowerCase().includes(s.toLowerCase());
const topN = (hits: Hit[], n: number, pred: (h: Hit) => boolean) => hits.slice(0, n).length > 0 && hits.slice(0, n).every(pred);
const near = (aroundLatLng: string): SearchParamsObject => ({ aroundLatLng, aroundPrecision: AROUND_PRECISION });

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
  { persona: 2, label: 'Split word', query: 'steak house', expect: 'Top 10 Steakhouse', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Steakhouse')) },
  { persona: 2, label: 'Plural', query: 'steakhouses', expect: 'Top 10 Steakhouse', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Steakhouse')) },
  { persona: 2, label: 'Format synonym', query: 'pub', expect: 'Top 5 Gastropub/pub', check: (h) => topN(h, 5, (x) => x.cuisines.includes('Gastropub') || /pub|tavern/i.test(x.name)) },
  { persona: 2, label: 'Intent: budget', query: 'cheap mexican', expect: 'Top 10 Mexican + $$', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Mexican') && x.price === 2) },
  { persona: 2, label: 'Intent: upscale + city', query: 'fine dining new york', expect: 'Top 10 Fine Dining in NY', check: (h) => topN(h, 10, (x) => x.dining_style === 'Fine Dining' && x.city === 'New York') },
  { persona: 2, label: 'Cuisine + city', query: 'italian brooklyn', expect: 'Top 10 Italian in Brooklyn', check: (h) => topN(h, 10, (x) => x.cuisines.includes('Italian') && x.city === 'Brooklyn') },
  { persona: 2, label: 'City abbreviation', query: 'sushi sf', expect: 'Top 5 Japanese in SF', check: (h) => topN(h, 5, (x) => x.city === 'San Francisco' && (x.cuisines.includes('Japanese') || nameHas(x, 'sushi'))) },
  { persona: 2, label: 'Neighborhood', query: 'upper east side', expect: 'Top 10 in UES', check: (h) => topN(h, 10, (x) => x.neighborhood === 'Upper East Side') },
  { persona: 2, label: 'Long descriptive query', query: 'cozy italian dinner in brooklyn', expect: 'Returns results (Italian)', check: (h, n) => n > 0 && h[0].cuisines.includes('Italian') },
  { persona: 2, label: 'Empty query', query: '', expect: 'Top 5 rating ≥ 4.8', check: (h) => topN(h, 5, (x) => x.rating_score >= 4.8) },
  { persona: 2, label: 'Empty query near user', query: '', params: near(AT.sanFrancisco), expect: 'Top 5 in SF Bay Area', check: (h) => topN(h, 5, (x) => x.metro_area === 'San Francisco Bay Area') },
  { persona: 2, label: 'Low-review 5.0 not on top', query: '', expect: 'No <50-review in top 20', check: (h) => h.slice(0, 20).every((x) => x.reviews_count >= 50) },
  { persona: 2, label: 'Gibberish', query: 'xqzvwk', expect: '0 results (UI fallback)', check: (_h, n) => n === 0 },
];

// ---------- Run ----------
const responses = await client.search<Hit>({
  requests: cases.map((c) => ({ indexName: indexName(), query: c.query, hitsPerPage: 20, getRankingInfo: true, ...c.params })),
});

let passed = 0;
cases.forEach((c, i) => {
  const res = responses.results[i] as { hits: Hit[]; nbHits: number; appliedRules?: { objectID: string }[] };
  const ok = c.check(res.hits, res.nbHits);
  if (ok) passed++;
  const rulesUsed = res.appliedRules?.map((r) => r.objectID).join(',') ?? '';
  console.log(`${ok ? '✅' : '❌'} P${c.persona} ${c.label.padEnd(28)} "${c.query}"`.padEnd(80) + ` ${res.nbHits} hits${rulesUsed ? `  [${rulesUsed}]` : ''}`);
  if (verbose || !ok) {
    console.log(`     expected: ${c.expect}`);
    res.hits.slice(0, 5).forEach((h, j) =>
      console.log(`     ${j + 1}. ${h.name} | ${h.cuisines.join('/')} | ${h.city} | ${h.price_label} | ${h.rating_score}★ (${h.reviews_count})`),
    );
  }
});
console.log(`\n${passed}/${cases.length} passed`);
