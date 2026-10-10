/**
 * Setup check: can we reach Algolia with the keys in .env?
 *
 * Run:  npm run check:algolia
 *
 * Uses the ADMIN key (read from .env, never bundled into the frontend) to list
 * the indices in the application. A fresh app will simply list zero indices.
 */
import 'dotenv/config';
import { algoliasearch } from 'algoliasearch';

const appId = process.env.VITE_ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;

if (!appId || !adminKey) {
  console.error('❌ Missing VITE_ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY in .env');
  process.exit(1);
}

const client = algoliasearch(appId, adminKey);

try {
  const { items } = await client.listIndices();
  console.log(`✅ Connected to Algolia app ${appId}`);
  console.log(`   Indices found: ${items.length}`);
  for (const index of items) {
    console.log(`   • ${index.name} (${index.entries} records)`);
  }
} catch (error) {
  console.error('❌ Could not connect to Algolia:', error);
  process.exit(1);
}
