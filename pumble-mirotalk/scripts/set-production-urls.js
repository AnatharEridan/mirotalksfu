#!/usr/bin/env node
/**
 * Register production hook/redirect URLs in Pumble (fixes Events URL: none).
 * Use when pre-publish did not run or was cancelled.
 *
 *   node scripts/set-production-urls.js --host https://secondmeet.devilgate-dev.ru
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
    const args = { host: process.env.PUMBLE_ADDON_PUBLIC_URL || '' };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--host' && argv[i + 1]) {
            args.host = argv[++i];
        }
    }
    return args;
}

function absUrl(host, pathname) {
    return `${host.replace(/\/+$/, '')}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

async function main() {
    const { host: hostArg } = parseArgs(process.argv);
    const host = String(hostArg || '').replace(/\/+$/, '');
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
        console.error('Usage: node scripts/set-production-urls.js --host https://your-domain.com');
        process.exit(1);
    }

    const globalRc = path.join(os.homedir(), '.pumblerc');
    const localRc = path.resolve('.pumbleapprc');
    if (!fs.existsSync(globalRc) || !fs.existsSync(localRc)) {
        console.error('Need ~/.pumblerc (npx pumble-cli login) and .pumbleapprc (npx pumble-cli connect)');
        process.exit(1);
    }

    const globalEnv = loadJson(globalRc);
    const localEnv = loadJson(localRc);
    const appId = localEnv.PUMBLE_APP_ID;
    const apiUrl = (globalEnv.PUMBLE_API_URL || 'https://api-ga.pumble.com').replace(/\/+$/, '');
    const workspaceId = globalEnv.PUMBLE_WORKSPACE_ID;
    const workspaceUserId = globalEnv.PUMBLE_WORKSPACE_USER_ID;
    const token = globalEnv.PUMBLE_ACCESS_TOKEN;

    const getUrl = `${apiUrl}/workspaces/${workspaceId}/workspaceUsers/${workspaceUserId}/apps/mine/${appId}`;
    const getRes = await fetch(getUrl, { headers: { Authtoken: token } });
    if (!getRes.ok) {
        console.error('Failed to load app:', getRes.status, await getRes.text());
        process.exit(1);
    }

    const app = await getRes.json();
    const hookUrl = absUrl(host, '/hook');
    const redirectUrl = absUrl(host, '/redirect');

    app.redirectUrls = [redirectUrl];

    if (!app.eventSubscriptions) {
        app.eventSubscriptions = { events: [] };
    }
    app.eventSubscriptions.url = hookUrl;

    if (app.blockInteraction) {
        app.blockInteraction.url = hookUrl;
    } else {
        app.blockInteraction = { url: hookUrl };
    }

    if (app.viewAction) {
        app.viewAction.url = hookUrl;
    }

    for (const cmd of app.slashCommands || []) {
        cmd.url = hookUrl;
    }

    for (const shortcut of app.shortcuts || []) {
        shortcut.url = hookUrl;
    }

    for (const menu of app.dynamicMenus || []) {
        menu.url = hookUrl;
    }

    const putUrl = `${apiUrl}/workspaces/${workspaceId}/workspaceUsers/${workspaceUserId}/apps/${appId}`;
    const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { Authtoken: token, 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
    });

    if (!putRes.ok) {
        console.error('Failed to update app:', putRes.status, await putRes.text());
        process.exit(1);
    }

    const updated = await putRes.json();

    if (updated.signingSecret) {
        const merged = { ...localEnv, PUMBLE_APP_SIGNING_SECRET: updated.signingSecret };
        if (updated.appKey) merged.PUMBLE_APP_KEY = updated.appKey;
        if (updated.clientSecret) merged.PUMBLE_APP_CLIENT_SECRET = updated.clientSecret;
        fs.writeFileSync(localRc, JSON.stringify(merged, null, 4));
        console.log('Updated .pumbleapprc with latest app secrets');
        console.log('Run: npm run sync-secrets  (then update /opt/mirotalksfu/.env and restart container)');
    }

    console.log('\nPumble app URLs updated:\n');
    console.log('  Events URL:', updated.eventSubscriptions?.url);
    for (const cmd of updated.slashCommands || []) {
        console.log(`  ${cmd.command} -> ${cmd.url}`);
    }
    console.log('  redirectUrls:', (updated.redirectUrls || []).join(', '));
    console.log('\nRestart addon: docker compose up -d --force-recreate pumble-mirotalk');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
