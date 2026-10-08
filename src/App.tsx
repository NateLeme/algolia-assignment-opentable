import { history } from 'instantsearch.js/es/lib/routers';
import { Configure, InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch';
import { DiscoveryRails } from './components/DiscoveryRails';
import { Filters } from './components/Filters';
import { Header } from './components/Header';
import { Results } from './components/Results';
import { AROUND_PRECISION, INDEX, searchClient } from './lib/algolia';
import { useUserLocation } from './lib/location';

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
        aroundRadius="all" // rank by distance, never exclude far-away matches
        aroundPrecision={AROUND_PRECISION}
        {...(location.latLng ? { aroundLatLng: location.latLng } : { aroundLatLngViaIP: true })}
      />
      <Header location={location} onChoosePreset={choosePreset} onUseMyLocation={requestBrowserLocation} />
      <Main />
    </InstantSearch>
  );
}
