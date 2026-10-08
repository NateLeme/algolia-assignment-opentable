import type { Hit } from 'instantsearch.js';
import { Configure, Index, useHits } from 'react-instantsearch';
import { INDEX } from '../lib/algolia';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';

// Persona 2 (exploring): shown when the search box is empty, instead of a blank page.
// Each rail is a nested <Index> that inherits the location from the main search and
// adds its own filter. Cost note: each rail is one extra search request per page view.
const RAILS = [
  { id: 'top-rated', title: 'Top rated near you', filters: 'rating_score >= 4.6' },
  { id: 'hidden-gems', title: 'Hidden gems', subtitle: 'Loved by diners, not yet famous', filters: 'rating_score >= 4.5 AND reviews_count < 300' },
  { id: 'date-night', title: 'Date night', subtitle: 'Fine dining, highly rated', filters: 'dining_style:"Fine Dining" AND rating_score >= 4.4' },
  { id: 'great-value', title: 'Great value', subtitle: 'Under $30, rated 4.5+', filters: 'price = 2 AND rating_score >= 4.5' },
];

function RailHits({ onShowBrand }: { onShowBrand: (brand: string) => void }) {
  const { items, sendEvent } = useHits<Hit<Restaurant>>();
  if (!items.length) return <p className="muted">Nothing nearby yet. Try another city.</p>;
  return (
    <div className="rail-track">
      {items.map((hit) => (
        <RestaurantCard key={hit.objectID} hit={hit} sendEvent={sendEvent} onShowBrand={onShowBrand} />
      ))}
    </div>
  );
}

export function DiscoveryRails({ onShowBrand }: { onShowBrand: (brand: string) => void }) {
  return (
    <div className="rails">
      {RAILS.map((rail) => (
        <section key={rail.id} className="rail">
          <header className="rail-head">
            <h2>{rail.title}</h2>
            {rail.subtitle && <p className="muted">{rail.subtitle}</p>}
          </header>
          <Index indexName={INDEX} indexId={`rail-${rail.id}`}>
            <Configure filters={rail.filters} hitsPerPage={8} />
            <RailHits onShowBrand={onShowBrand} />
          </Index>
        </section>
      ))}
    </div>
  );
}
