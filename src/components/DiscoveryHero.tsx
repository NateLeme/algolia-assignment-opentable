import { useContext } from 'react';
import { useInstantSearch } from 'react-instantsearch';
import { cuisineIcon, HERO_CUISINES } from '../lib/cuisineStyle';
import { LocationContext } from '../lib/location';

// Top of the discovery page (empty search): a welcome line plus one-tap cuisine picks.
// Chips apply the exact cuisine filter (same as the sidebar), not a text search.
export function DiscoveryHero() {
  const { setIndexUiState } = useInstantSearch();
  const location = useContext(LocationContext);
  const where = location.source === 'preset' ? `in ${location.label}` : 'near you';

  const pick = (cuisine: string) =>
    setIndexUiState((state) => ({
      ...state,
      page: undefined,
      refinementList: { ...state.refinementList, cuisines: [cuisine] },
    }));

  return (
    <section className="hero">
      <h1>Find your next table</h1>
      <p className="muted">Top restaurants {where}, or pick a cuisine to start.</p>
      <div className="hero-chips">
        {HERO_CUISINES.map((c) => (
          <button key={c} className="hero-chip" onClick={() => pick(c)}>
            <span aria-hidden>{cuisineIcon(c)}</span> {c}
          </button>
        ))}
      </div>
    </section>
  );
}
