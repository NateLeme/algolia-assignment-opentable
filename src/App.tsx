import { history } from 'instantsearch.js/es/lib/routers';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Configure, InstantSearch, useInstantSearch, useRefinementList } from 'react-instantsearch';
import { ActiveFilters } from './components/ActiveFilters';
import { DiscoveryHero } from './components/DiscoveryHero';
import { DiscoveryRails } from './components/DiscoveryRails';
import { Filters, MobileFiltersButton } from './components/Filters';
import { Header } from './components/Header';
import { Results } from './components/Results';
import { AROUND_PRECISION, INDEX, searchClient, SORT_OPTIONS } from './lib/algolia';
import { BrandCountsContext } from './lib/brands';
import { CollectionContext, SAVED, savedFilters, type Collection } from './lib/collections';
import { DistanceContext, milesToMeters, SORT_DEFAULT_RADIUS_MI } from './lib/distance';
import { LocationContext, placeName, useUserLocation } from './lib/location';
import { useSaved } from './lib/saved';

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
  const { radiusMi, radiusIsAuto, setRadiusMi, applyAutoRadius } = useContext(DistanceContext);
  const { results } = useInstantSearch();
  const location = useContext(LocationContext);
  const [widenedNotice, setWidenedNotice] = useState<string | null>(null);
  const sortBy = indexUiState.sortBy;
  const previousSort = useRef(sortBy);
  useEffect(() => {
    const sortChanged = sortBy !== previousSort.current;
    previousSort.current = sortBy;
    if (!sortChanged) return;
    setWidenedNotice(null);
    if (sortBy && sortBy !== INDEX && radiusMi === null) applyAutoRadius(SORT_DEFAULT_RADIUS_MI);
  }, [sortBy, radiusMi, applyAutoRadius]);

  // The default is "soft": if the radius the app chose finds nothing (e.g. an IP-based
  // location with no matches nearby), go back to any distance and say why.
  // Only acts on results for that radius, never on a distance the diner chose.
  useEffect(() => {
    const searchedRadius = (results as unknown as { _state?: { aroundRadius?: unknown } })._state?.aroundRadius;
    if (!radiusIsAuto || radiusMi === null || results.nbHits !== 0 || searchedRadius !== milesToMeters(radiusMi)) return;
    const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label.toLowerCase() ?? 'sorted';
    setWidenedNotice(`Nothing within ${radiusMi} miles of ${placeName(location)}, so showing ${sortLabel} results from everywhere.`);
    setRadiusMi(null);
  }, [results, radiusIsAuto, radiusMi, sortBy, location, setRadiusMi]);
  useEffect(() => setWidenedNotice(null), [indexUiState.query]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  // "See all" on a discovery row: full results with that row's exact filter (+ its sort).
  const { collection, setCollection } = useContext(CollectionContext);
  const seeAll = (c: Collection) => {
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
          {isBrowsing && <DiscoveryRails onShowBrand={showBrand} onSeeAll={seeAll} />}
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
  const saved = useSaved();
  const collectionFilters = collection?.id === SAVED.id ? savedFilters(saved) : collection?.filters ?? '';
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
        hitsPerPage={12}
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
