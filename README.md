# OpenTable × Algolia — Restaurant Search & Discovery

A prototype restaurant search and discovery experience built on Algolia, prepared as part of the Algolia Solutions Engineer hiring assignment.

> 🚧 Work in progress. Live demo link and full write-up to come.

## Stack

- **TypeScript** end-to-end
- **Data prep & indexing:** Node + `tsx`, `algoliasearch` v5 (settings applied from code)
- **Frontend:** React + Vite + React InstantSearch
- **Hosting:** Vercel

## Getting started

```bash
nvm use            # Node 24 (see .nvmrc)
npm install
cp .env.example .env   # then fill in your Algolia keys
npm run check:algolia  # verify the keys work
npm run dev            # start the frontend at http://localhost:5173
```

## Project structure

```
data/raw/        Original dataset as provided (restaurants_list.json, restaurants_info.csv)
data/processed/  Generated, cleaned records (git-ignored, rebuilt by scripts)
scripts/         Data preparation, indexing and settings scripts
src/             React frontend
DevNotes.md      Running log of decisions, relevance tests and learnings
```
