# OpenTable × Algolia — Restaurant Search & Discovery

A prototype restaurant search and discovery experience built on Algolia, prepared as part of the Algolia Solutions Engineer hiring assignment.

> **Live demo:** https://algolia-assignment-opentable.vercel.app/
>
> 🚧 Full write-up of the approach to come.
>
> **Note on images:** card photos are *representative cuisine imagery* (Unsplash License), not the restaurants' own photos: every `image_url` in the provided data redirects to OpenTable's generic placeholder. With OpenTable's photo feed they would be replaced by real restaurant photos.

## Stack

- **TypeScript** end-to-end
- **Data prep & indexing:** Node + `tsx`, `algoliasearch` v5 (settings applied from code)
- **Frontend:** React + Vite + React InstantSearch
- **Hosting:** Vercel

## Getting started

```bash
nvm use            # Node 24 (see .nvmrc)
npm install
# create .env with your Algolia keys (see below)
npm run check:algolia  # verify the keys work
npm run build:records  # join + clean raw data → data/processed/restaurants.json
npm run dev            # start the frontend at http://localhost:5173
```

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
data/raw/        Original dataset as provided (restaurants_list.json, restaurants_info.csv)
data/processed/  Generated, cleaned records (git-ignored, rebuilt by scripts)
scripts/         Data preparation, indexing and settings scripts
src/             React frontend
DevNotes.md      Running log of decisions, relevance tests and learnings
```
