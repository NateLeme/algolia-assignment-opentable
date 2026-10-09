import { createContext } from 'react';
import { INDEX } from './algolia';

// Curated discovery collections: each is a discovery row on the empty page, and
// "See all" opens the full results with the row's *exact* filter (shown as a chip).
// Exact filter strings rather than sidebar filters: "Hidden gems" (review count) has
// no sidebar equivalent, and results should match the row the diner just saw.
export interface Collection {
  id: string;
  title: string;
  subtitle?: string;
  /** Title gets "near you" / "in <metro>" appended. */
  nearTitle?: boolean;
  filters: string;
  /** Sort to apply on "See all" (sort replica index name). */
  sortBy?: string;
}

export const COLLECTIONS: Collection[] = [
  { id: 'top-rated', title: 'Top rated', nearTitle: true, filters: 'rating_score >= 4.6', sortBy: `${INDEX}_rating_desc` },
  { id: 'hidden-gems', title: 'Hidden gems', subtitle: 'Loved by diners, not yet famous', filters: 'rating_score >= 4.5 AND reviews_count < 300' },
  { id: 'date-night', title: 'Date night', subtitle: 'Fine dining, highly rated', filters: 'dining_style:"Fine Dining" AND rating_score >= 4.4' },
  { id: 'great-value', title: 'Great value', subtitle: 'Under $30, rated 4.5+', filters: 'price = 2 AND rating_score >= 4.5' },
];

export const CollectionContext = createContext<{
  collection: Collection | null;
  setCollection: (collection: Collection | null) => void;
}>({ collection: null, setCollection: () => {} });
