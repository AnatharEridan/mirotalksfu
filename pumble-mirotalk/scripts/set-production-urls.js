#!/usr/bin/env node
/**
 * Register production hook/redirect URLs in Pumble (fixes Events URL: none).
 *
 *   npm run set-urls -- --host https://secondmeet.devilgate-dev.ru
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ADDON_HOST_KEY = 'ADDON_HOST';

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
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
    const base = host.replace(/\/+$/, '') + '/';
    return new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, base).toString();
}

function normalizeEvents(events) {
    if (!Array.isArray(events) || events.length === 0) {
        return ['APP_UNINSTALLED', 'APP_UNAUTHORIZED'];
    }
    return events.map((event) => (typeof event === 'string' ? event : event.name)).filter(Boolean);
}

function buildManifestPayload(host, base, remote) {
    const hookUrl = absUrl(host, '/hook');
    const redirectUrl = absUrl(host, '/redirect');

    const slashSource =
        remote.slashCommands?.length > 0
            ? remote.slashCommands
            : [{ command: '/mirotalk', description: 'Начать видеозвонок MiroTalk', usageHint: '' }];

    const slashCommands = slashSource.map((cmd) => ({
        command: cmd.command,
        description: cmd.description || '',
        usageHint: cmd.usageHint || '',
        url: hookUrl,
    }));

    let shortcuts = (remote.shortcuts || []).map((sh) => ({
        shortcutType: sh.shortcutType,
        name: sh.name,
        displayName: sh.displayName,
        description: sh.description || '',
        url: hookUrl,
    }));

    if (shortcuts.length === 0) {
        shortcuts = [
            {
                shortcutType: 'GLOBAL',
                name: 'mirotalk',
                displayName: 'MiroTalk',
                description: 'Начать видеозвонок в этом канале',
                url: hookUrl,
            },
        ];
    }

    const payload = {
        name: base.name,
        displayName: base.displayName,
        bot: base.bot,
        botTitle: base.botTitle,
        socketMode: base.socketMode ?? false,
        scopes: remote.scopes || base.scopes,
        shortcuts,
        slashCommands,
        eventSubscriptions: {
            url: hookUrl,
            events: normalizeEvents(remote.eventSubscriptions?.events),
        },
        blockInteraction: { url: hookUrl },
        redirectUrls: [redirectUrl],
        dynamicMenus: [],
    };

    if (remote.welcomeMessage) {
        payload.welcomeMessage = remote.welcomeMessage;
    }
    if (remote.offlineMessage) {
        payload.offlineMessage = remote.offlineMessage;
    }

    return payload;
}

function saveAddonHost(host) {
    const globalRc = path.join(os.homedir(), '.pumblerc');
    const globalEnv = fs.existsSync(globalRc) ? loadJson(globalRc) : {};
    globalEnv[ADDON_HOST_KEY] = host.replace(/\/+$/, '') + '/';
    saveJson(globalRc, globalEnv);
    console.log(`Saved ${ADDON_HOST_KEY} in ~/.pumblerc`);
}

async function main() {
    const { host: hostArg } = parseArgs(process.argv);
    const host = String(hostArg || '').replace(/\/+$/, '');
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
        console.error('Usage: npm run set-urls -- --host https://your-domain.com');
        process.exit(1);
    }

    const globalRc = path.join(os.homedir(), '.pumblerc');
    const localRc = path.resolve('.pumbleapprc');
    const baseManifest = path.resolve('manifest.json');

    if (!fs.existsSync(globalRc) || !fs.existsSync(localRc)) {
        console.error('Need ~/.pumblerc (npx pumble-cli login) and .pumbleapprc (npx pumble-cli connect)');
        process.exit(1);
    }

    const globalEnv = loadJson(globalRc);
    const localEnv = loadJson(localRc);
    const base = loadJson(baseManifest);
    const appId = localEnv.PUMBLE_APP_ID;
    const apiUrl = (globalEnv.PUMBLE_API_URL || 'https://api-ga.pumble.com').replace(/\/+$/, '');
    const workspaceId = globalEnv.PUMBLE_WORKSPACE_ID;
    const workspaceUserId = globalEnv.PUMBLE_WORKSPACE_USER_ID;
    const token = globalEnv.PUMBLE_ACCESS_TOKEN;

    saveAddonHost(host);

    const getUrl = `${apiUrl}/workspaces/${workspaceId}/workspaceUsers/${workspaceUserId}/apps/mine/${appId}`;
    const getRes = await fetch(getUrl, { headers: { Authtoken: token } });
    if (!getRes.ok) {
        console.error('Failed to load app:', getRes.status, await getRes.text());
        process.exit(1);
    }

    const remote = await getRes.json();
    const payload = buildManifestPayload(host, base, remote);

    const putUrl = `${apiUrl}/workspaces/${workspaceId}/workspaceUsers/${workspaceUserId}/apps/${appId}`;
    const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { Authtoken: token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!putRes.ok) {
        const body = await putRes.text();
        console.error('Failed to update app:', putRes.status, body);
        console.error('\nPayload sent (redirectUrls):', payload.redirectUrls);
        console.error('\nTry instead:');
        console.error(`  npm ci && npm run build`);
        console.error(`  npx pumble-cli pre-publish --host ${host}`);
        process.exit(1);
    }

    const updated = await putRes.json();

    if (updated.signingSecret) {
        const merged = { ...localEnv };
        merged.PUMBLE_APP_SIGNING_SECRET = updated.signingSecret;
        if (updated.appKey) merged.PUMBLE_APP_KEY = updated.appKey;
        if (updated.clientSecret) merged.PUMBLE_APP_CLIENT_SECRET = updated.clientSecret;
        saveJson(localRc, merged);
        console.log('Updated .pumbleapprc with latest app secrets');
        console.log('Run: npm run sync-secrets');
    }

    console.log('\nPumble app URLs updated:\n');
    console.log('  Events URL:', updated.eventSubscriptions?.url);
    for (const cmd of updated.slashCommands || []) {
        console.log(`  ${cmd.command} -> ${cmd.url}`);
    }
    console.log('  redirectUrls:', (updated.redirectUrls || []).join(', '));
    console.log('\nNext:');
    console.log('  npm run sync-secrets');
    console.log('  cd /opt/mirotalksfu && docker compose up -d --force-recreate pumble-mirotalk');
    console.log('  npm run check-remote');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
