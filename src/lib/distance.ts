import { createContext } from 'react';

// Distance limit. Not an Algolia facet: it maps to the geo search parameter
// `aroundRadius` (meters from the search location). null = any distance.
export const MAX_RADIUS_MI = 300;

export const milesToMeters = (miles: number) => Math.round(miles * 1609.34);

export const DistanceContext = createContext<{
  radiusMi: number | null;
  setRadiusMi: (miles: number | null) => void;
}>({ radiusMi: null, setRadiusMi: () => {} });
