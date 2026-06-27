const required = ['PUMBLE_APP_ID', 'PUMBLE_APP_KEY', 'PUMBLE_APP_CLIENT_SECRET', 'PUMBLE_APP_SIGNING_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

process.env.PUMBLE_ADDON_PORT = process.env.PUMBLE_ADDON_PORT || '5500';
process.env.PUMBLE_ADDON_MANIFEST_PATH = process.env.PUMBLE_ADDON_MANIFEST_PATH || 'manifest.json';
process.env.PUMBLE_TOKENS_PATH = process.env.PUMBLE_TOKENS_PATH || '/app/data/tokens.json';
process.env.PUMBLE_ROOMS_PATH = process.env.PUMBLE_ROOMS_PATH || '/app/data/rooms.json';

require('../dist/main.js');
