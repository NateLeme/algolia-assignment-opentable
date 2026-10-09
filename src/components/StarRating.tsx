// Five stars filled to the exact rating (e.g. 4.3 → 86%), with the number beside them.
// The real star rating is shown; the review-weighted score is only used for ranking.
export function StarRating({ value, reviews }: { value: number; reviews: number }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5 stars, ${reviews.toLocaleString()} reviews`}>
      <span className="stars-track" aria-hidden>
        ★★★★★
        <span className="stars-fill" style={{ width: `${(value / 5) * 100}%` }}>★★★★★</span>
      </span>
      <span className="stars-value">{value.toFixed(1)}</span>
      <span className="muted">({reviews.toLocaleString()})</span>
    </span>
  );
}
