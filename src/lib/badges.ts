import type { Restaurant } from '../types/restaurant';

// Social-proof badges from real data (our honest stand-in for "Booked 75 times today",
// which would need OpenTable's booking data). At most one per card, in this priority.
// Thresholds from the dataset (2026-10-09): rating_score ≥ 4.7 = top ~4% (199);
// reviews ≥ 1,355 = top 10% (500); hidden gem = same rule as the "Hidden gems" row.
const POPULAR_MIN_REVIEWS = 1355;

export type Badge = { label: string; tone: 'gold' | 'red' | 'green' };

export function badgeFor(r: Pick<Restaurant, 'rating_score' | 'reviews_count'>): Badge | null {
  if (r.rating_score >= 4.7) return { label: 'Top rated', tone: 'gold' };
  if (r.reviews_count >= POPULAR_MIN_REVIEWS) return { label: 'Popular', tone: 'red' };
  if (r.rating_score >= 4.5 && r.reviews_count < 300) return { label: 'Hidden gem', tone: 'green' };
  return null;
}
