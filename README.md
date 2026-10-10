# OpenTable × Algolia: Restaurant Search & Discovery

A prototype of a modern restaurant search and discovery experience for OpenTable, built on Algolia.

**Live demo:** https://opentable-discovery-app.vercel.app/

> **Note on images:** card photos are *representative cuisine imagery* (Unsplash License), not the restaurants' own photos. Every `image_url` in the provided data redirects to OpenTable's generic placeholder; with OpenTable's photo feed these would be real restaurant photos.

---

## Approach

OpenTable's discovery notes describe two personas, and every feature maps to one of them:

| Persona | Pain points | What the demo does |
|---|---|---|
| **Knows what they want** | Hard-to-spell names, typos, chains with several locations in one city | Forgiving name search (typos, missing apostrophes, words run together, partial names, accents); every result shows its neighborhood and distance; chain cards link to "N locations" matching the current search |
| **Exploring** | Little support for browsing, refining or getting inspired | Discovery page with one-tap cuisine picks and curated rows (Top rated, Hidden gems, Date night, Great value); intent-aware search ("cheap mexican", "fine dining new york", "sushi sf"); filters, sorting, distance and favorites |

The business goal is search-to-booking conversion, so the whole funnel is instrumented: every click, favorite and **Reserve** sends an Algolia Insights event tied to the search that produced it (`queryID`). That data powers Analytics, Dynamic Re-Ranking and Personalization.

## Architecture

- **TypeScript end to end.** One record type (`src/types/restaurant.ts`) is shared by the data scripts and the UI.
- **Data pipeline:** Node scripts build clean records and apply the whole index configuration **as code** (`scripts/lib/index-config.ts`), so the index is reproducible and every setting is reviewable in git.
- **Frontend:** React + Vite + React InstantSearch, hosted on Vercel. There's no backend: the browser queries Algolia directly with a **search-only key** restricted to the restaurant indices, rate-limited per visitor and locked to the demo's domain. The admin key never leaves the indexing scripts.

## Data preparation (`npm run build:records`)

I treated the two files as a real customer export: profile first, fix only what the data proves, and turn everything else into questions for the client.

- **Join:** `restaurants_list.json` + `restaurants_info.csv` on `objectID` (number vs. string, normalised). 5,000 rows each, 1:1, no orphans; the script fails on any mismatch.
- **Cleanup:** trimmed names; 3 wrong state codes fixed (e.g. San Francisco tagged `AL`, confirmed by ZIP + city + coordinates); ZIP+4 → 5 digits; formatted phone numbers from the CSV (the JSON ones had a stray `x`); neighborhood dropped when it just repeats the city; dead image URLs dropped.
- **Assumption, documented:** the two price fields disagree on 220 restaurants with no pattern; I use the CSV `price_range` (the label diners see) and flagged it as a client question.
- **Enrichment for search:**
  - **Cuisines:** 114 messy `food_type` values → 70 clean cuisines (variants merged, compound values split), plus a region level for browsing (e.g. Asian → Thai) and tags for dishes and formats (Sushi, Pizza, Dim Sum). The original `food_type` stays searchable.
  - **`rating_score`:** a Bayesian average weighted by review count, so a 5.0 from 3 reviews (→ 4.3) doesn't outrank a 4.8 from 12,669.
  - **Chains:** a `brand` field, inferred conservatively (3+ locations, or 2 in the same metro) because name matching alone grouped unrelated restaurants.
- **Validation:** the build fails on duplicate IDs, unmapped cuisines, unknown prices or coordinates outside the US.

## Algolia configuration (`npm run push:index`)

