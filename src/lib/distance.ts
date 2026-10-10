import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useInstantSearch } from 'react-instantsearch';
import { INDEX, SORT_OPTIONS } from './algolia';
import { LocationContext, placeName } from './location';

// Distance limit. Not an Algolia facet: it maps to the geo search parameter
// `aroundRadius` (meters from the search location). null = any distance.
export const MAX_RADIUS_MI = 300;

// Sorting (Top rated, Price…) sorts every match, so without a limit "Top rated Italian"
// would be nationwide. Picking a sort while distance is "Any" applies this instead
// (shown as a removable chip).
export const SORT_DEFAULT_RADIUS_MI = 50;

export const milesToMeters = (miles: number) => Math.round(miles * 1609.34);

export const DistanceContext = createContext<{
  radiusMi: number | null;
  /** Diner's choice (slider, chip, Clear all). */
  setRadiusMi: (miles: number | null) => void;
  /** True when the app applied the radius itself (sort default), so it may undo it. */
  radiusIsAuto: boolean;
  applyAutoRadius: (miles: number) => void;
}>({ radiusMi: null, setRadiusMi: () => {}, radiusIsAuto: false, applyAutoRadius: () => {} });

/**
 * Keeps sorted results local: picking a sort while distance is "Any" applies the default
 * radius once (removing the chip afterwards is respected). The default is "soft": if it
 * finds nothing (e.g. an IP-based location with no matches nearby), it goes back to any
 * distance and returns a notice explaining why. A distance the diner chose is never undone.
 */
export function useSortDefaultRadius() {
  const { indexUiState, results } = useInstantSearch();
  const { radiusMi, radiusIsAuto, setRadiusMi, applyAutoRadius } = useContext(DistanceContext);
  const location = useContext(LocationContext);
  const [notice, setNotice] = useState<string | null>(null);
  const sortBy = indexUiState.sortBy;
  const previousSort = useRef(sortBy);

  useEffect(() => {
    const sortChanged = sortBy !== previousSort.current;
    previousSort.current = sortBy;
    if (!sortChanged) return;
    setNotice(null);
    if (sortBy && sortBy !== INDEX && radiusMi === null) applyAutoRadius(SORT_DEFAULT_RADIUS_MI);
  }, [sortBy, radiusMi, applyAutoRadius]);

  useEffect(() => {
    // Only react to results of the auto radius itself, not of an earlier search.
    const searchedRadius = (results as unknown as { _state?: { aroundRadius?: unknown } })._state?.aroundRadius;
    if (!radiusIsAuto || radiusMi === null || results.nbHits !== 0 || searchedRadius !== milesToMeters(radiusMi)) return;
    const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label.toLowerCase() ?? 'sorted';
    setNotice(`Nothing within ${radiusMi} miles of ${placeName(location)}, so showing ${sortLabel} results from everywhere.`);
    setRadiusMi(null);
  }, [results, radiusIsAuto, radiusMi, sortBy, location, setRadiusMi]);

  useEffect(() => setNotice(null), [indexUiState.query]);

  return notice;
}
