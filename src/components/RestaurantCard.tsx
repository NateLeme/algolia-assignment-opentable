import type { Hit } from 'instantsearch.js';
import type { SendEventForHits } from 'instantsearch.js/es/lib/utils';
import { Highlight } from 'react-instantsearch';
import { useContext } from 'react';
import { BrandCountsContext } from '../lib/brands';
import { formatDistance, LocationContext, placeName } from '../lib/location';
import type { Restaurant } from '../types/restaurant';

// No usable photos in the data (Client Q2), so each card gets a banner colored by
// cuisine region instead of 5,000 identical placeholder images.
const REGION_THEME: Record<string, string> = {
  'American': 'var(--region-american)',
  'European': 'var(--region-european)',
  'Asian': 'var(--region-asian)',
  'Latin American & Caribbean': 'var(--region-latin)',
  'Mediterranean & Middle Eastern': 'var(--region-med)',
  'African': 'var(--region-african)',
  'International & Fusion': 'var(--region-intl)',
  'Bars & Pubs': 'var(--region-bars)',
};

// matchedGeoLocation.distance is the real distance. (geoDistance is the ranking value,
// rounded to our aroundPrecision bands, so everything past 50 km read "31 mi".)
type RestaurantHit = Hit<Restaurant> & { _rankingInfo?: { matchedGeoLocation?: { distance?: number } } };

interface Props {
  hit: RestaurantHit;
  sendEvent: SendEventForHits;
  onShowBrand: (brand: string) => void;
  /** False when every visible result is already this brand, so "N locations" adds nothing. */
  showBrandLink?: boolean;
}

export function RestaurantCard({ hit, sendEvent, onShowBrand, showBrandLink = true }: Props) {
  const location = useContext(LocationContext);
  // Locations of this chain matching the current search + filters (1 = only this card).
  const brandCounts = useContext(BrandCountsContext);
  const chainMatches = hit.brand ? brandCounts.get(hit.brand) ?? 0 : 0;
  const distance = formatDistance(hit._rankingInfo?.matchedGeoLocation?.distance);
  // Badge stays short; the tooltip says where it's measured from.
  const distanceTitle = location.source === 'preset' ? `From the center of ${placeName(location)}` : 'From your location';
  const region = hit.cuisine_hierarchy.lvl0[0];
  const place = [hit.neighborhood, hit.city].filter(Boolean).join(', ');

  const book = () => {
    // Conversion event: feeds Analytics, Dynamic Re-Ranking and Personalization.
    sendEvent('conversion', hit, 'Restaurant Booked');
    window.open(hit.reserve_url, '_blank', 'noopener');
  };

  return (
    <article className="card" onClick={() => sendEvent('click', hit, 'Restaurant Clicked')}>
      <div className="card-banner" style={{ background: REGION_THEME[region] }}>
        <span className="card-monogram" aria-hidden>{hit.name.charAt(0)}</span>
        {distance && <span className="card-distance" title={distanceTitle}>{distance}</span>}
      </div>

      <div className="card-body">
        <h3 className="card-title">
          <Highlight attribute="name" hit={hit} />
        </h3>

        <p className="card-place">
          {place} · {hit.state}
        </p>

        <p className="card-meta">
          <span className="rating" aria-label={`${hit.stars_count} stars`}>★ {hit.stars_count.toFixed(1)}</span>
          <span className="muted">({hit.reviews_count.toLocaleString()})</span>
          <span className="dot">·</span>
          <span>{hit.price_label}</span>
          <span className="dot">·</span>
          <span>{hit.cuisines.join(', ')}</span>
        </p>

        <div className="card-tags">
          <span className="tag">{hit.dining_style}</span>
          {hit.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>

        <div className="card-actions">
          <button className="btn-primary" onClick={(e) => { e.stopPropagation(); book(); }}>
            Reserve
          </button>
          {showBrandLink && hit.brand && chainMatches > 1 && (
            <button className="btn-link" onClick={(e) => { e.stopPropagation(); onShowBrand(hit.brand!); }}>
              {chainMatches} locations
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
