/**
 * Step 1 (data prep): data exploration, read-only.
 *
 * Profiles the two raw files BEFORE we write any cleanup logic, so every
 * transformation in the indexing script is justified by something we observed.
 *
 * Run:  npm run explore:data
 */
import { baseName, loadRawData, type RawInfoRow } from './lib/raw-data';

// ---------- Helpers ----------
const countBy = <T>(items: T[], key: (item: T) => string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return new Map([...counts].sort((a, b) => b[1] - a[1]));
};

const top = (counts: Map<string, number>, n = 15) =>
  [...counts].slice(0, n).map(([k, v]) => `${k} (${v})`).join(', ');

const section = (title: string) => console.log(`\n=== ${title} ===`);

const stats = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return `min=${sorted[0]} median=${median} max=${sorted[sorted.length - 1]}`;
};

// ---------- Load ----------
const { list, info, parseErrors: errors } = loadRawData();

section('Row counts');
console.log(`restaurants_list.json: ${list.length}`);
console.log(`restaurants_info.csv:  ${info.length} (parse errors: ${errors.length})`);

// ---------- Join key ----------
section('Join key (objectID)');
const listIds = new Set(list.map((r) => String(r.objectID)));
const infoIds = new Set(info.map((r) => r.objectID));
console.log(`JSON objectID type: ${typeof list[0].objectID}  |  CSV objectID type: string`);
console.log(`Duplicates: JSON=${list.length - listIds.size}, CSV=${info.length - infoIds.size}`);
console.log(`Only in JSON: ${[...listIds].filter((id) => !infoIds.has(id)).length}`);
console.log(`Only in CSV:  ${[...infoIds].filter((id) => !listIds.has(id)).length}`);

// ---------- Completeness ----------
section('Empty values');
for (const col of Object.keys(info[0]) as (keyof RawInfoRow)[]) {
  const empty = info.filter((r) => !r[col]?.trim()).length;
  console.log(`CSV  ${col.padEnd(14)} empty=${empty}`);
}
for (const col of ['name', 'address', 'city', 'phone', 'image_url'] as const) {
  console.log(`JSON ${col.padEnd(14)} empty=${list.filter((r) => !r[col]).length}`);
}
console.log(`JSON _geoloc missing/zero: ${list.filter((r) => !r._geoloc?.lat || !r._geoloc?.lng).length}`);
console.log(`Names with leading/trailing whitespace: ${list.filter((r) => r.name !== r.name.trim()).length}`);

// ---------- Cuisine ----------
section('Cuisine (food_type)');
const cuisines = countBy(info, (r) => r.food_type);
console.log(`Distinct values: ${cuisines.size}`);
console.log(`Top: ${top(cuisines, 20)}`);
console.log(`Rare (<=2 restaurants): ${[...cuisines].filter(([, v]) => v <= 2).length}`);
console.log(`Compound values (contain "/" or ","): ${[...cuisines.keys()].filter((k) => /[/,]/.test(k)).join(' | ')}`);
console.log(`Near-duplicates to review: Steak vs Steakhouse, Sushi vs Japanese, American vs Contemporary American`);

// ---------- Price ----------
section('Price: JSON `price` (int) vs CSV `price_range` (text)');
const infoById = new Map(info.map((r) => [r.objectID, r]));
const priceCross = countBy(list, (r) => `${r.price} ↔ ${infoById.get(String(r.objectID))?.price_range}`);
for (const [combo, n] of priceCross) console.log(`  ${combo}: ${n}`);
const mismatches = list.filter((r) => {
  const expected: Record<number, string> = { 2: '$30 and under', 3: '$31 to $50', 4: '$50 and over' };
  return expected[r.price] !== infoById.get(String(r.objectID))?.price_range;
}).length;
console.log(`Disagreements: ${mismatches} (${((mismatches / list.length) * 100).toFixed(1)}%)`);

// ---------- Ratings & reviews ----------
section('Ratings & reviews');
const stars = info.map((r) => Number(r.stars_count));
const reviews = info.map((r) => Number(r.reviews_count));
console.log(`stars_count:   ${stats(stars)}  (non-numeric: ${stars.filter(Number.isNaN).length})`);
console.log(`reviews_count: ${stats(reviews)}  (non-numeric: ${reviews.filter(Number.isNaN).length})`);
console.log(`Restaurants with < 10 reviews: ${reviews.filter((n) => n < 10).length}`);
console.log(`→ A 5.0 with 3 reviews should not outrank a 4.7 with 3,000. Needs a confidence-weighted score.`);

// ---------- Categorical fields ----------
section('Other categorical fields');
console.log(`dining_style: ${top(countBy(info, (r) => r.dining_style))}`);
console.log(`payment_options: ${top(countBy(list.flatMap((r) => r.payment_options), (p) => p))}`);
console.log(`country: ${top(countBy(list, (r) => r.country))}`);
console.log(`states: ${countBy(list, (r) => r.state).size} distinct. Top: ${top(countBy(list, (r) => r.state), 10)}`);
console.log(`areas: ${countBy(list, (r) => r.area).size} distinct. Top: ${top(countBy(list, (r) => r.area), 8)}`);
console.log(`neighborhood == city: ${list.filter((r) => infoById.get(String(r.objectID))?.neighborhood === r.city).length}`);

// ---------- Phone ----------
section('Phone');
const badPhones = list.filter((r) => /\D/.test(r.phone));
console.log(`JSON phones containing non-digits: ${badPhones.length}  e.g. ${badPhones.slice(0, 3).map((r) => r.phone).join(', ')}`);
console.log(`CSV phone_number example: ${info[0].phone_number}`);

// ---------- Chains (persona 1 pain point) ----------
section('Chains / multi-location brands');
const brands = countBy(list, (r) => baseName(r.name));
const chains = [...brands].filter(([, v]) => v > 1);
console.log(`Brands with 2+ locations: ${chains.length}`);
console.log(`Largest: ${chains.slice(0, 12).map(([k, v]) => `${k} (${v})`).join(', ')}`);
const sameCity = [...countBy(list, (r) => `${baseName(r.name)} @ ${r.city}`)].filter(([, v]) => v > 1);
console.log(`Same brand, same city: ${sameCity.length}. e.g. ${sameCity.slice(0, 6).map(([k, v]) => `${k} (${v})`).join(', ')}`);
console.log(`Names using a typographic apostrophe (’) vs straight ('): ${list.filter((r) => r.name.includes('’')).length} vs ${list.filter((r) => r.name.includes("'")).length}`);
