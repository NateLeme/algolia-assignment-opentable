import type { Hit } from 'instantsearch.js';
import { useContext } from 'react';
import {
  CurrentRefinements,
  SortBy,
  Stats,
  useInfiniteHits,
  useInstantSearch,
  useSearchBox,
} from 'react-instantsearch';
import { SORT_OPTIONS } from '../lib/algolia';
import { DistanceContext } from '../lib/distance';
import { PRICE_LABELS } from '../lib/labels';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';

// Defined outside components so their identity is stable across renders (see Filters.tsx).
const STATS_TRANSLATIONS = {
  rootElementText: ({ nbHits, processingTimeMS }: { nbHits: number; processingTimeMS: number }) =>
    `${nbHits.toLocaleString()} restaurants · ${processingTimeMS} ms`,
};
// Active-filter chips: hide the internal brand filter, and show price as "$$ · under $30"
// instead of the raw tier number.
const formatRefinementChips = <T extends { attribute: string; refinements: { value: unknown; label: string }[] }>(items: T[]) =>
  items
    .filter((i) => i.attribute !== 'brand')
    .map((i) =>
      i.attribute === 'price'
        ? { ...i, refinements: i.refinements.map((r) => ({ ...r, label: PRICE_LABELS[String(r.value)] ?? r.label })) }
        : i,
    );

const SUGGESTED_SEARCHES = ['Italian', 'Sushi', 'Steakhouse', 'Seafood', 'Cheap Mexican', 'Brunch'];

function NoResults() {
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const { refine } = useSearchBox();
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);
  const hasFilters = Object.keys(indexUiState).some((k) => !['query', 'configure', 'sortBy', 'page'].includes(k));
  const title = indexUiState.query
    ? `No restaurants match "${indexUiState.query}"${radiusMi ? ` within ${radiusMi} miles` : ''}`
    : `No restaurants within ${radiusMi} miles`;

  return (
    <div className="empty">
      <h3>{title}</h3>
      {radiusMi && (
        <button className="btn-primary" onClick={() => setRadiusMi(null)}>Show any distance</button>
      )}
      {hasFilters ? (
        <button className="btn-primary" onClick={() => setIndexUiState((s) => ({ query: s.query, configure: s.configure }))}>
          Search without filters
        </button>
      ) : (
        <p className="muted">Check the spelling, or try one of these:</p>
      )}
      <div className="chip-row">
        {SUGGESTED_SEARCHES.map((q) => (
          <button key={q} className="chip" onClick={() => refine(q)}>{q}</button>
        ))}
      </div>
    </div>
  );
}

export function Results() {
  const { items, sendEvent, showMore, isLastPage } = useInfiniteHits<Hit<Restaurant>>();
  const { results } = useInstantSearch();
  const { refine } = useSearchBox();
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);
  const allSameBrand = items.length > 0 && !!items[0].brand && items.every((h) => h.brand === items[0].brand);

  return (
    <section className="results">
      <div className="toolbar">
        <Stats translations={STATS_TRANSLATIONS} />
        <SortBy items={SORT_OPTIONS} />
      </div>
      <div className="active-filters">
        {radiusMi && (
          <span className="ais-CurrentRefinements-category">
            ≤ {radiusMi} {radiusMi === 1 ? 'mile' : 'miles'}
            <button className="ais-CurrentRefinements-delete" aria-label="Remove distance limit" onClick={() => setRadiusMi(null)}>✕</button>
          </span>
        )}
        <CurrentRefinements transformItems={formatRefinementChips} />
      </div>

      {results.nbHits === 0 && results.__isArtificial !== true ? (
        <NoResults />
      ) : (
        <>
          <div className="grid">
            {items.map((hit) => (
              <RestaurantCard key={hit.objectID} hit={hit} sendEvent={sendEvent} onShowBrand={refine} showBrandLink={!allSameBrand} />
            ))}
          </div>
          {!isLastPage && (
            <button className="btn-secondary show-more" onClick={showMore}>Show more restaurants</button>
          )}
        </>
      )}
    </section>
  );
}
