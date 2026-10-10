import { createContext, useMemo } from 'react';
import { useRefinementList } from 'react-instantsearch';

/**
 * Locations per chain matching the current search and filters (Algolia facet counts on
 * `brand`, from the main search), for the "N locations" link on cards.
 */
export const BrandCountsContext = createContext<Map<string, number>>(new Map());

// Also registers the exact brand filter that "N locations" applies. (A text search for
// the brand would go through typo tolerance and Query Rules: "Morton's The Steakhouse"
// became cuisine:Steakhouse + "morton's" and matched Morton's Grille.)
const BRAND_FILTER = { attribute: 'brand', operator: 'and', limit: 200 } as const;

export function useBrandCounts() {
  const { items } = useRefinementList(BRAND_FILTER);
  return useMemo(() => new Map(items.map((i) => [i.value, i.count])), [items]);
}
