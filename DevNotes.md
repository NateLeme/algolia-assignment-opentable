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
| Live demo | https://algolia-assignment-opentable.vercel.app/ |
| Algolia app / index | Free (Build) plan · index `restaurants` |

---

## 2. Dev Log

Personal progress log, one short line per step: which step, why it matters, and what was done. Newest at the top.

| Date | Step | Entry |
|---|---|---|
| 2026-10-09 | 5: Ship (deploy) | To make the demo public safely, created a dedicated search-only public key (restaurants indices only, 1,000 searches per visitor per hour, max 100 hits, locked to the Vercel URL; verified other origins get 403) and deployed to Vercel at https://algolia-assignment-opentable.vercel.app/ with auto-redeploy on push. |
| 2026-10-09 | 2: Relevance tuning (round 2) | To test realistic queries and lock in today's bug fixes, expanded the suite to 57 (incl. 7 configuration regression tests); baseline 51/57, then fixed state abbreviations ("steakhouse tx") and "expensive" intent with rules and corrected 4 over-strict tests, now 57/57. |
| 2026-10-09 | 3: Frontend (UI polish) | To make discovery feel curated and lead somewhere, removed duplicate restaurants across discovery rows, hid row scrollbars behind hover arrows, tidied spacing/type, and added a "See all N" tile per row that opens the full results with the row's exact filter (shown as a chip; Top rated also sorts by rating). |
| 2026-10-09 | 3: Frontend (UI polish) | To make the demo look like a modern OpenTable product, made the OpenTable wordmark prominent (removed "× Algolia"), shortened the search placeholder, added a "Find your next table" hero with one-tap cuisine chips (exact cuisine filter), slimmed card banners to a cuisine icon and color, and moved rating · price · cuisine right under the name. |
| 2026-10-09 | 3: Frontend (mobile + sort fixes) | To make the demo work on phones, added a 2-row header, compact horizontal cards and a full-screen Filters sheet; fixed filter panels vanishing on sorts (replicas don't inherit `renderingContent`, now shared with every replica) and made the sort's 50-mile default fall back to any distance with a notice when it finds nothing. |
| 2026-10-09 | 3: Frontend (browser test) | To make sorting useful, fixed "Top rated"/price sorts returning 1 result: virtual replicas' default relevancy strictness (100%) treated distance as relevance and kept only the nearest band, so set strictness to 0% and auto-apply a 50-mile radius when a sort is picked; confirmed booking events (conversion with queryID) reach Algolia. |
| 2026-10-08 | 3: Frontend (browser test) | To make chain links accurate, the "N locations" link now filters by the exact brand (a text search let the cuisine rule pull in Morton's Grille) and shows a live count for the current search and filters (`brand` made countable in the index). |
| 2026-10-08 | 3: Frontend (browser test) | To keep active filters visible on the discovery page, moved the chips row above the discovery rows, and raised the distance slider to 300 miles so its "150 miles" midpoint label is accurate. |
| 2026-10-08 | 3: Frontend (browser test) | To let diners limit how far they'll travel, added a distance slider (1–150 miles + Any) below Rating that sets Algolia's `aroundRadius` (a geo parameter, not a facet) and only searches once the slider stops; also removed the duplicate × in search boxes and simplified distance labels to "miles" with the place named on the slider. |
| 2026-10-08 | 3: Frontend (browser test) | To make location useful for any diner, replaced 7 hard-coded cities with all 51 metro areas generated from the data, built a custom typable dropdown, hid distances measured from a metro's center, and made the first discovery row say "Top rated in <metro>". |
| 2026-10-08 | 3: Frontend (browser test) | To make filters clear at a glance, fixed price chips showing "2/3/4" instead of "$$" labels and the selected cuisine region not being highlighted (CSS targeted the wrong element). |
| 2026-10-08 | 3: Frontend (browser test) | To make result cards accurate and uncluttered, fixed every card showing "31 mi" (it displayed Algolia's ranking distance band instead of the real distance) and hid the redundant "N locations" link when all visible results are the same chain. |
| 2026-10-08 | 3: Frontend (browser test) | To make the prototype usable, started browser testing and fixed a page freeze on any interaction: inline functions passed to InstantSearch widgets looked "changed" on every render and triggered an endless rebuild loop, so they were moved to module scope (confirmed fixed in Chrome). |
| 2026-10-08 | 2: Relevance tuning (round 1) | To fix the 3 baseline failures, diagnosed each: added "sf"/"nyc" city-filter rules (search fix), accepted "steak" name matches (client data mislabels Steak House No. 316 as American), and tested "upper east side" from Manhattan and Miami (the neighborhood exists in both, so location decides); now 32/32 pass. |
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

How to reproduce: `npm run test:relevance` (add `-v` for the top 5 per query). The suite lives in `scripts/test-relevance.ts`. It uses the search-only key, so it tests exactly what the browser gets.

### Runs

| Date | Run | Result | Notes |
|---|---|---|---|
| 2026-10-09 | Round 2 (after fixes below) | **57/57** | 1 settings + 1 rules push (`--only=settings,rules`); 4 tests adjusted, 2 search fixes; tricky cases still pass ("italian **in** brooklyn" not caught by a state rule, "**texas** de brasil" still finds Texas de Brazil) |
| 2026-10-09 | Expanded suite baseline: +25 tests (7 known-item, 11 discovery, 7 configuration regression) | **51/57** | All 32 original + all 7 config tests passed; 6 new failures diagnosed below |
| 2026-10-09 | Regression check after index changes (countable `brand`, `maxValuesPerFacet` 200, replica `relevancyStrictness` 0 + shared `renderingContent`) | **32/32** | Hit counts and applied rules identical to round 1; no relevance impact |
| 2026-10-08 | Round 1 (after fixes below) | **32/32** | 1 rules-only push (`--only=rules`, 15 s); 1 test added (UES from Miami) |
| 2026-10-08 | Baseline (first config, 5 rules, 12 synonyms) | **28/31** | All 14 known-item (persona 1) tests passed first time: typos, missing apostrophes, concatenation, prefixes, accents, chains by location |

### Failures and fixes

| Date | Query / scenario | Expected | Observed | Diagnosis | Change made | Result after |
|---|---|---|---|---|---|---|
| 2026-10-09 | `steakhouse tx` | Top 10 Texas steakhouses | Steakhouses everywhere | `state` wasn't searchable or filterable | **Search fix:** `filterOnly(state)` + 16 state-abbreviation rules (`state-tx` …). Codes that are common words or name tokens excluded (IN, OR, LA, CO, MT "Mt.", NM "NM Cafe"…), and full names excluded ("Texas de Brazil") | ✅ 77 Texas steakhouses |
| 2026-10-09 | `expensive italian` | Top 10 $$$$ Italian | $$ Italian first | No rule for "expensive": the word matched nothing and `removeWordsIfNoResults` dropped it | **Search fix:** `intent-expensive` rule (expensive/pricey/splurge/high end/luxury → `price = 4`) | ✅ 16 $$$$ Italian |
| 2026-10-09 | `nubo` | Nobu #1 | Not found | "nubo" → "nobu" is 2 edits; Algolia allows 1 typo for 4–7 letter words, which avoids false matches on short names | **Test fix:** `nobo` (1 typo); documented as a deliberate limit | ✅ |
| 2026-10-09 | `dim sum` | Yank Sing #1 | ZINE Noodles **Dim Sum** #1 | A name match outranks a tag match (attribute priority): correct | **Test fix:** accept tag or name | ✅ |
| 2026-10-09 | `asian` | Top 10 Asian region | #7 SOHO **Asian** Bar & Grill (cuisine: Kosher) | Name match is correct; the client data labels the cuisine Kosher | **Test fix:** accept region or name | ✅ |
| 2026-10-09 | `bay area` (no location) | Top 10 SF Bay Area | Houston results first | Houston has a "Bay Area" neighborhood (Clear Lake): ambiguous, like UES | **Test fix:** run from San Francisco | ✅ |
| 2026-10-08 | `sushi sf` | Top 5 Japanese in San Francisco | 11 hits incl. San Jose, Millbrae | The "sf" synonym matched the text, but the `detect-city` rule only recognizes full city names, so no city filter was applied and Bay Area restaurants mentioning "San Francisco" came through | **Search fix:** rules `city-abbr-sf` / `city-abbr-nyc` turn "sf"/"nyc" into a city filter and remove the word | ✅ 7 hits, all San Francisco |
| 2026-10-08 | `steak house` | Top 10 Steakhouse | #1 "Steak House No. 316" (cuisine: American) | Correct name match (name is the top-priority attribute); the client data mislabels the cuisine | **Test fix:** accept Steakhouse cuisine *or* "steak" in name. No config change: demoting a correct name match to hide bad data would be wrong (Client Q4) | ✅ |
| 2026-10-08 | `upper east side` (no location) | Top 10 in NYC Upper East Side | #6 Ni. Do. Caffé, Miami ("MiMo / Upper East Side") | Not a bug: the neighborhood exists in both cities; with no location, equal matches are ordered by rating | **Test fix:** run from Manhattan (realistic) + new test from Miami | ✅ Manhattan: top 10 all NYC · Miami: Ni. Do. Caffé #1 |

**Takeaway for the debrief:** across both rounds, only 3 of 9 failures needed a search change; the rest were client-data labels, ambiguous queries that location resolves, or a deliberate typo limit. Diagnose before tuning.

_Round 1:_ only 1 of the 3 failures needed a search change. The other two were a data-quality issue and an ambiguous query that location resolves. Diagnose before tuning.

### Frontend browser test findings

| Date | Action | Expected | Observed | Diagnosis | Fix | Status |
|---|---|---|---|---|---|---|
| 2026-10-08 | Typed `rutss cris` (IP location) | Each card shows its real distance | Every card shows **"31 mi"** | Card read `_rankingInfo.geoDistance`, which is the *ranking* distance rounded to our `aroundPrecision` band (≥50 km → 50,000 m ≈ 31 mi). The real distance is `_rankingInfo.matchedGeoLocation.distance` (e.g. 204 km for Indianapolis). Ranking order was correct. | Show `matchedGeoLocation.distance` on cards | ✅ Fixed (23bbcea), confirmed in Chrome |
| 2026-10-08 | Typed `rutss cris` | "N locations" link helps find other branches | Every card shows **"31 locations"**, which is redundant when all results are already that chain | The link is shown whenever a restaurant is part of a chain, regardless of what's on screen | Hide the link when all visible results are the same brand | ✅ Fixed (23bbcea), confirmed in Chrome |
| 2026-10-08 | Selected a price filter | Chip reads "$$ · under $30" | Chip reads "2" | The price labels were applied only to the filter list; the active-filter chips showed the raw tier value | Shared `PRICE_LABELS` (`src/lib/labels.ts`) applied to the chips too | ✅ Fixed (dc5a356), confirmed in Chrome |
| 2026-10-08 | Selected a cuisine region | Selected region highlighted | No highlight | CSS targeted a wrapper element the HierarchicalMenu doesn't render | Style the library's `ais-HierarchicalMenu-link--selected` class | ✅ Fixed (dc5a356), confirmed in Chrome |
| 2026-10-08 | Location picker (browser test step 3) | Useful way to change location | Only 7 hand-picked cities; distances from a city's center point (0.5–3 mi) weren't meaningful; first row always said "near you"; dropdown not typable | Presets were demo shortcuts hard-coded in the frontend | All 51 metro areas generated from the data (`src/data/metros.json`, center = median restaurant coordinate); distance hidden when a metro is picked; first row reads "Top rated in <metro>"; custom typable dropdown (`LocationPicker.tsx`) | ✅ Confirmed in Chrome |
| 2026-10-08 | Typing in the search box | One clear (×) button | Two × buttons: a blue one and a gray one | Chrome adds its own clear button to search inputs, on top of InstantSearch's reset button | Hide the browser's built-in button with CSS (`::-webkit-search-cancel-button`) | ✅ Confirmed in Chrome |
| 2026-10-08 | Set distance on the discovery page | Distance chip visible | Chip appeared below the 4 discovery rows | Chips row lived inside the "All restaurants" results section | Moved to `ActiveFilters.tsx` at the top of the content area | ✅ Confirmed in Chrome |
| 2026-10-08 | Distance slider scale | Labels match positions | "150 miles" shown mid-bar while 150 was the maximum | Middle label was the max value | Max raised to 300 miles; middle label = max / 2 | ✅ Confirmed in Chrome |
| 2026-10-08 | Clicked "13 locations" (Morton's The Steakhouse) | Only that chain | Morton's Grille also shown | The link ran a *text* search for the brand: the `detect-cuisine` rule turned "Steakhouse" into a cuisine filter, leaving "morton's" to match Morton's Grille | Link applies an exact `brand` filter instead (chip "Chain: …") | ✅ Confirmed in Chrome |
| 2026-10-08 | "N locations" with distance/filters set | Count matches what clicking shows | Always the chain's total (e.g. 13 when only 2 are within 50 miles) | Count was precomputed at build time | `brand` made countable (`attributesForFaceting`, `maxValuesPerFacet` 200); live facet counts per brand; click keeps search + filters | ✅ Confirmed in Chrome |
| 2026-10-09 | No results (gibberish, filter + query) | Helpful recovery | Suggestions work; "Search without filters" keeps the query by design | — | — | ✅ Passed |
| 2026-10-09 | Reserve button | Opens OpenTable + sends booking event | Old URL redirects to OpenTable's current restaurant page; conversion event "Restaurant Booked" with `queryID` seen in the Events debugger | — | — | ✅ Passed |
| 2026-10-09 | Sort "Top rated" / price, Houston + "italian" | Sorted list of Houston Italian | Only 1 result for every sort | Virtual replicas use *relevant sort*; default `relevancyStrictness` 100 keeps only the most relevant hits, and distance counts as relevance → only the nearest distance band (1 of 890) | Strictness 0 on replicas + 50-mile default radius when a sort is picked with distance "Any" | ✅ Confirmed in Chrome |
| 2026-10-09 | Mobile view (375 px) | Usable on a phone | Header 3 rows (~235 px), ~1.5 cards per screen, filter panel below all results | Desktop layout stacked on small screens | 2-row header, compact horizontal cards (~3–4 per screen), "Filters" button opening a full-screen sheet with "Show N restaurants" | ✅ Confirmed in Chrome |
| 2026-10-09 | Changed sort (Houston, "italian") | Filter panels stay | Only Rating and Distance left | Sort replicas didn't have `renderingContent`; DynamicWidgets shows no panels without a facet order | One shared `renderingContent` for primary + all replicas | ✅ Confirmed in Chrome |
| 2026-10-09 | Changed sort with IP-based location | Useful sorted results | 0 results: the auto 50-mile radius around the IP estimate had no matches | Auto default applied blindly | Auto radius is "soft": reverts to any distance on 0 results and shows a notice; diner-set distances are never undone | ✅ Confirmed in Chrome |
| 2026-10-08 | Typing / clicking any filter | Results update | Page froze | Inline widget options rebuilt widgets on every render (see Dev Log) | Hoisted to module scope | ✅ Fixed (929a03a) |


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

### Nice to have
- **ZIP code entry in the location picker** (2026-10-08): an extra row where the diner types a ZIP, which is validated (5 digits + exists) and re-centers the search there. Planned data source: the free US Census ZIP (ZCTA) list, ~33K ZIPs with center coordinates (~1 MB, one-time download, works offline, no API cost). Rejected alternatives: ZIPs from our own data (only 1,561, so real ZIPs without restaurants would be "invalid"), and paid geocoding (Google/Mapbox). In production OpenTable would use its existing address/location service; any coordinates plug into Algolia's `aroundLatLng`.

---

## 11. Open Questions / TODO

- [x] **Branding (requested 2026-10-09, done 2026-10-09):** remove "× Algolia" from the header and make the OpenTable brand more prominent, on desktop and mobile.

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