| Setting | Choice | Why |
|---|---|---|
| Searchable attributes | `name` first, then cuisines/tags, neighborhood/city, metro, dining style, address | A name match should beat a cuisine or location match (persona 1) |
| Custom ranking | `rating_score`, then `reviews_count` | Quality tie-breakers; the score is rounded to one decimal so review count actually breaks ties |
| Geo | Ranked by distance in bands (`aroundPrecision`), never excluding far matches; browser location with IP fallback; metro presets | Within a band, a great restaurant beats a mediocre one 300 m closer |
| Facets | Cuisine region → cuisine, cuisine, price, dining style, metro, tags, plus `brand` for chain counts and `state` for filtering | Discovery filters with counts; facet order set in `renderingContent`, so it can change from the dashboard without a deploy |
| Language | English plurals + stop words; no typos on numbers | "steakhouses" = "steakhouse", "the melting pot" = "melting pot", "Seasons 52" ≠ "25" |
| Synonyms | 12 (bbq/barbecue, pub/gastropub, nyc/sf/nola, one-way sushi → japanese…) | Only gaps Algolia can't close natively |
| Query Rules | 24: cuisine and city detection, budget/upscale/expensive intent, "near me", city and state abbreviations | Turn intent words into filters instead of text matches |
| Sorting | 4 virtual replicas (top rated, most reviewed, price ↑↓), `relevancyStrictness: 0` | No extra records; strictness 0 so a sort isn't cut to the nearest distance band |

The upload uses `replaceAllObjects` (temporary index swapped in atomically), so a full refresh never shows a half-loaded index.

## Relevance testing (`npm run test:relevance`)

I didn't stop when search worked. A suite of **57 realistic queries** runs against the live index with the search-only key: known-item (typos, concatenation, accents, chains by location), discovery (cuisines, intents, neighborhoods, empty and gibberish queries) and **configuration regression tests** for bugs found in browser testing.

- **Round 1:** 28/31 → 32/32. **Round 2** (25 new tests): 51/57 → 57/57.
- Across both rounds, only **3 of 9 failures needed a search change** (city abbreviations, state abbreviations, an "expensive" intent rule). The others were mislabeled client data, queries that are genuinely ambiguous and that location resolves ("Upper East Side" exists in NYC *and* Miami), or a deliberate Algolia typo limit. Lesson: diagnose before tuning.

Every run, failure, diagnosis and fix is logged in `DevNotes.md` §6.

## Challenges and trade-offs

- **Chain detection without a brand ID:** names alone matched unrelated restaurants. I chose to miss some two-city chains rather than wrongly link restaurants, and asked the client for a brand ID.
- **Ranking vs. filtering:** the review-weighted score orders results, but the "4.0 and up" filter uses the stars the diner sees; otherwise a 3.0★ with 3 reviews (weighted 4.2) passed the filter.
- **Relevant sort and geo:** virtual replicas' default strictness kept only the nearest distance band (1 of 890 results), so sorted views use strictness 0 plus a default 50-mile radius that falls back to "anywhere" if it finds nothing.
- **A page freeze** from inline widget options: React InstantSearch compares widget options on each render, so inline functions rebuilt widgets endlessly. Moving them to module scope fixed it.
- **Free plan limits** (3 Query Rules) forced prioritisation; the account was upgraded to Grow Plus for the full rule set and AI features.

## With more time

- **Real-time table availability** (date, time, party size) in search: the biggest booking lever, but it needs OpenTable's availability data.
- **NeuralSearch** (Elevate plan) for descriptive queries ("romantic rooftop dinner").
- **Dynamic Re-Ranking, AI Synonyms and Personalization** trained on real traffic; the events pipeline is already in place.
- A **map view**, **autocomplete with Query Suggestions** and **ZIP code entry**.
- OpenTable's **official cuisine taxonomy, brand IDs and photo feed** instead of my mapping, heuristics and stock imagery.

## Questions for OpenTable

Things only OpenTable can answer: data gaps, the assumptions I made in the meantime, and data that would change the experience. The full list with reasoning is in `DevNotes.md` §12.

**Data quality (my assumption until answered)**

