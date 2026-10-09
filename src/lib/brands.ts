import { createContext } from 'react';

/**
 * Locations per chain matching the current search and filters, from Algolia's facet
 * counts on `brand` (main search, not a discovery row's own filter). Used for the
 * "N locations" link on cards.
 */
export const BrandCountsContext = createContext<Map<string, number>>(new Map());
