import type { Hit } from 'instantsearch.js';
import {
  CurrentRefinements,
  SortBy,
  Stats,
  useInfiniteHits,
  useInstantSearch,
  useSearchBox,
} from 'react-instantsearch';
import { SORT_OPTIONS } from '../lib/algolia';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';

const SUGGESTED_SEARCHES = ['Italian', 'Sushi', 'Steakhouse', 'Seafood', 'Cheap Mexican', 'Brunch'];

function NoResults() {
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const { refine } = useSearchBox();
  const hasFilters = Object.keys(indexUiState).some((k) => !['query', 'configure', 'sortBy', 'page'].includes(k));

  return (
    <div className="empty">
      <h3>No restaurants match "{indexUiState.query}"</h3>
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

  return (
    <section className="results">
      <div className="toolbar">
        <Stats
          translations={{
            rootElementText: ({ nbHits, processingTimeMS }) =>
              `${nbHits.toLocaleString()} restaurants · ${processingTimeMS} ms`,
          }}
        />
        <SortBy items={SORT_OPTIONS} />
      </div>
      <CurrentRefinements
        transformItems={(items) => items.filter((i) => i.attribute !== 'brand')}
      />

      {results.nbHits === 0 && results.__isArtificial !== true ? (
        <NoResults />
      ) : (
        <>
          <div className="grid">
            {items.map((hit) => (
              <RestaurantCard key={hit.objectID} hit={hit} sendEvent={sendEvent} onShowBrand={refine} />
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