| # | Question | Assumption used |
|---|---|---|
| Q1 | Which price field is authoritative? `price` (JSON) and `price_range` (CSV) disagree on 220 restaurants, and there's no "$" tier. | CSV `price_range` |
| Q2 | Where do restaurant photos come from? Every `image_url` in the export redirects to a placeholder. | Representative cuisine imagery |
| Q3 | How are ratings and review counts calculated (all-time or recent)? Are sub-ratings or review text available? | All-time, comparable |
| Q4 | Who sets `food_type`? Is there an official cuisine taxonomy, and can a restaurant have several? | One primary cuisine, mapped by me (114 → 70) |
| Q5 | Is there a brand / restaurant-group ID for chains? | Inferred from names, conservatively |
| Q6 | Where are addresses maintained? Some state codes are wrong (San Francisco tagged `AL`). | Corrected in the pipeline |
| Q7 | What does the "Home Style" dining style mean? | Kept as-is |

**Data that would change the experience**

| # | Question | Why it matters |
|---|---|---|
| Q8 | Can search access **real-time table availability** (date, time, party size)? | The biggest booking lever: only show restaurants that can seat you |
| Q9 | Are booking or popularity signals available (bookings per week, trending)? | Better ranking; training data for Dynamic Re-Ranking |
| Q10 | Are there more attributes: hours, descriptions, menus, amenities (outdoor seating, private dining)? | Richer filters and inspiration ("rooftop brunch") |
| Q11 | US-only, or international and multi-language? | Index design and language settings |

**Integration**

| # | Question | Why it matters |
|---|---|---|
| Q12 | How often does restaurant data change, and what's the system of record (full exports or change events)? | Indexing strategy: nightly `replaceAllObjects` vs. real-time partial updates |
| Q13 | Which events can the front end send (search, click, booking), and are there privacy constraints? | Analytics, A/B testing, Personalization, AI re-ranking |
| Q14 | Can search use the logged-in diner's ID? | A stable `userToken` for Personalization; favorites stored on the account instead of the browser |

## How I used AI

I built this with an AI coding assistant (Claude) for speed: data exploration, scripts, configuration and UI code. Every decision was explained, challenged and chosen by me, and logged with its reasoning in `DevNotes.md` (decision log, data audit, relevance testing log, client questions), so I can walk through and defend each setting.

---

## Running it locally

```bash
nvm use                  # Node 24 (see .nvmrc)
npm install
# create .env with your Algolia keys (see below)
npm run check:algolia    # verify the keys work
npm run build:records    # join + clean raw data → data/processed/restaurants.json
npm run push:index       # configure the index and upload records (admin key)
npm run test:relevance   # run the 57-query relevance suite
npm run dev              # frontend at http://localhost:5173
```

`npm run push:index -- --only=rules` (or `settings`, `replicas`, `synonyms`, `records`) pushes just one part while tuning.

### Environment variables

Create a `.env` file in the project root (it's git-ignored) with values from Algolia dashboard → Settings → API Keys:

```
# Bundled into the browser (Vite only exposes VITE_-prefixed vars)
VITE_ALGOLIA_APP_ID=
# Search-only key: safe for the browser
VITE_ALGOLIA_SEARCH_KEY=
VITE_ALGOLIA_INDEX_NAME=restaurants

# Scripts only: no VITE_ prefix, so Vite never bundles it
ALGOLIA_ADMIN_KEY=
```

## Project structure

```
data/raw/          Original dataset as provided
data/processed/    Generated, cleaned records (git-ignored, rebuilt by build:records)
scripts/           Data exploration, record build, index push, relevance tests
scripts/lib/       Cuisine mapping, index configuration (settings, synonyms, rules)
src/components/    React UI (InstantSearch widgets and custom components)
src/lib/           Algolia client, location, distance, collections, favorites, styling helpers
src/types/         The shared Restaurant record type
public/cuisines/   Representative cuisine photos
DevNotes.md        Decision log, data audit, relevance testing log, client questions
```
