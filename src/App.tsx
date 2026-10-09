import { history } from 'instantsearch.js/es/lib/routers';
import { useState } from 'react';
import { Configure, InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch';
import { DiscoveryRails } from './components/DiscoveryRails';
import { Filters } from './components/Filters';
import { Header } from './components/Header';
import { Results } from './components/Results';
import { AROUND_PRECISION, INDEX, searchClient } from './lib/algolia';
import { DistanceContext, milesToMeters } from './lib/distance';
import { LocationContext, useUserLocation } from './lib/location';

/** Empty search box and no filters → discovery page; otherwise → results. */
function Main() {
  const { indexUiState } = useInstantSearch();
  const { refine } = useSearchBox();
  const isBrowsing =
    !indexUiState.query &&
    !indexUiState.refinementList &&
    !indexUiState.hierarchicalMenu &&
    !indexUiState.numericMenu;

  return (
    <main className="layout">
      <Filters />
      <div className="content">
        {isBrowsing && <DiscoveryRails onShowBrand={refine} />}
        {isBrowsing && <h2 className="section-title">All restaurants</h2>}
        <Results />
      </div>
    </main>
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
