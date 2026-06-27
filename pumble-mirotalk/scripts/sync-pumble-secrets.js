#!/usr/bin/env node
/**
 * Print PUMBLE_APP_* lines from .pumbleapprc for the root .env file.
 * After pre-publish, signing secret may change — stale .env breaks /hook (403).
 *
 * Usage: node scripts/sync-pumble-secrets.js
 */

const fs = require('fs');
const path = require('path');

const rcPath = path.resolve('.pumbleapprc');
if (!fs.existsSync(rcPath)) {
    console.error('Missing .pumbleapprc — run: npx pumble-cli connect');
    process.exit(1);
}

const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
const keys = ['PUMBLE_APP_ID', 'PUMBLE_APP_KEY', 'PUMBLE_APP_CLIENT_SECRET', 'PUMBLE_APP_SIGNING_SECRET'];

console.log('# Paste into /opt/mirotalksfu/.env (replace existing PUMBLE_APP_* lines):\n');
for (const key of keys) {
    if (rc[key]) {
        console.log(`${key}=${rc[key]}`);
    }
}
console.log('\nThen: docker compose up -d pumble-mirotalk');
