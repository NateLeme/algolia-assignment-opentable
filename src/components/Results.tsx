import type { Hit } from 'instantsearch.js';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Configure,
  SortBy,
  Stats,
  useInfiniteHits,
  useInstantSearch,
  useSearchBox,
} from 'react-instantsearch';
import { SORT_OPTIONS } from '../lib/algolia';
import { CollectionContext, FAVORITES } from '../lib/collections';
import { DistanceContext } from '../lib/distance';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';
import { SkeletonCards } from './SkeletonCard';

// Defined outside components so their identity is stable across renders (see Filters.tsx).
const STATS_TRANSLATIONS = {
  rootElementText: ({ nbHits, processingTimeMS }: { nbHits: number; processingTimeMS: number }) =>
    `${nbHits.toLocaleString()} ${nbHits === 1 ? 'restaurant' : 'restaurants'} · ${processingTimeMS} ms`,
};
// Page size that fills complete rows: the grid fits as many 260px columns as the
// width allows (see .grid in index.css), and 12 doesn't divide 5 columns evenly.
const TARGET_PER_PAGE = 12;
const pageSizeFor = (columns: number) => columns * Math.ceil(TARGET_PER_PAGE / columns);

/**
 * Reads how many columns the results grid actually has (from the browser's layout, so
 * scrollbars and padding are accounted for) and keeps it updated as the size changes.
 */
function useGridColumns() {
  const ref = useRef<HTMLElement>(null);
  const [columns, setColumns] = useState(4);
  const measure = () => {
    const grid = ref.current?.querySelector('.grid');
    if (grid) setColumns(getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  };
  useEffect(measure); // after every render (no-op when unchanged)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return { ref, columns };
}

const SUGGESTED_SEARCHES = ['Italian', 'Sushi', 'Steakhouse', 'Seafood', 'Cheap Mexican', 'Brunch'];

function NoResults() {
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const { refine } = useSearchBox();
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);
  const { collection } = useContext(CollectionContext);
  if (collection?.id === FAVORITES.id && !indexUiState.query) {
    return (
      <div className="empty">
        <h3>No favorites yet</h3>
        <p className="muted">Tap ♡ on any restaurant to add it to your favorites.</p>
      </div>
    );
  }
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

export function Results({ onShowBrand }: { onShowBrand: (brand: string) => void }) {
  const { items, sendEvent, showMore, isLastPage } = useInfiniteHits<Hit<Restaurant>>();
  const { results } = useInstantSearch();
  const { ref: gridRef, columns } = useGridColumns();
  const allSameBrand = items.length > 0 && !!items[0].brand && items.every((h) => h.brand === items[0].brand);

  return (
    <section className="results" ref={gridRef}>
      {/* Only changes when the column count changes (e.g. resizing the window). */}
      <Configure hitsPerPage={pageSizeFor(columns)} />
      <div className="toolbar">
        {/* Hide "0 restaurants · 0 ms" while the first results are still loading. */}
        {results.__isArtificial ? <span className="ais-Stats-text">Finding restaurants…</span> : <Stats translations={STATS_TRANSLATIONS} />}
        <SortBy items={SORT_OPTIONS} />
      </div>

      {results.__isArtificial ? (
        <div className="grid"><SkeletonCards count={6} /></div>
      ) : results.nbHits === 0 ? (
        <NoResults />
      ) : (
        <>
          <div className="grid">
            {items.map((hit, i) => (
              <RestaurantCard key={hit.objectID} hit={hit} position={i} sendEvent={sendEvent} onShowBrand={onShowBrand} showBrandLink={!allSameBrand} />
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
