import {
  ClearRefinements,
  DynamicWidgets,
  HierarchicalMenu,
  RefinementList,
  useNumericMenu,
} from 'react-instantsearch';

const PRICE_LABELS: Record<string, string> = { '2': '$$ · under $30', '3': '$$$ · $31–50', '4': '$$$$ · over $50' };

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
    items: [
      { label: 'Any rating' },
      { label: '4.5 and up', start: 4.5 },
      { label: '4.0 and up', start: 4.0 },
    ],
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
      <DynamicWidgets fallbackComponent={() => null}>
        <Panel title="Cuisine region">
          <HierarchicalMenu attributes={['cuisine_hierarchy.lvl0', 'cuisine_hierarchy.lvl1']} limit={8} />
        </Panel>
        <Panel title="Cuisine">
          <RefinementList attribute="cuisines" searchable searchablePlaceholder="Search cuisines" showMore limit={8} showMoreLimit={70} />
        </Panel>
        <Panel title="Price">
          <RefinementList
            attribute="price"
            sortBy={['name:asc']}
            transformItems={(items) => items.map((i) => ({ ...i, label: PRICE_LABELS[i.value] ?? i.label }))}
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
