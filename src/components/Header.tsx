import { SearchBox } from 'react-instantsearch';
import { SEARCH_DEBOUNCE_MS } from '../lib/algolia';
import { CITY_PRESETS, type UserLocation } from '../lib/location';

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

export function Header({ location, onChoosePreset, onUseMyLocation }: Props) {
  const selectValue = location.source === 'preset' ? location.label : '__current';

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden>●</span> OpenTable <span className="brand-x">× Algolia</span>
        </a>

        <SearchBox
          className="searchbox"
          placeholder="Restaurant, cuisine or neighborhood: try “ruths chris” or “cheap sushi”"
          queryHook={debouncedSearch}
          autoFocus
        />

        <label className="location">
          <span className="location-pin" aria-hidden>⌖</span>
          <select
            value={selectValue}
            onChange={(e) => (e.target.value === '__current' ? onUseMyLocation() : onChoosePreset(e.target.value))}
            aria-label="Search near"
          >
            <option value="__current">{location.source === 'preset' ? 'Use my location' : location.label}</option>
            {CITY_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
