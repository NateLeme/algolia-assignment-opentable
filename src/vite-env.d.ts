/// <reference types="vite/client" />

// Typed access to our VITE_ env vars (see README → Environment variables)
interface ImportMetaEnv {
  readonly VITE_ALGOLIA_APP_ID: string;
  readonly VITE_ALGOLIA_SEARCH_KEY: string;
  readonly VITE_ALGOLIA_INDEX_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
