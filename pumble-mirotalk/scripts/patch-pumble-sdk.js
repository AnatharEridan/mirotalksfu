#!/usr/bin/env node
/**
 * Patch pumble-sdk to log /hook requests (403 = signing secret mismatch).
 * Safe to require() — does not call process.exit().
 */
const fs = require('fs');
const path = require('path');

function patchPumbleSdk() {
    const file = path.join(__dirname, '..', 'node_modules', 'pumble-sdk', 'lib', 'core', 'adapters', 'http', 'middlewares.js');

    if (!fs.existsSync(file)) {
        return false;
    }

    let src = fs.readFileSync(file, 'utf8');
    if (src.includes('[hook]')) {
        return true;
    }

    src = src.replace(
        'return (request, res, next) => {',
        `return (request, res, next) => {
        console.log('[hook] request', request.method, request.path);`
    );

    src = src.replace(
        "if (!timestamp || !signature) {",
        `if (!timestamp || !signature) {
            console.error('[hook] 403 missing signature headers');`
    );

    src = src.replace(
        "if (testSignature !== signature) {",
        `if (testSignature !== signature) {
            console.error('[hook] 403 signature mismatch');`
    );

    fs.writeFileSync(file, src);
    console.log('patch-pumble-sdk: hook logging enabled');
    return true;
}

module.exports = { patchPumbleSdk };

if (require.main === module) {
    const ok = patchPumbleSdk();
    process.exit(ok ? 0 : 1);
}
