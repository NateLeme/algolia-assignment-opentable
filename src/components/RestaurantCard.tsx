import type { Hit } from 'instantsearch.js';
import type { SendEventForHits } from 'instantsearch.js/es/lib/utils';
import { Highlight } from 'react-instantsearch';
import { formatDistance } from '../lib/location';
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

type RestaurantHit = Hit<Restaurant> & { _rankingInfo?: { geoDistance?: number } };

interface Props {
  hit: RestaurantHit;
  sendEvent: SendEventForHits;
  onShowBrand: (brand: string) => void;
}

export function RestaurantCard({ hit, sendEvent, onShowBrand }: Props) {
  const distance = formatDistance(hit._rankingInfo?.geoDistance);
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
        {distance && <span className="card-distance">{distance}</span>}
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
          {hit.brand && hit.brand_locations > 1 && (
            <button className="btn-link" onClick={(e) => { e.stopPropagation(); onShowBrand(hit.brand!); }}>
              {hit.brand_locations} locations
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
