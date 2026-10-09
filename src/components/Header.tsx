import { useContext } from 'react';
import { SearchBox, useInstantSearch } from 'react-instantsearch';
import { CollectionContext, SAVED } from '../lib/collections';
import { DistanceContext } from '../lib/distance';
import { useSaved } from '../lib/saved';
import { SEARCH_DEBOUNCE_MS } from '../lib/algolia';
import type { UserLocation } from '../lib/location';
import { LocationPicker } from './LocationPicker';

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
const debouncedSearch = (query: string, search: (q: string) => void) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
};

interface Props {
  location: UserLocation;
  onChoosePreset: (label: string) => void;
  onUseMyLocation: () => void;
}

/** Opens the Saved view: only saved restaurants, any distance, no other filters. */
function SavedButton() {
  const count = useSaved().size;
  const { collection, setCollection } = useContext(CollectionContext);
  const { setRadiusMi } = useContext(DistanceContext);
  const { setIndexUiState } = useInstantSearch();
  const active = collection?.id === SAVED.id;

  const open = () => {
    setCollection(SAVED);
    setRadiusMi(null);
    setIndexUiState((state) => ({ sortBy: state.sortBy })); // clear search + filters, keep sort
    window.scrollTo({ top: 0 });
  };

  return (
    <button
      className={`saved-button ${active ? 'is-active' : ''}`}
      onClick={active ? () => setCollection(null) : open}
      aria-label={`Saved restaurants: ${count}`}
      aria-pressed={active}
    >
      <span aria-hidden>{count > 0 ? '♥' : '♡'}</span>
      <span className="saved-label">Saved</span>
      {count > 0 && <span className="saved-count">{count}</span>}
    </button>
  );
}

export function Header({ location, onChoosePreset, onUseMyLocation }: Props) {
  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="OpenTable home">
          <span className="brand-mark" aria-hidden>●</span>OpenTable
        </a>

        <SearchBox
          className="searchbox"
          placeholder="Search restaurants, cuisines, neighborhoods"
          queryHook={debouncedSearch}
          autoFocus
        />

        <LocationPicker location={location} onChoosePreset={onChoosePreset} onUseMyLocation={onUseMyLocation} />
        <SavedButton />
      </div>
    </header>
  );
}
