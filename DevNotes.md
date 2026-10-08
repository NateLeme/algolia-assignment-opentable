# DevNotes — Algolia SE Assignment (OpenTable Restaurant Discovery)

Working notes for building the demo and preparing for the technical debrief and the mock customer call.
Newest entries go at the top of each section. Each entry is dated.

---

## 1. Project Snapshot

| Item | Value |
|---|---|
| Prospect | OpenTable (current stack: in-house search on ~10-year-old Elasticsearch) |
| Goal | Prototype a modern search & discovery experience that lifts usage and search-to-booking conversion |
| Personas | (1) Knows what they want: known-item search · (2) Exploring: discovery and inspiration |
| Dataset | `restaurants_list.json` (~5,000 records) + `restaurants_info.csv` (`;`-separated), joined on `objectID` |
| Stack | TypeScript · Node indexing script (`algoliasearch` v5) · React + Vite + React InstantSearch + Autocomplete · Vercel |
| Repo | https://github.com/NateLeme/algolia-assignment-opentable |
| Live demo | _TBD_ |
| Algolia app / index | Free (Build) plan · index `restaurants` |

---

## 2. Dev Log

Personal progress log, one short line per step: which step, why it matters, and what was done. Newest at the top.

| Date | Step | Entry |
|---|---|---|
| 2026-10-08 | 2: Relevance baseline | To measure search quality before tuning, ran the 31-query test suite against the live index (28/31 passed; failures: "steak house" name vs cuisine, "sushi sf" not filtered to the city, "upper east side" ranks 6–10), and added `--only=` to the push script so tuning rounds re-send only what changed. |
| 2026-10-07 | 3: Frontend (first draft) | To give both personas a modern experience, built a first React InstantSearch UI (instant search, cuisine/price/rating filters, location picker, discovery rows, booking events); written but not yet tested in the browser. |
| 2026-10-07 | 2: Relevance config | To make search forgiving and intent-aware, wrote the index settings, sort replicas, synonyms and Query Rules as code plus a 31-query relevance test suite; hit the free plan's 3-rule limit, then upgraded to Grow Plus to enable all 5 rules (push still in progress). |
| 2026-10-07 | 1: Data prep (repo) | To keep the repo clean and reviewable, removed duplicate assignment files, committed the raw data exactly as provided, documented env vars in the README, and merged GitHub's separate initial history so the work is pushed. |
| 2026-10-07 | 1: Data prep (build) | To turn the client files into trustworthy search records, wrote `build-records.ts`: it joins both files, fixes prices/states/ZIPs/phones/neighborhoods, adds a rating weighted by review count and chain detection, and fails on bad data. |
| 2026-10-07 | 1: Data prep (cuisine) | Because cuisine is the main filter and 114 raw values were messy, mapped them to 70 clean cuisines, 8 regions and 20 tags, checking edge cases against actual restaurant names. |
| 2026-10-07 | 1: Data prep (audit) | To understand the client's data before changing it, audited both files and sorted every issue into fixes with written assumptions vs. questions for OpenTable (§12). |

---

## 3. Decision Log

### 2026-10-07: Cuisine normalisation model
- **Context:** `food_type` has 114 values, with near-duplicates (Steak/Steakhouse, Contemporary American/American), compound values ("Creole / Cajun / Southern") and formats mixed in with cuisines (Gastro Pub, Wine Bar, Sushi, Pizzeria). Cuisine filtering is a stated requirement and the main way users explore.
- **Options considered:** (A) Use raw `food_type` as the filter: 114 messy options, with duplicates splitting results. (B) Collapse into ~15 broad buckets: clean, but loses real cuisines (Ethiopian, Peruvian) that diners search for. (C) Normalise variants, keep distinct cuisines, add a region level above and a tags level beside.
- **Decision:** C. Mapping lives in `scripts/lib/cuisine.ts`. Each record gets:
  - `cuisines` (array, 70 values): the main filter. Compound values split; "Contemporary/Modern X" → X; Steak → Steakhouse.
  - `cuisine_hierarchy.lvl0/lvl1` (8 regions → cuisines): Algolia hierarchical facet for browsing (e.g. "Asian" → Thai).
  - `tags` (20 values): formats and dishes (Sushi, Pizza, Comfort Food, Dim Sum…). Sushi → cuisine Japanese + tag Sushi, so the Japanese filter includes sushi bars.
  - `food_type` kept as-is for display and search, so "cuban" or "provençal" still match.
