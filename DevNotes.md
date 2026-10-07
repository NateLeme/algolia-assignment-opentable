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

## 2. Decision Log

### 2026-10-06: Project scaffold, Node version, key handling
- **Context:** Starter project is outdated (Parcel 1, Node 9). Local Node was 20.12 — Node 20 reached end-of-life in April 2026, and Vite 7 needs Node ≥ 20.19 / 22.12.
- **Decision:** Fresh single-package repo (Vite + React + TS) with `scripts/` for data/indexing and `data/raw/` holding the untouched dataset. Upgrade to Node 24 LTS (pinned in `.nvmrc`). Env vars split: `VITE_`-prefixed (App ID, search-only key, index name) are bundled into the browser; `ALGOLIA_ADMIN_KEY` has no prefix so Vite never bundles it, and it's only read by local scripts via `dotenv`. `.env` is git-ignored; `.env.example` documents required vars.
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

## 3. Data Preparation

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

## 4. Index Configuration

<!-- Each setting and WHY. Keep in sync with the settings file in the repo. -->

### Searchable attributes

### Custom ranking

### Facets / filters

### Geo

### Typo tolerance & query behavior

### Synonyms

### Query Rules

---

## 5. Relevance Testing Log

<!-- Template:
| Date | Query / scenario | Expected | Observed | Change made | Result after |
|---|---|---|---|---|---|
-->

| Date | Query / scenario | Expected | Observed | Change made | Result after |
|---|---|---|---|---|---|

---

## 6. Challenges & Trade-offs

---

## 7. AI & Tool Usage

<!-- What was AI-assisted (Claude, Algolia AI Assist, docs), and what I verified or understood myself. -->

---

## 8. Debrief & Customer Call Prep

### Technical debrief talking points

### Mock customer call: discovery questions to ask

### Demo script / flow

### Anticipated questions (CTO / CPO)

---

## 9. Future Improvements (with more time)

---

## 10. Open Questions / TODO
