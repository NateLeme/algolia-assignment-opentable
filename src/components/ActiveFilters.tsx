import { useContext } from 'react';
import { CurrentRefinements } from 'react-instantsearch';
import { DistanceContext } from '../lib/distance';
import { PRICE_LABELS } from '../lib/labels';

// Active-filter chips: hide the internal brand filter, and show price as "$$ · under $30"
// instead of the raw tier number. Defined outside the component so its identity is
// stable across renders (see Filters.tsx).
const formatRefinementChips = <T extends { attribute: string; refinements: { value: unknown; label: string }[] }>(items: T[]) =>
  items
    .filter((i) => i.attribute !== 'brand')
    .map((i) =>
      i.attribute === 'price'
        ? { ...i, refinements: i.refinements.map((r) => ({ ...r, label: PRICE_LABELS[String(r.value)] ?? r.label })) }
        : i,
    );

/** Chips for every active filter, shown at the top of the content area in both views. */
export function ActiveFilters() {
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);

  return (
    <div className="active-filters">
      {radiusMi && (
        <span className="ais-CurrentRefinements-category">
          ≤ {radiusMi} {radiusMi === 1 ? 'mile' : 'miles'}
          <button className="ais-CurrentRefinements-delete" aria-label="Remove distance limit" onClick={() => setRadiusMi(null)}>✕</button>
        </span>
      )}
      <CurrentRefinements transformItems={formatRefinementChips} />
    </div>
  );
}
