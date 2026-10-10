import { history } from 'instantsearch.js/es/lib/routers';
import { useContext, useMemo, useState } from 'react';
import { Configure, InstantSearch, useInstantSearch } from 'react-instantsearch';
import { ActiveFilters } from './components/ActiveFilters';
import { DiscoveryHero } from './components/DiscoveryHero';
import { DiscoveryRails } from './components/DiscoveryRails';
import { Filters, MobileFiltersButton } from './components/Filters';
import { Header } from './components/Header';
import { Results } from './components/Results';
import { AROUND_PRECISION, INDEX, searchClient } from './lib/algolia';
import { BrandCountsContext, useBrandCounts } from './lib/brands';
import { CollectionContext, FAVORITES, favoritesFilters, type Collection } from './lib/collections';
import { DistanceContext, milesToMeters, useSortDefaultRadius } from './lib/distance';
import { LocationContext, useUserLocation } from './lib/location';
import { useFavorites } from './lib/favorites';

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
  const widenedNotice = useSortDefaultRadius();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // "View all" on a discovery row: full results with that row's exact filter (+ its sort).
  const { collection, setCollection } = useContext(CollectionContext);
  const viewAll = (c: Collection) => {
    setCollection(c);
    setIndexUiState((state) => ({ ...state, page: undefined, ...(c.sortBy ? { sortBy: c.sortBy } : {}) }));
    window.scrollTo({ top: 0 });
  };

  const isBrowsing =
    !indexUiState.query &&
    !indexUiState.refinementList &&
    !indexUiState.hierarchicalMenu &&
    !indexUiState.numericMenu &&
    !collection;

  return (
    <BrandCountsContext.Provider value={brandCounts}>
      <main className="layout">
        <Filters open={filtersOpen} onClose={() => setFiltersOpen(false)} />
        <div className="content">
          <MobileFiltersButton onClick={() => setFiltersOpen(true)} />
          <ActiveFilters />
          {widenedNotice && <p className="notice">{widenedNotice}</p>}
          {isBrowsing && <DiscoveryHero />}
          {isBrowsing && <DiscoveryRails onShowBrand={showBrand} onViewAll={viewAll} />}
          {isBrowsing && <h2 className="section-title">All restaurants</h2>}
          <Results onShowBrand={showBrand} />
        </div>
      </main>
    </BrandCountsContext.Provider>
  );
}

export default function App() {
  const { location, choosePreset, requestBrowserLocation } = useUserLocation();
  const [radiusMi, setRadius] = useState<number | null>(null);
  const [radiusIsAuto, setRadiusIsAuto] = useState(false);
  const [collection, setCollection] = useState<Collection | null>(null);
  const collectionValue = useMemo(() => ({ collection, setCollection }), [collection]);
  const favorites = useFavorites();
  const collectionFilters = collection?.id === FAVORITES.id ? favoritesFilters(favorites) : collection?.filters ?? '';
  const distance = useMemo(
    () => ({
      radiusMi,
      radiusIsAuto,
      setRadiusMi: (miles: number | null) => { setRadiusIsAuto(false); setRadius(miles); },
      applyAutoRadius: (miles: number) => { setRadiusIsAuto(true); setRadius(miles); },
    }),
    [radiusMi, radiusIsAuto],
  );

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
        getRankingInfo // returns distance per hit, shown on cards
        // Distance slider: limit to N miles, or "all" = rank by distance but never exclude.
        aroundRadius={radiusMi ? milesToMeters(radiusMi) : 'all'}
        aroundPrecision={AROUND_PRECISION}
        filters={collectionFilters} // "View all" collection or Favorites (exact filter), if any
        {...(location.latLng ? { aroundLatLng: location.latLng } : { aroundLatLngViaIP: true })}
      />
      <LocationContext.Provider value={location}>
        <DistanceContext.Provider value={distance}>
          <CollectionContext.Provider value={collectionValue}>
            <Header location={location} onChoosePreset={choosePreset} onUseMyLocation={requestBrowserLocation} />
            <Main />
          </CollectionContext.Provider>
        </DistanceContext.Provider>
      </LocationContext.Provider>
    </InstantSearch>
  );
}
