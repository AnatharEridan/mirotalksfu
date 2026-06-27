#!/usr/bin/env node
/**
 * Compare Pumble app secrets in .env vs .pumbleapprc (common cause of /hook 403).
 */

const fs = require('fs');
const path = require('path');

const keys = ['PUMBLE_APP_ID', 'PUMBLE_APP_KEY', 'PUMBLE_APP_CLIENT_SECRET', 'PUMBLE_APP_SIGNING_SECRET'];

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    const out = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq === -1) {
            continue;
        }
        out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
    return out;
}

const rootEnv = parseEnvFile(path.resolve(process.argv[2] || '../.env'));
const rcPath = path.resolve('.pumbleapprc');

if (!fs.existsSync(rcPath)) {
    console.error('Missing .pumbleapprc — run: npx pumble-cli connect');
    process.exit(1);
}

const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));

console.log('Pumble secrets check:\n');

let mismatch = false;
for (const key of keys) {
    const envVal = rootEnv[key] || '(missing)';
    const rcVal = rc[key] || '(missing)';
    const ok = envVal === rcVal && envVal !== '(missing)';
    if (!ok) {
        mismatch = true;
    }
    const mark = ok ? 'OK' : 'MISMATCH';
    console.log(`${key}: ${mark}`);
    if (!ok) {
        console.log(`  .env:         ${mask(envVal)}`);
        console.log(`  .pumbleapprc: ${mask(rcVal)}`);
    }
}

console.log('');
if (mismatch) {
    console.log('Fix: run `npm run sync-secrets` and update root .env, then:');
    console.log('  docker compose up -d pumble-mirotalk');
    console.log('');
    console.log('Or pull latest image and mount .pumbleapprc (see docker-compose.template.yml).');
    process.exit(1);
}

console.log('Secrets match. If /mirotalk still fails, check Events URL:');
console.log('  npx pumble-cli pre-publish --host https://secondmeet.devilgate-dev.ru');
console.log('  Events URL must be https://secondmeet.devilgate-dev.ru/hook');

function mask(value) {
    if (!value || value === '(missing)') {
        return value;
    }
    if (value.length <= 8) {
        return '***';
    }
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
