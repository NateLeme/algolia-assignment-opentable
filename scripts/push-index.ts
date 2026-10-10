/**
 * Step 2 (relevance): push records + configuration to Algolia.
 *
 * Reads data/processed/restaurants.json (run `npm run build:records` first) and
 * applies settings, replicas, synonyms and rules from scripts/lib/index-config.ts.
 *
 * Run:  npm run push:index                        (everything)
 *       npm run push:index -- --config-only        (everything except records)
 *       npm run push:index -- --only=rules         (just the parts named, comma-separated:
 *                                                    settings, replicas, synonyms, rules, records)
 *
 * While tuning, push only what changed: each part is a separate Algolia task to wait on.
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

const PARTS = ['settings', 'replicas', 'synonyms', 'rules', 'records'] as const;
type Part = (typeof PARTS)[number];
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const requested = onlyArg
  ? onlyArg.slice('--only='.length).split(',').map((p) => p.trim())
  : PARTS.filter((p) => !(p === 'records' && process.argv.includes('--config-only')));
const unknown = requested.filter((p) => !PARTS.includes(p as Part));
if (unknown.length) {
  console.error(`❌ Unknown part(s): ${unknown.join(', ')}. Use: ${PARTS.join(', ')}`);
  process.exit(1);
}
const run = (part: Part) => requested.includes(part);
console.log(`Pushing: ${requested.join(', ')}`);

// Print only the API message on failure: the client's full error dump includes
// request headers, and with them the admin key.
const fail = (error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
};
process.on('uncaughtException', fail); // a failed top-level await lands here
process.on('unhandledRejection', fail);

if (run('settings')) {
  const { taskID } = await client.setSettings({ indexName: primary, indexSettings: settings(primary) });
  await client.waitForTask({ indexName: primary, taskID });
  console.log('✅ Settings applied (incl. replica declarations)');
}

if (run('replicas')) {
  for (const [replica, replicaIndexSettings] of Object.entries(replicaSettings(primary))) {
    const { taskID } = await client.setSettings({ indexName: replica, indexSettings: replicaIndexSettings });
    await client.waitForTask({ indexName: replica, taskID });
    console.log(`   • ${replica}`);
  }
  console.log('✅ Replica sort orders applied');
}

// replaceExisting / clearExisting: the code is the single source of truth.
if (run('synonyms')) {
  const { taskID } = await client.saveSynonyms({
    indexName: primary, synonymHit: synonyms, replaceExistingSynonyms: true, forwardToReplicas: true,
  });
  await client.waitForTask({ indexName: primary, taskID });
  console.log(`✅ ${synonyms.length} synonyms`);
}

if (run('rules')) {
  const { taskID } = await client.saveRules({
    indexName: primary, rules, clearExistingRules: true, forwardToReplicas: true,
  });
  await client.waitForTask({ indexName: primary, taskID });
  console.log(`✅ ${rules.length} rules`);
}

if (run('records')) {
  const records: Restaurant[] = JSON.parse(readFileSync('data/processed/restaurants.json', 'utf8'));
  // replaceAllObjects writes to a temporary index, copies the primary's settings,
  // synonyms and rules onto it, then swaps it in atomically: users never see a
  // half-loaded or empty index. Runs last because the primary (and its config) must
  // already exist; on a brand-new app the copy step otherwise never completes.
  await client.replaceAllObjects({ indexName: primary, objects: records as unknown as Record<string, unknown>[], batchSize: 1000 });
  console.log(`✅ ${records.length} records → ${primary}`);
}
