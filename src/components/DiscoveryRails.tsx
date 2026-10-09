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
  title: string;
  onSeeAll: (collection: Collection) => void;
  railIndex: number;
  visibleIds: Set<string> | undefined;
  onIds: (railIndex: number, ids: string[]) => void;
  onShowBrand: (brand: string) => void;
}

function RailHits({ collection, title, onSeeAll, railIndex, visibleIds, onIds, onShowBrand }: RailHitsProps) {
  const { items, results, sendEvent } = useHits<Hit<Restaurant>>();
  const trackRef = useRef<HTMLDivElement>(null);
  // Which directions can still scroll: arrows gray out at either end.
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  // Report what this rail received, so the parent can de-duplicate across rails.
  const ids = items.map((h) => h.objectID).join(',');
  useEffect(() => onIds(railIndex, ids ? ids.split(',') : []), [railIndex, ids, onIds]);

  const shown = visibleIds ? items.filter((h) => visibleIds.has(h.objectID)) : items.slice(0, SHOWN_PER_RAIL);
  const loading = !results || results.__isArtificial;

  const updateArrows = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    setCanScroll({ left: t.scrollLeft > 4, right: t.scrollLeft + t.clientWidth < t.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows, shown.length, loading]);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <>
      <header className="rail-head">
        <h2>{title}</h2>
        {collection.subtitle && <p className="muted">{collection.subtitle}</p>}
        {/* Opens the full results with this row's exact filter. */}
        {!loading && shown.length > 0 && (
          <>
            <button className="rail-view-all" onClick={() => onSeeAll(collection)}>
              View all ({results.nbHits.toLocaleString()}) →
            </button>
            {/* In the header, not over the cards. Gray when that end is reached. */}
            <span className="rail-arrows">
              <button className="rail-arrow" aria-label="Scroll left" disabled={!canScroll.left} onClick={() => scroll(-1)}>‹</button>
              <button className="rail-arrow" aria-label="Scroll right" disabled={!canScroll.right} onClick={() => scroll(1)}>›</button>
            </span>
          </>
        )}
      </header>
      {loading ? (
        <div className="rail-track"><SkeletonCards count={4} /></div>
      ) : !shown.length ? (
        <p className="muted">Nothing nearby yet. Try another city.</p>
      ) : (
        <div className="rail-body">
          <div className="rail-track" ref={trackRef} onScroll={updateArrows}>
            {shown.map((hit, i) => (
              <RestaurantCard key={hit.objectID} hit={hit} position={i} sendEvent={sendEvent} onShowBrand={onShowBrand} />
            ))}
          </div>
        </div>
      )}
    </>
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
          <Index indexName={INDEX} indexId={`rail-${rail.id}`}>
            <Configure filters={rail.filters} hitsPerPage={FETCHED_PER_RAIL} />
            <RailHits collection={rail} title={rail.nearTitle ? `${rail.title} ${where}` : rail.title} onSeeAll={onSeeAll} railIndex={i} visibleIds={visible[i]} onIds={onIds} onShowBrand={onShowBrand} />
          </Index>
        </section>
      ))}
    </div>
  );
}
