const fs = require('fs');
const path = require('path');

const rcPath = path.join(__dirname, '..', '.pumbleapprc');
if (fs.existsSync(rcPath)) {
    Object.assign(process.env, JSON.parse(fs.readFileSync(rcPath, 'utf8')));
}

process.env.PUMBLE_ADDON_PORT = process.env.PUMBLE_ADDON_PORT || '5501';
process.env.PUMBLE_ADDON_MANIFEST_PATH = process.env.PUMBLE_ADDON_MANIFEST_PATH || 'manifest.dev.json';

require('../dist/main.js');
