import { history } from 'instantsearch.js/es/lib/routers';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Configure, InstantSearch, useInstantSearch, useRefinementList } from 'react-instantsearch';
import { ActiveFilters } from './components/ActiveFilters';
import { DiscoveryRails } from './components/DiscoveryRails';
import { Filters } from './components/Filters';
import { Header } from './components/Header';
import { Results } from './components/Results';
import { AROUND_PRECISION, INDEX, searchClient } from './lib/algolia';
import { BrandCountsContext } from './lib/brands';
import { DistanceContext, milesToMeters, SORT_DEFAULT_RADIUS_MI } from './lib/distance';
import { LocationContext, useUserLocation } from './lib/location';

// Exact brand filter for "N locations", which also returns per-brand counts for the
// current search and filters (shown in the link label).
// A text search for the brand name would go through typo tolerance and query rules:
// "Morton's The Steakhouse" became cuisine:Steakhouse + "morton's", matching Morton's Grille.
// Renders nothing: it only registers the filter with InstantSearch.
const BRAND_FILTER = { attribute: 'brand', operator: 'and', limit: 200 } as const;
function useBrandCounts() {
  const { items } = useRefinementList(BRAND_FILTER);
  return useMemo(() => new Map(items.map((i) => [i.value, i.count])), [items]);
}

/** Empty search box and no filters → discovery page; otherwise → results. */
function Main() {
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const brandCounts = useBrandCounts();
  // Keeps the current search and filters, adds the chain: the result count matches the link.
  const showBrand = (brand: string) =>
    setIndexUiState((state) => ({
      ...state,
      page: undefined,
      refinementList: { ...state.refinementList, brand: [brand] },
    }));
  // Keep sorted results local: when the diner picks a sort and distance is "Any",
  // apply the default radius once. Removing the chip afterwards is respected.
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);
  const sortBy = indexUiState.sortBy;
  const previousSort = useRef(sortBy);
  useEffect(() => {
    const sortChanged = sortBy !== previousSort.current;
    previousSort.current = sortBy;
    if (sortChanged && sortBy && sortBy !== INDEX && radiusMi === null) setRadiusMi(SORT_DEFAULT_RADIUS_MI);
  }, [sortBy, radiusMi, setRadiusMi]);

  const isBrowsing =
    !indexUiState.query &&
    !indexUiState.refinementList &&
    !indexUiState.hierarchicalMenu &&
    !indexUiState.numericMenu;

  return (
    <BrandCountsContext.Provider value={brandCounts}>
      <main className="layout">
        <Filters />
        <div className="content">
          <ActiveFilters />
          {isBrowsing && <DiscoveryRails onShowBrand={showBrand} />}
          {isBrowsing && <h2 className="section-title">All restaurants</h2>}
          <Results onShowBrand={showBrand} />
        </div>
      </main>
    </BrandCountsContext.Provider>
  );
}

export default function App() {
  const { location, choosePreset, requestBrowserLocation } = useUserLocation();
  const [radiusMi, setRadiusMi] = useState<number | null>(null);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={INDEX}
      // Click and conversion events → Analytics, Dynamic Re-Ranking, Personalization.
      insights
      // Search state lives in the URL: shareable, and the back button works.
      routing={{ router: history({ cleanUrlOnDispose: false }) }}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure
        hitsPerPage={12}
        getRankingInfo // returns distance per hit, shown on cards
        // Distance slider: limit to N miles, or "all" = rank by distance but never exclude.
        aroundRadius={radiusMi ? milesToMeters(radiusMi) : 'all'}
        aroundPrecision={AROUND_PRECISION}
        {...(location.latLng ? { aroundLatLng: location.latLng } : { aroundLatLngViaIP: true })}
      />
      <Header location={location} onChoosePreset={choosePreset} onUseMyLocation={requestBrowserLocation} />
      <LocationContext.Provider value={location}>
        <DistanceContext.Provider value={{ radiusMi, setRadiusMi }}>
          <Main />
        </DistanceContext.Provider>
      </LocationContext.Provider>
    </InstantSearch>
  );
}