- **Why:** Fixes the duplicates without throwing away specificity. Arrays mean "Creole / Cajun / Southern" shows up under all three. The region level gives explorers a short, browsable top level (8 options instead of 70), and the long tail stays reachable through facet search. The mapping throws on unknown values, so new data from OpenTable can't silently slip through unmapped.
- **Judgment calls (checked against restaurant names):** "Tapas / Small Plates" is *not* mapped to Spanish (includes e.g. a Hawaiian ocean-view lounge). "Organic" → Farm-to-Table (American). "Bistro" isn't assumed to be French. Format-only values (Gastropub, Wine Bar, Fondue) stay as their own cuisine instead of being guessed. Steakhouse and Seafood sit under "American" region since the dataset is US-only.
- **Trade-offs / revisit if:** A hand-maintained mapping doesn't scale to OpenTable's full catalogue. At scale, use their official taxonomy (Client Q4) or LLM-assisted classification with human review. Region placement of Steakhouse/Seafood is debatable.

### 2026-10-06: Project scaffold, Node version, key handling
- **Context:** Starter project is outdated (Parcel 1, Node 9). Local Node was 20.12 — Node 20 reached end-of-life in April 2026, and Vite 7 needs Node ≥ 20.19 / 22.12.
- **Decision:** Fresh single-package repo (Vite + React + TS) with `scripts/` for data/indexing and `data/raw/` holding the untouched dataset. Upgrade to Node 24 LTS (pinned in `.nvmrc`). Env vars split: `VITE_`-prefixed (App ID, search-only key, index name) are bundled into the browser; `ALGOLIA_ADMIN_KEY` has no prefix so Vite never bundles it, and it's only read by local scripts via `dotenv`. `.env` is git-ignored; the README lists the required vars (`.env.example` removed 2026-10-07).
- **Why:** Least-privilege API keys is an Algolia security best practice and a likely CTO question. A single package keeps the record type shared between scripts and UI.
- **Trade-offs / revisit if:** A monorepo (separate `web/` and `indexer/` packages) would be cleaner at scale; overkill for a prototype.

### 2026-10-06: Algolia plan
- **Context:** Using the free Build plan.
- **Decision:** Free plan is sufficient: 50K records (we have ~5K), 10K search requests/month, Query Suggestions and classic Personalization included. Not included: AI features (NeuralSearch, Dynamic Re-Ranking, AI Ranking), A/B testing, Insights analytics.
- **Why / implication:** Core relevance work (searchable attributes, custom ranking, facets, geo, typo tolerance, synonyms, rules) is fully available. Premium features become the "what's next" part of the customer pitch rather than live demo features. Each keystroke is a search request, so watch usage in the dashboard.

### 2026-10-06: Tech stack
- **Context:** Need a stack for data prep, indexing, and a modern search UI; the role emphasises JS/TS and React/Vue/Angular.
- **Options considered:** Python vs Node for data prep · reuse provided starter (Parcel 1, Node 9, algoliasearch v4 + helper) vs fresh scaffold · custom backend server vs none.
- **Decision:** TypeScript end-to-end. Offline Node + TS script joins/cleans data, pushes records, and applies index settings/synonyms/rules from code. Frontend: React + Vite + React InstantSearch (+ Autocomplete, `useGeoSearch` + Leaflet for map). Hosted on Vercel. No runtime backend.
- **Why:** Algolia is queried directly from the browser with a search-only key, so a server adds latency and moving parts without value. One language across repo; shared record type between script and UI. Settings-as-code makes config reproducible, reviewable, and easy to walk through in the debrief. Official Algolia UI libraries = faster delivery and idiomatic usage.
- **Trade-offs / revisit if:** Python/pandas is nicer for exploratory wrangling, but 5k rows doesn't need it. Would add a backend only for secured API keys per user, server-side rendering, or proxying Insights/booking events.

<!-- Template:
### YYYY-MM-DD: <Decision title>
- **Context:** what problem or question came up
- **Options considered:** A / B / C
- **Decision:** what was chosen
- **Why:** reasoning, tied to the persona or business goal where possible
- **Trade-offs / revisit if:** what we gave up, and when we'd change our mind
-->

---

## 4. Data Preparation

### 2026-10-07: Build script (`npm run build:records`)

