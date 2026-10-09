import {
  ClearRefinements,
  DynamicWidgets,
  HierarchicalMenu,
  RefinementList,
  useNumericMenu,
} from 'react-instantsearch';
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

export function Filters() {
  return (
    <aside className="filters">
      <div className="filters-head">
        <h3>Filters</h3>
        <ClearRefinements translations={{ resetButtonText: 'Clear all' }} />
      </div>

      <RatingFilter />

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
    </aside>
  );
}
