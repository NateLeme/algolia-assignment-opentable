import type { Hit } from 'instantsearch.js';
import type { SendEventForHits } from 'instantsearch.js/es/lib/utils';
import { Highlight } from 'react-instantsearch';
import { useContext, useState } from 'react';
import { badgeFor } from '../lib/badges';
import { BrandCountsContext } from '../lib/brands';
import { cuisineGradient, cuisineIcon, cuisinePhoto } from '../lib/cuisineStyle';
import { formatDistance, LocationContext, placeName } from '../lib/location';
import { toggleSaved, useSaved } from '../lib/saved';
import type { Restaurant } from '../types/restaurant';
import { StarRating } from './StarRating';

// matchedGeoLocation.distance is the real distance. (geoDistance is the ranking value,
// rounded to our aroundPrecision bands, so everything past 50 km read "31 mi".)
type RestaurantHit = Hit<Restaurant> & { _rankingInfo?: { matchedGeoLocation?: { distance?: number } } };

interface Props {
  hit: RestaurantHit;
  sendEvent: SendEventForHits;
  onShowBrand: (brand: string) => void;
  /** False when every visible result is already this brand, so "N locations" adds nothing. */
  showBrandLink?: boolean;
  /** Position in its list: neighbouring cards get different cuisine photos. */
  position?: number;
}

export function RestaurantCard({ hit, sendEvent, onShowBrand, showBrandLink = true, position }: Props) {
  const location = useContext(LocationContext);
  // Locations of this chain matching the current search + filters (1 = only this card).
  const brandCounts = useContext(BrandCountsContext);
  const chainMatches = hit.brand ? brandCounts.get(hit.brand) ?? 0 : 0;
  const distance = formatDistance(hit._rankingInfo?.matchedGeoLocation?.distance);
  // Badge stays short; the tooltip says where it's measured from.
  const distanceTitle = location.source === 'preset' ? `From the center of ${placeName(location)}` : 'From your location';
  const cuisine = hit.cuisines[0];
  const place = [hit.neighborhood, hit.city].filter(Boolean).join(', ');
  const badge = badgeFor(hit);
  // Gradient + icon stay underneath: shown while the photo loads, or if it fails.
  const [photoFailed, setPhotoFailed] = useState(false);
  const isSaved = useSaved().has(hit.objectID);

  const save = () => {
    // Favoriting is a preference signal: send it as a conversion for Personalization.
    if (toggleSaved(hit.objectID)) sendEvent('conversion', hit, 'Restaurant Favorited');
  };

  const book = () => {
    // Conversion event: feeds Analytics, Dynamic Re-Ranking and Personalization.
    sendEvent('conversion', hit, 'Restaurant Booked');
    window.open(hit.reserve_url, '_blank', 'noopener');
  };

  return (
    <article className="card" onClick={() => sendEvent('click', hit, 'Restaurant Clicked')}>
      <div className="card-banner" style={{ background: cuisineGradient(cuisine) }}>
        <span className="card-icon" aria-hidden>{cuisineIcon(cuisine)}</span>
        {!photoFailed && (
          <img
            className="card-photo"
            src={cuisinePhoto(cuisine, hit.objectID, position)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPhotoFailed(true)}
          />
        )}
        {distance && <span className="card-distance" title={distanceTitle}>{distance}</span>}
        {badge && <span className={`card-badge badge-${badge.tone}`}>{badge.label}</span>}
        <button
          className={`card-save ${isSaved ? 'is-saved' : ''}`}
          aria-label={isSaved ? `Remove ${hit.name} from favorites` : `Add ${hit.name} to favorites`}
          aria-pressed={isSaved}
          onClick={(e) => { e.stopPropagation(); save(); }}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      <div className="card-body">
        <h3 className="card-title">
          <Highlight attribute="name" hit={hit} />
        </h3>

        <p className="card-meta">
          <StarRating value={hit.stars_count} reviews={hit.reviews_count} />
          <span className="dot">·</span>
          <span>{hit.price_label}</span>
          <span className="dot">·</span>
          <span>{hit.cuisines.join(', ')}</span>
        </p>

        <p className="card-place">
          {place}, {hit.state}
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
