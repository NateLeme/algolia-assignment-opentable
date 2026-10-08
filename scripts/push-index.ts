/**
 * Step 2: Push records + configuration to Algolia.
 *
 * Reads data/processed/restaurants.json (run `npm run build:records` first) and
 * applies settings, replicas, synonyms and rules from scripts/lib/index-config.ts.
 *
 * Run:  npm run push:index            (records + config)
 *       npm run push:index -- --config-only   (config only, while tuning relevance)
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { algoliasearch } from 'algoliasearch';
import type { Restaurant } from '../src/types/restaurant';
import { indexName, replicaSettings, rules, settings, synonyms } from './lib/index-config';

const appId = process.env.VITE_ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
if (!appId || !adminKey) {
  console.error('❌ Missing VITE_ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY in .env');
  process.exit(1);
}

const client = algoliasearch(appId, adminKey);
const primary = indexName();
const configOnly = process.argv.includes('--config-only');

// Print only the API message on failure: the client's full error dump includes
// request headers, and with them the admin key.
const fail = (error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
};
process.on('uncaughtException', fail); // a failed top-level await lands here
process.on('unhandledRejection', fail);

const { taskID: settingsTask } = await client.setSettings({ indexName: primary, indexSettings: settings(primary) });
await client.waitForTask({ indexName: primary, taskID: settingsTask });
console.log('✅ Settings applied (incl. replica declarations)');

for (const [replica, replicaIndexSettings] of Object.entries(replicaSettings(primary))) {
  const { taskID } = await client.setSettings({ indexName: replica, indexSettings: replicaIndexSettings });
  await client.waitForTask({ indexName: replica, taskID });
  console.log(`   • ${replica}`);
}
console.log('✅ Replica sort orders applied');

// replaceExisting / clearExisting: the code is the single source of truth.
const { taskID: synonymsTask } = await client.saveSynonyms({
  indexName: primary, synonymHit: synonyms, replaceExistingSynonyms: true, forwardToReplicas: true,
});
await client.waitForTask({ indexName: primary, taskID: synonymsTask });
console.log(`✅ ${synonyms.length} synonyms`);

const { taskID: rulesTask } = await client.saveRules({
  indexName: primary, rules, clearExistingRules: true, forwardToReplicas: true,
});
await client.waitForTask({ indexName: primary, taskID: rulesTask });
console.log(`✅ ${rules.length} rules`);

if (!configOnly) {
  const records: Restaurant[] = JSON.parse(readFileSync('data/processed/restaurants.json', 'utf8'));
  // replaceAllObjects writes to a temporary index, copies the primary's settings,
  // synonyms and rules onto it, then swaps it in atomically: users never see a
  // half-loaded or empty index. Runs last because the primary (and its config) must
  // already exist; on a brand-new app the copy step otherwise never completes.
  await client.replaceAllObjects({ indexName: primary, objects: records as unknown as Record<string, unknown>[], batchSize: 1000 });
  console.log(`✅ ${records.length} records → ${primary}`);
}
