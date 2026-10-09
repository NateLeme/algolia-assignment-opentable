import { createContext } from 'react';

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
