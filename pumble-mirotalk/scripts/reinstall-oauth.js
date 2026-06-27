#!/usr/bin/env node
/**
 * Force OAuth reinstall so bot token includes new scopes (e.g. messages:edit).
 * pre-publish updates the app manifest but does NOT refresh workspace tokens.
 *
 * Usage (from pumble-mirotalk/, after `npx pumble-cli login`):
 *   node scripts/reinstall-oauth.js --host https://secondmeet.devilgate-dev.ru
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

async function main() {
    const { host: hostArg } = parseArgs(process.argv);
    const host = String(hostArg || '').replace(/\/+$/, '');
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
        console.error('Missing --host (public addon URL), e.g. https://secondmeet.devilgate-dev.ru');
        process.exit(1);
    }

    const globalRc = path.join(os.homedir(), '.pumblerc');
    const localRc = path.resolve('.pumbleapprc');
    const manifestPath = path.resolve('manifest.json');

    if (!fs.existsSync(globalRc)) {
        console.error(`Not logged in. Run: npx pumble-cli login`);
        process.exit(1);
    }
    if (!fs.existsSync(localRc)) {
        console.error(`Missing .pumbleapprc. Run: npx pumble-cli connect`);
        process.exit(1);
    }

    const globalEnv = loadJson(globalRc);
    const localEnv = loadJson(localRc);
    const manifest = loadJson(manifestPath);

    const accessToken = globalEnv.PUMBLE_ACCESS_TOKEN;
    const workspaceId = globalEnv.PUMBLE_WORKSPACE_ID;
    const workspaceUserId = globalEnv.PUMBLE_WORKSPACE_USER_ID;
    const clientId = localEnv.PUMBLE_APP_ID || process.env.PUMBLE_APP_ID;
    const apiUrl = (globalEnv.PUMBLE_API_URL || 'https://api-ga.pumble.com').replace(/\/+$/, '');

    if (!accessToken || !workspaceId || !workspaceUserId || !clientId) {
        console.error('Missing login or app id. Run: npx pumble-cli login && npx pumble-cli connect');
        process.exit(1);
    }

    const botScopes = manifest.scopes?.botScopes || [];
    const userScopes = manifest.scopes?.userScopes || [];
    const scopesStr = [...userScopes, ...botScopes.map((s) => `bot:${s}`)].join(',');
    const redirectUrl = `${host}/redirect`;

    const grantUrl = new URL(
        `/workspaces/${workspaceId}/workspaceUsers/${workspaceUserId}/oauth2/grant`,
        apiUrl
    );
    grantUrl.searchParams.set('clientId', clientId);
    grantUrl.searchParams.set('scopes', scopesStr);
    grantUrl.searchParams.set('redirectUrl', redirectUrl);
    grantUrl.searchParams.set('isReinstall', 'true');

    const res = await fetch(grantUrl, {
        headers: { Authtoken: accessToken },
    });

    if (!res.ok) {
        const body = await res.text();
        console.error(`Pumble API error ${res.status}: ${body}`);
        process.exit(1);
    }

    const data = await res.json();
    const oauthUrl = data.redirectUrl;

    console.log('\n1. Sync manifest scopes first (if not done yet):');
    console.log(`   npx pumble-cli pre-publish --host ${host}\n`);
    console.log('2. Optional: remove old bot token on server:');
    console.log('   rm /opt/mirotalksfu/pumble-mirotalk/data/tokens.json\n');
    console.log('3. Open this URL in your browser and approve all scopes:\n');
    console.log(oauthUrl);
    console.log('\nBot scopes in this reinstall:', botScopes.join(', '));
    console.log('\nAfter redirect succeeds, restart addon and check logs for messages:edit in JWT.\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
