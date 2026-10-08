// The record we index in Algolia. Built by `scripts/build-records.ts`, read by the frontend.
// See DevNotes §4 for where each field comes from and why.

export type PriceTier = 2 | 3 | 4;

export interface Restaurant {
  objectID: string;

  // Identity
  name: string;
  /** Chain brand: same base name at 3+ locations, or 2 in the same metro (heuristic, Client Q5). */
  brand: string | null;
  /** The part after the brand, e.g. "Mira Mesa" in "Buca di Beppo - Mira Mesa". */
  location_label: string | null;
  /** Number of locations of this brand in the dataset (1 for independents). */
  brand_locations: number;

  // Cuisine (see scripts/lib/cuisine.ts)
  food_type: string;
  cuisines: string[];
  cuisine_hierarchy: { lvl0: string[]; lvl1: string[] };
  tags: string[];
  dining_style: string;

  // Price: CSV price_range is the source of truth (assumption, Client Q1)
  price: PriceTier;
  price_label: string;
  price_range: string;

  // Ratings
  stars_count: number;
  reviews_count: number;
  /** Rating weighted by review count (Bayesian average), 1 decimal. Used for ranking. */
  rating_score: number;

  // Location
  address: string;
  /** Null when the client's neighborhood just repeats the city. */
  neighborhood: string | null;
  city: string;
  state: string;
  postal_code: string;
  metro_area: string;
  country: string;
  _geoloc: { lat: number; lng: number };

  // Contact & booking
  phone: string;
  payment_options: string[];
  reserve_url: string;
  mobile_reserve_url: string;
}
