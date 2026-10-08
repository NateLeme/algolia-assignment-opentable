/**
 * Step 1: Build clean Algolia records from the two raw client files.
 *
 * Joins restaurants_list.json + restaurants_info.csv on objectID, applies every
 * cleanup decision documented in DevNotes §4, validates the result, and writes
 * data/processed/restaurants.json. Raw files are never modified.
 *
 * Run:  npm run build:records
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { PriceTier, Restaurant } from '../src/types/restaurant';
import { normaliseCuisine } from './lib/cuisine';
import { baseName, loadRawData } from './lib/raw-data';

const OUTPUT = 'data/processed/restaurants.json';

// ---------- Cleanup rules ----------

// Price: CSV price_range is the source of truth (assumption, Client Q1).
// Same 3-tier scale as the JSON `price` integer; there's no "$" tier in the data.
const PRICE_TIERS: Record<string, { tier: PriceTier; label: string }> = {
  '$30 and under': { tier: 2, label: '$$' },
  '$31 to $50': { tier: 3, label: '$$$' },
  '$50 and over': { tier: 4, label: '$$$$' },
};

// State codes that contradict the record's own ZIP, city and coordinates (Client Q6).
const STATE_CORRECTIONS: Record<string, { from: string; to: string }> = {
  '148627': { from: 'AL', to: 'CA' }, // I Gatti, Los Gatos 95030
  '149527': { from: 'AL', to: 'CA' }, // Yank Sing, San Francisco 94105
  '112162': { from: 'OH', to: 'OR' }, // Party Downtown, Eugene 97401
};

// Bayesian average: pulls ratings with few reviews toward the dataset mean.
// score = (v·R + m·C) / (v + m), where R = stars, v = reviews, C = mean stars,
// m = how many reviews we need before trusting a rating mostly on its own.
// m = 50: a 5.0 from 3 reviews scores ≈ 4.3, while a 4.7 from 3,000 stays ≈ 4.7.
const BAYES_MIN_REVIEWS = 50;

// Grouping key for chain detection: ignore case and ’ vs ' so "Ruth’s Chris" = "Ruth's Chris".
const brandKey = (name: string) => baseName(name).toLowerCase().replace(/’/g, "'");

// ---------- Load & join ----------
const { list, info, parseErrors } = loadRawData();
if (parseErrors.length) throw new Error(`CSV parse errors: ${JSON.stringify(parseErrors.slice(0, 3))}`);

// JSON objectID is a number, CSV objectID is a string → join on the string form.
const infoById = new Map(info.map((row) => [row.objectID.trim(), row]));
if (infoById.size !== list.length) throw new Error(`Row count mismatch: ${list.length} vs ${infoById.size}`);

const meanStars = info.reduce((sum, r) => sum + Number(r.stars_count), 0) / info.length;

// Chains: the data has no brand ID (Client Q5), so we infer one from the name.
// Same base name alone over-matches: "Town" in Carbondale and Honolulu are unrelated.
// Rule: 3+ locations, or exactly 2 in the same metro area. Two-city pairs are ~50/50
// coincidences, and a wrong "other locations" link is worse than a missing one.
const brandMetros = new Map<string, string[]>();
for (const r of list) {
  const key = brandKey(r.name);
  brandMetros.set(key, [...(brandMetros.get(key) ?? []), r.area]);
}
const brandCounts = new Map<string, number>();
for (const [key, metros] of brandMetros) {
  const isChain = metros.length >= 3 || (metros.length === 2 && metros[0] === metros[1]);
  brandCounts.set(key, isChain ? metros.length : 1);
}

// ---------- Transform ----------
const fixes = { trimmedNames: 0, stateCorrections: 0, zipTrimmed: 0, neighborhoodDropped: 0, chainLocations: 0 };

const records: Restaurant[] = list.map((raw) => {
  const objectID = String(raw.objectID);
  const row = infoById.get(objectID);
  if (!row) throw new Error(`No CSV row for objectID ${objectID}`);

  const name = raw.name.trim();
  if (name !== raw.name) fixes.trimmedNames++;

  // Single venues like "Kai Sushi - The Ritz-Carlton, Kapalua" stay whole.
  const brandLocations = brandCounts.get(brandKey(name)) ?? 1;
  const isChain = brandLocations > 1;
  const brand = isChain ? baseName(name) : null;
  const rest = name.slice(baseName(name).length).replace(/^\s+[–-]\s+/, '').trim();
  const locationLabel = isChain && rest ? rest : null;
  if (isChain) fixes.chainLocations++;

  const price = PRICE_TIERS[row.price_range];
  if (!price) throw new Error(`Unknown price_range "${row.price_range}" on ${objectID}`);

  const stars = Number(row.stars_count);
  const reviews = Number(row.reviews_count);
  if (Number.isNaN(stars) || Number.isNaN(reviews)) throw new Error(`Bad rating on ${objectID}`);
  const ratingScore = (reviews * stars + BAYES_MIN_REVIEWS * meanStars) / (reviews + BAYES_MIN_REVIEWS);

  let state = raw.state;
  const correction = STATE_CORRECTIONS[objectID];
  if (correction) {
    if (state !== correction.from) throw new Error(`State correction for ${objectID} no longer applies`);
    state = correction.to;
    fixes.stateCorrections++;
  }

  const postalCode = raw.postal_code.slice(0, 5);
  if (postalCode !== raw.postal_code) fixes.zipTrimmed++;

  const neighborhood = row.neighborhood.trim();
  const keepNeighborhood = neighborhood.toLowerCase() !== raw.city.trim().toLowerCase();
  if (!keepNeighborhood) fixes.neighborhoodDropped++;

  return {
    objectID,
    name,
    brand,
    location_label: locationLabel,
    brand_locations: brandLocations,

    food_type: row.food_type.trim(),
    ...normaliseCuisine(row.food_type),
    dining_style: row.dining_style.trim(),

    price: price.tier,
    price_label: price.label,
    price_range: row.price_range,

    stars_count: stars,
    reviews_count: reviews,
    rating_score: Math.round(ratingScore * 10) / 10,

    address: raw.address.trim(),
    neighborhood: keepNeighborhood ? neighborhood : null,
    city: raw.city.trim(),
    state,
    postal_code: postalCode,
    metro_area: raw.area.trim(),
    country: raw.country,
    _geoloc: raw._geoloc,

    // CSV phone is already formatted; the JSON one often has a stray trailing "x".
    phone: row.phone_number.trim(),
    payment_options: raw.payment_options,
    reserve_url: raw.reserve_url,
    mobile_reserve_url: raw.mobile_reserve_url,
    // image_url dropped: every URL redirects to OpenTable's generic placeholder (Client Q2).
  };
});

// ---------- Validate ----------
const ids = new Set(records.map((r) => r.objectID));
if (ids.size !== records.length) throw new Error('Duplicate objectIDs after build');
for (const r of records) {
  const { lat, lng } = r._geoloc;
  if (!(lat > 18 && lat < 72 && lng > -170 && lng < -60)) throw new Error(`Geo outside US on ${r.objectID}`);
  if (!r.cuisines.length) throw new Error(`No cuisine on ${r.objectID}`);
}

// ---------- Write ----------
mkdirSync('data/processed', { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(records, null, 2));

console.log(`✅ ${records.length} records → ${OUTPUT}`);
console.log(`   Mean stars (C) = ${meanStars.toFixed(2)}, Bayesian m = ${BAYES_MIN_REVIEWS}`);
console.log(`   Names trimmed: ${fixes.trimmedNames}`);
console.log(`   State codes corrected: ${fixes.stateCorrections}`);
console.log(`   ZIP+4 trimmed to 5 digits: ${fixes.zipTrimmed}`);
console.log(`   Neighborhood dropped (same as city): ${fixes.neighborhoodDropped}`);
console.log(`   Chain locations (brand split out): ${fixes.chainLocations} across ${[...brandCounts.values()].filter((n) => n > 1).length} brands`);
