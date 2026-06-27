const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_SECRET_KEYS = [
    'PUMBLE_APP_ID',
    'PUMBLE_APP_KEY',
    'PUMBLE_APP_CLIENT_SECRET',
    'PUMBLE_APP_SIGNING_SECRET',
];

function secretFingerprint(value) {
    if (!value) {
        return '(empty)';
    }
    return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

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
            return filePath;
        } catch {
            // try next path
        }
    }

    console.warn('Warning: .pumbleapprc not found — using PUMBLE_APP_* from environment only');
    console.warn('After pre-publish, run: npm run sync-secrets and update root .env');
    return null;
}

const rcSource = loadPumbleAppRc();

const missing = APP_SECRET_KEYS.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Run: npx pumble-cli connect && npm run set-urls -- --host <your-url>');
    process.exit(1);
}

console.log(`Pumble app id: ${process.env.PUMBLE_APP_ID}`);
console.log(`Signing secret fingerprint: ${secretFingerprint(process.env.PUMBLE_APP_SIGNING_SECRET)}`);
if (rcSource) {
    const rc = JSON.parse(fs.readFileSync(rcSource, 'utf8'));
    const rcFp = secretFingerprint(rc.PUMBLE_APP_SIGNING_SECRET);
    const envFp = secretFingerprint(process.env.PUMBLE_APP_SIGNING_SECRET);
    if (rcFp !== envFp) {
        console.warn(`WARNING: signing secret fingerprint differs from ${rcSource} (${rcFp} vs ${envFp})`);
    }
}

const { patchPumbleSdk } = require('./patch-pumble-sdk.js');
try {
    patchPumbleSdk();
} catch (e) {
    console.warn('Could not patch pumble-sdk hook logging:', e.message);
}

process.env.PUMBLE_ADDON_PORT = process.env.PUMBLE_ADDON_PORT || '5500';
process.env.PUMBLE_ADDON_MANIFEST_PATH = process.env.PUMBLE_ADDON_MANIFEST_PATH || 'manifest.json';
process.env.PUMBLE_TOKENS_PATH = process.env.PUMBLE_TOKENS_PATH || '/app/data/tokens.json';
process.env.PUMBLE_ROOMS_PATH = process.env.PUMBLE_ROOMS_PATH || '/app/data/rooms.json';

require('../dist/main.js');
