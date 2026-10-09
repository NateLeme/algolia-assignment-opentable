import { useContext, useEffect, useRef, useState } from 'react';
import {
  DynamicWidgets,
  HierarchicalMenu,
  RefinementList,
  useClearRefinements,
  useCurrentRefinements,
  useInstantSearch,
  useNumericMenu,
} from 'react-instantsearch';
import { DistanceContext, MAX_RADIUS_MI } from '../lib/distance';
import { LocationContext, placeName } from '../lib/location';
import { PRICE_LABELS } from '../lib/labels';

// Widget options that are functions must be defined once, outside components:
// React InstantSearch compares options on every render, and a new inline function
// counts as "changed", which rebuilds the widget → re-render → rebuild… (page freeze).
const labelPrices = <T extends { value: string; label: string }>(items: T[]) =>
  items.map((i) => ({ ...i, label: PRICE_LABELS[i.value] ?? i.label }));
const PRICE_SORT: 'name:asc'[] = ['name:asc'];
const NoFallback = () => null;
const RATING_ITEMS = [
  { label: 'Any rating' },
  { label: '4.5 and up', start: 4.5 },
  { label: '4.0 and up', start: 4.0 },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h4 className="panel-title">{title}</h4>
      {children}
    </section>
  );
}

function RatingFilter() {
  const { items, refine } = useNumericMenu({
    attribute: 'rating_score',
    items: RATING_ITEMS,
  });
  return (
    <Panel title="Rating">
      <div className="chip-row">
        {items.map((item) => (
          <button
            key={item.label}
            className={`chip ${item.isRefined ? 'chip-on' : ''}`}
            onClick={() => refine(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

// Slider positions 1…300 = miles; one extra position at the end = any distance.
const ANY_POSITION = MAX_RADIUS_MI + 1;
// Search only once the slider stops moving, not on every pixel of a drag.
const SLIDER_COMMIT_MS = 300;

function DistanceFilter() {
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);
  const place = placeName(useContext(LocationContext));
  const [position, setPosition] = useState(radiusMi ?? ANY_POSITION);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setPosition(radiusMi ?? ANY_POSITION), [radiusMi]); // e.g. after "Clear all"

  const onSlide = (value: number) => {
    setPosition(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setRadiusMi(value >= ANY_POSITION ? null : value), SLIDER_COMMIT_MS);
  };

  return (
    <Panel title="Distance">
      <div className="distance">
        <span className="distance-value">{position >= ANY_POSITION ? 'Any distance' : `Within ${position} ${position === 1 ? 'mile' : 'miles'} of ${place}`}</span>
        <input
          type="range"
          className="distance-slider"
          min={1}
          max={ANY_POSITION}
          value={position}
          onChange={(e) => onSlide(Number(e.target.value))}
          aria-label="Maximum distance in miles"
          aria-valuetext={position >= ANY_POSITION ? 'Any distance' : `${position} miles`}
        />
        <div className="distance-scale muted"><span>1 mile</span><span>{MAX_RADIUS_MI / 2} miles</span><span>Any</span></div>
      </div>
    </Panel>
  );
}

/** Clears Algolia refinements and the distance limit (which isn't an Algolia refinement). */
function ClearAll() {
  const { refine, canRefine } = useClearRefinements();
  const { radiusMi, setRadiusMi } = useContext(DistanceContext);
  const enabled = canRefine || radiusMi !== null;
  return (
    <button
      className={`clear-all ${enabled ? '' : 'is-disabled'}`}
      disabled={!enabled}
      onClick={() => { refine(); setRadiusMi(null); }}
    >
      Clear all
    </button>
  );
}

/** Phones only (hidden by CSS on desktop): opens the filter sheet, shows how many are active. */
export function MobileFiltersButton({ onClick }: { onClick: () => void }) {
  const { items } = useCurrentRefinements();
  const { radiusMi } = useContext(DistanceContext);
  const active = items.reduce((n, i) => n + i.refinements.length, 0) + (radiusMi !== null ? 1 : 0);
  return (
    <button className="mobile-filters-button" onClick={onClick}>
      Filters{active > 0 ? ` (${active})` : ''}
    </button>
  );
}

/** Desktop: sidebar. Phones: full-screen sheet opened by MobileFiltersButton. */
export function Filters({ open = false, onClose }: { open?: boolean; onClose: () => void }) {
  const { results } = useInstantSearch();

  // Don't let the page scroll behind the open sheet.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <aside className={`filters ${open ? 'is-open' : ''}`}>
      <div className="filters-head">
        <h3>Filters</h3>
        <ClearAll />
        <button className="filters-close" onClick={onClose} aria-label="Close filters">✕</button>
      </div>

      <RatingFilter />
      <DistanceFilter />

      {/* Order of these panels comes from the index's facetOrdering (renderingContent),
          so it can be changed from the Algolia dashboard without a deploy. */}
      <DynamicWidgets fallbackComponent={NoFallback}>
        <Panel title="Cuisine region">
          <HierarchicalMenu attributes={['cuisine_hierarchy.lvl0', 'cuisine_hierarchy.lvl1']} limit={8} />
        </Panel>
        <Panel title="Cuisine">
          <RefinementList attribute="cuisines" searchable searchablePlaceholder="Search cuisines" showMore limit={8} showMoreLimit={70} />
        </Panel>
        <Panel title="Price">
          <RefinementList
            attribute="price"
            sortBy={PRICE_SORT}
            transformItems={labelPrices}
          />
        </Panel>
        <Panel title="Dining style">
          <RefinementList attribute="dining_style" />
        </Panel>
        <Panel title="Metro area">
          <RefinementList attribute="metro_area" searchable searchablePlaceholder="Search areas" showMore limit={6} showMoreLimit={60} />
        </Panel>
        <Panel title="Specialties">
          <RefinementList attribute="tags" limit={8} showMore />
        </Panel>
      </DynamicWidgets>

      <div className="filters-foot">
        <button className="btn-primary" onClick={onClose}>
          Show {results.nbHits.toLocaleString()} {results.nbHits === 1 ? 'restaurant' : 'restaurants'}
        </button>
      </div>
    </aside>
  );
}
