// Browser-side Algolia setup. Only the search-only key is used here; the admin key
// never reaches the bundle (no VITE_ prefix).
import { liteClient } from 'algoliasearch/lite';

export const searchClient = liteClient(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_SEARCH_KEY,
);

export const INDEX = import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'restaurants';

// Virtual replicas defined in scripts/lib/index-config.ts.
export const SORT_OPTIONS = [
  { value: INDEX, label: 'Best match' },
  { value: `${INDEX}_rating_desc`, label: 'Top rated' },
  { value: `${INDEX}_reviews_desc`, label: 'Most reviewed' },
  { value: `${INDEX}_price_asc`, label: 'Price: low to high' },
  { value: `${INDEX}_price_desc`, label: 'Price: high to low' },
];

// Distance buckets: restaurants within the same bucket are ordered by quality
// (custom ranking) rather than strictly by distance. Same values as the relevance tests.
export const AROUND_PRECISION = [
  { from: 0, value: 2000 },
  { from: 10000, value: 10000 },
  { from: 50000, value: 50000 },
];

// Wait for a short typing pause before searching. Still feels instant, but sends
// far fewer requests per word typed (each request is billed beyond the free quota).
export const SEARCH_DEBOUNCE_MS = 150;
