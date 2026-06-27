const fs = require('fs');
const path = require('path');

const APP_SECRET_KEYS = [
    'PUMBLE_APP_ID',
    'PUMBLE_APP_KEY',
    'PUMBLE_APP_CLIENT_SECRET',
    'PUMBLE_APP_SIGNING_SECRET',
];

function loadPumbleAppRc() {
    const candidates = [
        process.env.PUMBLE_APP_RC_PATH,
        path.join(__dirname, '..', '.pumbleapprc'),
        '/app/.pumbleapprc',
    ].filter(Boolean);

    for (const filePath of candidates) {
        try {
            const rc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            for (const key of APP_SECRET_KEYS) {
                if (rc[key]) {
                    process.env[key] = rc[key];
                }
            }
            console.log(`Loaded Pumble app secrets from ${filePath}`);
            return;
        } catch {
            // try next path
        }
    }

    console.warn('Warning: .pumbleapprc not found — using PUMBLE_APP_* from environment only');
    console.warn('After pre-publish, run: npm run sync-secrets and update root .env');
}

loadPumbleAppRc();

const missing = APP_SECRET_KEYS.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Run: npx pumble-cli connect && npx pumble-cli pre-publish --host <your-url>');
    console.error('Or copy values from pumble-mirotalk/.pumbleapprc into the root .env');
    process.exit(1);
}

process.env.PUMBLE_ADDON_PORT = process.env.PUMBLE_ADDON_PORT || '5500';
process.env.PUMBLE_ADDON_MANIFEST_PATH = process.env.PUMBLE_ADDON_MANIFEST_PATH || 'manifest.json';
process.env.PUMBLE_TOKENS_PATH = process.env.PUMBLE_TOKENS_PATH || '/app/data/tokens.json';
process.env.PUMBLE_ROOMS_PATH = process.env.PUMBLE_ROOMS_PATH || '/app/data/rooms.json';

require('../dist/main.js');
