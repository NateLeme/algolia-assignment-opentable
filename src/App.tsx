// Placeholder screen for Step 1 (scaffold). It only confirms the app builds
// and that the browser-safe env vars are being picked up. The real search UI
// comes after data prep + indexing.

const env = import.meta.env;

const checks: Array<[label: string, ok: boolean]> = [
  ['VITE_ALGOLIA_APP_ID', Boolean(env.VITE_ALGOLIA_APP_ID)],
  ['VITE_ALGOLIA_SEARCH_KEY', Boolean(env.VITE_ALGOLIA_SEARCH_KEY)],
  ['VITE_ALGOLIA_INDEX_NAME', Boolean(env.VITE_ALGOLIA_INDEX_NAME)],
];

export default function App() {
  return (
    <main className="placeholder">
      <h1>OpenTable × Algolia</h1>
      <p>Scaffold is running. Search UI coming soon.</p>
      <ul>
        {checks.map(([label, ok]) => (
          <li key={label}>
            {ok ? '✅' : '❌'} <code>{label}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