`scripts/build-records.ts` joins both files, applies every rule below, validates, and writes `data/processed/restaurants.json` (git-ignored, rebuilt on demand). Raw files are never modified. The record shape is `src/types/restaurant.ts`, shared by the script and the frontend.

**How the files are joined:** on `objectID`, converting the JSON number to a string. The script fails if row counts differ or any ID is missing on either side.

**Transformations**
| Field(s) | Rule | Why |
|---|---|---|
| `name` | Trimmed (3 records) | Stray whitespace |
| `brand`, `location_label`, `brand_locations` | Name split on the first " - " / " – ". Counted as a chain only if there are **3+ locations, or 2 in the same metro area**. 150 brands, 596 locations. Apostrophe and case variations are ignored when grouping. | Persona 1: telling chain locations apart. Name-only grouping produced false matches (Town in Carbondale vs Honolulu). Grouping by cuisine failed too (Benihana Key West is tagged "Seafood"). Two-city pairs are ~50/50 coincidences, and a wrong "other locations" link is worse than a missing one. Known misses: Pappas Bros., III Forks, Truluck's. Known false matches: Crush ×4, Cerulean ×3. The real fix is a brand ID (Client Q5). |
| `cuisines`, `cuisine_hierarchy`, `tags` | See Decision Log, cuisine model | Clean cuisine filter plus browsing by region |
| `price`, `price_label`, `price_range` | From CSV `price_range` → tier 2/3/4 + "$$"–"$$$$" | Assumption (Client Q1). Numeric value for filtering and sorting, label for display. |
| `rating_score` | Bayesian average: `(v·R + m·C)/(v+m)`, C = 4.29 (dataset mean), m = 50, rounded to 1 decimal | A 5.0 from 3 reviews → 4.3, while a 4.7 from 3,000 stays 4.7. Rounding is deliberate: Algolia's custom ranking compares criteria in order, so a very precise first criterion would mean the second (review count) never gets used as a tie-breaker. To be confirmed in relevance tuning. |
| `stars_count`, `reviews_count` | Parsed to numbers, kept raw | Display, plus a "4+ stars" filter |
| `state` | 3 explicit corrections by objectID; the script fails if the source changes | Wrong codes (Client Q6) |
| `postal_code` | ZIP+4 → 5 digits (62 records) | Consistent display and search |
| `neighborhood` | `null` when it equals the city (2,500 records) | Avoids "Houston, Houston"; show it only when it adds information |
| `metro_area` | Renamed from `area` | Clearer name for the metro filter |
| `phone` | From CSV `phone_number` | JSON phone often has a stray "x" |
| `image_url` | **Dropped** | Every URL resolves to OpenTable's placeholder image (Client Q2) |
| Kept as-is | `address`, `city`, `country`, `_geoloc`, `payment_options`, `reserve_url`, `mobile_reserve_url`, `dining_style`, `food_type` | Already clean; `food_type` stays searchable for specific terms |

**Validation (the build fails on any of these):** duplicate IDs, unmapped cuisine, unknown price label, non-numeric rating, coordinates outside the US, stale state correction.

### 2026-10-07: Deeper audit: assumptions vs. questions for the client

Framing: we're treating these files as a real export from OpenTable. Anything we can verify from the data itself gets fixed, with the assumption written down. Anything only OpenTable can answer goes to §12 *Questions for Client*. Every fix is done in the prep script, so the raw files stay untouched and every change can be traced.

