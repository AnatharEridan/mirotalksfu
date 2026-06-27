#!/usr/bin/env node
/**
 * Show Events URL and slash commands registered in Pumble for this app.
 * Requires: npx pumble-cli login, .pumbleapprc with PUMBLE_APP_ID
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const globalRc = path.join(os.homedir(), '.pumblerc');
const localRc = path.resolve('.pumbleapprc');

if (!fs.existsSync(globalRc) || !fs.existsSync(localRc)) {
    console.error('Need ~/.pumblerc (pumble-cli login) and .pumbleapprc (pumble-cli connect)');
    process.exit(1);
}

const globalEnv = loadJson(globalRc);
const localEnv = loadJson(localRc);
const appId = localEnv.PUMBLE_APP_ID;
const apiUrl = (globalEnv.PUMBLE_API_URL || 'https://api-ga.pumble.com').replace(/\/+$/, '');
const workspaceId = globalEnv.PUMBLE_WORKSPACE_ID;
const workspaceUserId = globalEnv.PUMBLE_WORKSPACE_USER_ID;
const token = globalEnv.PUMBLE_ACCESS_TOKEN;

async function main() {
    const url = `${apiUrl}/workspaces/${workspaceId}/workspaceUsers/${workspaceUserId}/apps/mine/${appId}`;
    const res = await fetch(url, { headers: { Authtoken: token } });
    if (!res.ok) {
        console.error('Pumble API error', res.status, await res.text());
        process.exit(1);
    }
    const app = await res.json();

    console.log('Pumble app (remote):\n');
    console.log('  name:', app.name);
    console.log('  id:', app.id);
    console.log('  published:', app.published);
    console.log('');
    console.log('  Events URL:', app.eventSubscriptions?.url || '(none)');
    console.log('  botScopes:', (app.scopes?.botScopes || []).join(', '));
    console.log('');
    console.log('  Slash commands:');
    for (const cmd of app.slashCommands || []) {
        console.log(`    ${cmd.command} -> ${cmd.url}`);
        console.log(`      ${cmd.description || ''}`);
    }
    console.log('');
    const eventsUrl = app.eventSubscriptions?.url || '';
    const expected = 'https://secondmeet.devilgate-dev.ru/hook';
    if (!eventsUrl) {
        console.log('FIX: Events URL is missing — Pumble cannot reach your bot.');
        console.log('  npm run set-urls -- --host https://secondmeet.devilgate-dev.ru');
    } else if (!eventsUrl.includes('secondmeet.devilgate-dev.ru')) {
        console.log('WARNING: Events URL does not point to secondmeet.devilgate-dev.ru');
        console.log(`  Expected like: ${expected}`);
        console.log('  Fix: npm run set-urls -- --host https://secondmeet.devilgate-dev.ru');
    } else {
        console.log('Events URL host looks OK.');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
