#!/usr/bin/env node
/**
 * Patch pumble-sdk to log /hook requests (403 = signing secret mismatch).
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'pumble-sdk', 'lib', 'core', 'adapters', 'http', 'middlewares.js');

if (!fs.existsSync(file)) {
    console.warn('patch-pumble-sdk: middlewares.js not found, skip');
    process.exit(0);
}

let src = fs.readFileSync(file, 'utf8');
if (src.includes('[hook]')) {
    process.exit(0);
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