**New findings**
| Finding | Evidence | Handling |
|---|---|---|
| **No real photos** | Every `image_url` tested redirects (302) to OpenTable's generic placeholder (`cdn.otstatic.com/legacy-cw/default2-original.png`) | Don't show 5,000 identical placeholder images. Use a designed card instead (e.g. cuisine-themed image or icon). Ask the client for a photo feed (Q2). |
| **Wrong state codes** | 3 records: I Gatti (Los Gatos, `AL`, ZIP 95030), Yank Sing (San Francisco, `AL`, 94105), Party Downtown (Eugene, `OH`, 97401). Found by flagging restaurants >800 km from the rest of their state; the other flagged ones (El Paso, Redding) are legitimate. | Fix to CA / CA / OR. The ZIP, city and coordinates all agree, so the correction is safe. |
| Coordinates reliable | All points inside the US. 85 coordinate pairs are shared, but they're real (same hotel, mall or casino, e.g. Hard Rock Las Vegas ×3) | Keep as-is. Geo ranking can be trusted. |
| Price disagreement has no pattern | The 220 mismatches are spread across all dining styles and go in both directions (Palm Houston: JSON 3 vs CSV "$50 and over"; Seasons 52: JSON 3 vs "$30 and under"). Both fields use the same 3-tier scale (2↔$30 and under, 3↔$31–50, 4↔$50+). No restaurant is in the cheapest "$" tier. | **Assumption:** the CSV `price_range` is the source of truth. It's the label diners actually see, and it comes from the "info" file along with ratings and reviews. Store it as a numeric `price` (2–4) for sorting and filtering, plus the label for display. Ask the client (Q1). |
| ZIP+4 codes | 62 postal codes like `80202-1304` | Keep the 5-digit ZIP for display and search. |
| Metro areas cross state lines | e.g. Kansas City (KS/MO), Tri-State (NY/NJ/CT), "Iowa" includes Moline/Rock Island IL (Quad Cities) | These are legitimate metro groupings. Use `area` as the "metro" filter and `state` separately. |
| " - " doesn't always mean a chain | 1,072 names contain " - ", but many are single venues (e.g. "Kai Sushi - The Ritz-Carlton, Kapalua"). 192 names use " at " (a restaurant inside a hotel or casino). | Split out `brand` only when the same base name appears 2+ times. Always keep the full name searchable. |
| Ratings from very few reviews | 454 restaurants have <50 reviews; several 5.0s come from 2–13 reviews (Abruzzi Trattoria 5.0/3). 14 restaurants are below 3.0. | Confirms the need for a rating weighted by review count. Don't hide low-rated restaurants; just rank them lower. |
| `dining_style` "Home Style" unclear | 26 records, a mix (pizzeria, Italian, Southern) | Keep as a filter value. Ask the client what it means (Q7). |
| No duplicate records | 0 duplicate name+address or name+city pairs | Nothing to remove. |

**Assumptions we're making (and stating openly)**
1. CSV `price_range` is the authoritative price.
2. The state codes on the 3 records above are wrong; coordinates + ZIP + city are correct.
3. "Same base name in 2+ records" = chain.
4. `stars_count` and `reviews_count` are current and comparable across restaurants.
5. `food_type` is a single primary cuisine. We map it to a cleaned-up set of cuisines (and secondary tags) ourselves.
6. The data is US-only and English-only, so no multi-language setup is needed for the prototype.

### 2026-10-06: Exploration findings (`npm run explore:data`)

**Structure & join**
- 5,000 records in each file; `objectID` is unique in both and matches 1:1, with no orphans on either side.
- JSON `objectID` is a number and CSV `objectID` is a string → normalise to string before joining.
- CSV is `;`-delimited with no quoted fields; parsed with `papaparse`.
- No empty values in any CSV column. Every JSON record has `_geoloc`. All restaurants are in the US (35 states, 51 metro "areas").

**Data-quality issues found**
| Issue | Evidence | Proposed handling |
|---|---|---|
| Cuisine is messy | 114 distinct `food_type` values; 34 used by ≤2 restaurants; compound values ("Creole / Cajun / Southern", "Global, International"); near-duplicates (Steak 123 vs Steakhouse 328; Sushi vs Japanese; American vs Contemporary American) | Keep the original `food_type` for display/search, and add a normalised `cuisine` (smaller curated set) for the main facet. Possibly an array so "Creole / Cajun / Southern" matches all three. |
| Price fields disagree | JSON `price` (2/3/4) vs CSV `price_range` disagree on 220 records (4.4%) | Choose one source of truth; don't show conflicting info. Decision pending. |
| Rating without confidence | Stars 1.0–5.0 (most 4.0–4.7); reviews 1–12,669 (median 336); 70 restaurants have <10 reviews | Pre-compute a confidence-weighted (Bayesian) rating for custom ranking, so a 5.0 with 3 reviews doesn't outrank a 4.7 with 3,000. |
| Phone format | 2,668 JSON phones have a stray trailing `x` (e.g. `9198280018x`) | Use the CSV `phone_number` (already formatted, e.g. `(216) 378-8988`). |
| Chains | 207 brands have 2+ locations (Ruth's Chris 31, Buca di Beppo 29, Melting Pot 26, Benihana 24…). Locations are named "Brand – Location". 10 brand+city pairs have several locations in the same city (e.g. Cyclone Anaya's ×5 in Houston). | Split into `brand` + `location_label`. Show neighborhood/address in results; geo ranking picks the nearest location. Directly addresses the persona-1 pain point. |
| Neighborhood often = city | 2,491 records have `neighborhood == city` | Only display neighborhood when it adds information. |
| Name quirks | 3 names with stray whitespace; mix of ’ and ' apostrophes (19 vs 942); accents (Café, Wallsé, Tía Pol) | Trim names. Algolia already ignores accents and apostrophes when matching, so leave them as written. Verify in testing. |
| Payment options | "Diners Club" and "Carte Blanche" are legacy card types; 7 restaurants are "Cash Only" | Low discovery value; keep the field but probably no facet. |
| Images | Old `opentable.com/img/restimages/...` URLs; might no longer load | Check in the browser; fall back to a placeholder image. |

