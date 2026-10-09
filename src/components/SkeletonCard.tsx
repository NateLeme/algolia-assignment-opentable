// Gray placeholder card shown while the first results load, instead of an empty page.
export function SkeletonCard() {
  return (
    <div className="card skeleton" aria-hidden>
      <div className="card-banner skeleton-block" />
      <div className="card-body">
        <div className="skeleton-line" style={{ width: '75%' }} />
        <div className="skeleton-line" style={{ width: '55%' }} />
        <div className="skeleton-line" style={{ width: '40%' }} />
      </div>
    </div>
  );
}

export const SkeletonCards = ({ count }: { count: number }) =>
  Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />);
