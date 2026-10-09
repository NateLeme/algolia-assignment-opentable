import type { Hit } from 'instantsearch.js';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Configure, Index, useHits } from 'react-instantsearch';
import { INDEX } from '../lib/algolia';
import { COLLECTIONS, type Collection } from '../lib/collections';
import { LocationContext } from '../lib/location';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';
import { SkeletonCards } from './SkeletonCard';

// Persona 2 (exploring): shown when the search box is empty, instead of a blank page.
// Each rail is a nested <Index> that inherits the location from the main search and
// adds its collection's filter. Cost note: each rail is one extra search request per page view.

// Each rail fetches extra hits so it can still show a full row after removing
// restaurants already shown in an earlier rail (same request, just more hits).
const SHOWN_PER_RAIL = 8;
const FETCHED_PER_RAIL = 16;

interface RailHitsProps {
  collection: Collection;
  onSeeAll: (collection: Collection) => void;
  railIndex: number;
  visibleIds: Set<string> | undefined;
  onIds: (railIndex: number, ids: string[]) => void;
  onShowBrand: (brand: string) => void;
}

function RailHits({ collection, onSeeAll, railIndex, visibleIds, onIds, onShowBrand }: RailHitsProps) {
  const { items, results, sendEvent } = useHits<Hit<Restaurant>>();
  const trackRef = useRef<HTMLDivElement>(null);

  // Report what this rail received, so the parent can de-duplicate across rails.
  const ids = items.map((h) => h.objectID).join(',');
  useEffect(() => onIds(railIndex, ids ? ids.split(',') : []), [railIndex, ids, onIds]);

  const shown = visibleIds ? items.filter((h) => visibleIds.has(h.objectID)) : items.slice(0, SHOWN_PER_RAIL);
  // First load: placeholders instead of an empty row.
  if (!results || results.__isArtificial) return <div className="rail-track"><SkeletonCards count={4} /></div>;
  if (!shown.length) return <p className="muted">Nothing nearby yet. Try another city.</p>;

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="rail-body">
      <button className="rail-arrow rail-arrow-left" aria-label="Scroll left" onClick={() => scroll(-1)}>‹</button>
      <div className="rail-track" ref={trackRef}>
        {shown.map((hit) => (
          <RestaurantCard key={hit.objectID} hit={hit} sendEvent={sendEvent} onShowBrand={onShowBrand} />
        ))}
        {/* End of the row: open the full results with this row's exact filter. */}
        <button className="see-all-tile" onClick={() => onSeeAll(collection)}>
          <span className="see-all-count">See all {results?.nbHits.toLocaleString()}</span>
          <span className="see-all-title">{collection.title} →</span>
        </button>
      </div>
      <button className="rail-arrow rail-arrow-right" aria-label="Scroll right" onClick={() => scroll(1)}>›</button>
    </div>
  );
}

interface Props {
  onShowBrand: (brand: string) => void;
  onSeeAll: (collection: Collection) => void;
}

export function DiscoveryRails({ onShowBrand, onSeeAll }: Props) {
  const location = useContext(LocationContext);
  const where = location.source === 'preset' ? `in ${location.label}` : 'near you';

  // objectIDs each rail received, by rail position.
  const [received, setReceived] = useState<string[][]>([]);
  const onIds = useCallback((railIndex: number, ids: string[]) => {
    setReceived((prev) => {
      if (prev[railIndex]?.join(',') === ids.join(',')) return prev;
      const next = [...prev];
      next[railIndex] = ids;
      return next;
    });
  }, []);

  // Top to bottom: each rail skips restaurants already shown above it.
  const visible = useMemo(() => {
    const alreadyShown = new Set<string>();
    return COLLECTIONS.map((_, i) => {
      if (!received[i]) return undefined;
      const ids = received[i].filter((id) => !alreadyShown.has(id)).slice(0, SHOWN_PER_RAIL);
      ids.forEach((id) => alreadyShown.add(id));
      return new Set(ids);
    });
  }, [received]);

  return (
    <div className="rails">
      {COLLECTIONS.map((rail, i) => (
        <section key={rail.id} className="rail">
          <header className="rail-head">
            <h2>{rail.nearTitle ? `${rail.title} ${where}` : rail.title}</h2>
            {rail.subtitle && <p className="muted">{rail.subtitle}</p>}
          </header>
          <Index indexName={INDEX} indexId={`rail-${rail.id}`}>
            <Configure filters={rail.filters} hitsPerPage={FETCHED_PER_RAIL} />
            <RailHits collection={rail} onSeeAll={onSeeAll} railIndex={i} visibleIds={visible[i]} onIds={onIds} onShowBrand={onShowBrand} />
          </Index>
        </section>
      ))}
    </div>
  );
}