---

## 5. Index Configuration

<!-- Each setting and WHY. Keep in sync with the settings file in the repo. -->

### Searchable attributes

### Custom ranking

### Facets / filters

### Geo

### Typo tolerance & query behavior

### Synonyms

### Query Rules

---

## 6. Relevance Testing Log

<!-- Template:
| Date | Query / scenario | Expected | Observed | Change made | Result after |
|---|---|---|---|---|---|
-->

| Date | Query / scenario | Expected | Observed | Change made | Result after |
|---|---|---|---|---|---|

---

## 7. Challenges & Trade-offs

---

## 8. AI & Tool Usage

<!-- What was AI-assisted (Claude, Algolia AI Assist, docs), and what I verified or understood myself. -->

---

## 9. Debrief & Customer Call Prep

### Technical debrief talking points

### Mock customer call: discovery questions to ask

### Demo script / flow

### Anticipated questions (CTO / CPO)

---

## 10. Future Improvements (with more time)

---

## 11. Open Questions / TODO

---

## 12. Questions for Client

Questions only OpenTable can answer: data gaps, assumptions we made, and things that would change the design. Each one lists the assumption we're using in the meantime. Bring these to the mock customer call: they show we did the data work and they open a conversation. (Business/discovery questions live in §9.)

### Data quality & meaning
| # | Question | Why it matters | Our assumption until answered |
|---|---|---|---|
| Q1 | Which price field is authoritative: `price` (JSON) or `price_range` (CSV)? They disagree on 220 restaurants (4.4%). Is there a "$" tier? | Wrong prices hurt trust and filtering | CSV `price_range` |
| Q2 | Where do restaurant photos come from today? Every `image_url` in the export redirects to the default placeholder. | Photos are the biggest driver of discovery and click-through | Designed cards without photos |
| Q3 | How are `stars_count` / `reviews_count` calculated (all-time vs recent)? Can we get sub-ratings (food, service, ambiance) or review text? | Ranking quality; review text would enable richer search, including semantic (AI) search | All-time, comparable |
| Q4 | Is `food_type` chosen by the restaurant or by an editor? Is there an official cuisine list? Can a restaurant have several? | Cuisine is the main filter; 114 messy values today | One primary cuisine, mapped by us |
| Q5 | Is there a brand / restaurant-group ID for chains? | Clean grouping of chain locations (Ruth's Chris ×31) | Inferred from the name |
| Q6 | Why are some state codes wrong (e.g. San Francisco tagged `AL`)? Where are addresses maintained? | Location filters; fixing it at the source vs. in the pipeline | Fix in the pipeline |
| Q7 | What does "Home Style" mean as a dining style? | Filter labels must make sense to diners | Keep as-is |

### Data that would change the experience
| # | Question | Why it matters |
|---|---|---|
| Q8 | Can we access **real-time table availability** (date, time, party size)? | The biggest lever for search-to-booking conversion: only show restaurants that can actually seat you |
| Q9 | Do you have booking / popularity signals (bookings per week, trending)? | Better ranking, and the click/conversion events that Algolia's AI ranking features use |
| Q10 | Are there more attributes: opening hours, descriptions, menus, tags (outdoor seating, vegan options, kid-friendly, private dining)? | Discovery filters and inspiration ("rooftop brunch") |
| Q11 | US-only, or international and multi-language? | Index design, language settings |

### Integration
| # | Question | Why it matters |
|---|---|---|
| Q12 | How often does restaurant data change, and what's the system of record? Full exports or change events? | Indexing strategy (nightly full reindex vs. real-time partial updates) |
| Q13 | Which events can the front end send (search, click, booking)? Any privacy constraints? | Analytics, A/B testing, personalization, AI re-ranking |
