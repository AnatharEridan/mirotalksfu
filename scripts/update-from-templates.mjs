#!/usr/bin/env node
/**
 * Merges missing keys/sections from *template* / *example* files into local config.
 * Existing values in target files are never overwritten.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(path.join(ROOT, 'package.json'));
const yaml = require('js-yaml');

const JOBS = [
    { template: '.env.template', target: '.env', kind: 'env' },
    { template: 'docker-compose.template.yml', target: 'docker-compose.yml', kind: 'yaml' },
    {
        template: 'pumble-mirotalk/.env.production.example',
        target: 'pumble-mirotalk/.env',
        kind: 'env',
    },
    {
        template: 'pumble-mirotalk/app.config.example.json',
        target: 'pumble-mirotalk/app.config.json',
        kind: 'json',
    },
    {
        template: 'pumble-mirotalk/docker-compose.standalone.template.yml',
        target: 'pumble-mirotalk/docker-compose.yml',
        kind: 'yaml',
        optional: true,
    },
];

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

function clone(value) {
    return structuredClone(value);
}

function mergeArrays(targetArr, templateArr) {
    const out = [...targetArr];
    for (const item of templateArr) {
        const serialized = JSON.stringify(item);
        const exists = out.some((entry) => JSON.stringify(entry) === serialized);
        if (!exists) {
            if (typeof item === 'string') {
                if (!out.includes(item)) out.push(item);
            } else {
                out.push(clone(item));
            }
        }
    }
    return out;
}

function mergeMissing(target, template) {
    if (template === null || template === undefined) {
        return target;
    }

    if (Array.isArray(template)) {
        if (!Array.isArray(target)) {
            return clone(template);
        }
        return mergeArrays(target, template);
    }

    if (typeof template !== 'object') {
        return target !== undefined ? target : template;
    }

    const out =
        target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};

    for (const [key, value] of Object.entries(template)) {
        if (!(key in out)) {
            out[key] = clone(value);
        } else {
            out[key] = mergeMissing(out[key], value);
        }
    }

    return out;
}

function parseEnvKeys(content) {
    const keys = new Set();
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
        if (match) keys.add(match[1]);
    }
    return keys;
}

function collectEnvEntries(templateContent) {
    const lines = templateContent.split('\n');
    const entries = [];
    let pendingComments = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            pendingComments = [];
            continue;
        }
        if (trimmed.startsWith('#')) {
            pendingComments.push(line);
            continue;
        }
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match) {
            entries.push({
                key: match[1],
                lines: [...pendingComments, line],
            });
            pendingComments = [];
        } else {
            pendingComments = [];
        }
    }

    return entries;
}

function mergeEnv(templatePath, targetPath) {
    const templateContent = read(templatePath);
    const templateKeys = parseEnvKeys(templateContent);

    if (!fs.existsSync(targetPath)) {
        write(targetPath, templateContent);
        return { created: true, added: [...templateKeys] };
    }

    const targetContent = read(targetPath);
    const targetKeys = parseEnvKeys(targetContent);
    const missing = collectEnvEntries(templateContent).filter((e) => !targetKeys.has(e.key));

    if (missing.length === 0) {
        return { created: false, added: [] };
    }

    const block = [
        '',
        '# --- added by scripts/update.sh (missing keys from template) ---',
        ...missing.flatMap((e) => e.lines),
        '',
    ].join('\n');

    const next = targetContent.replace(/\s*$/, '') + block;
    write(targetPath, next);

    return { created: false, added: missing.map((e) => e.key) };
}

function mergeYaml(templatePath, targetPath) {
    const templateDoc = yaml.load(read(templatePath));

    if (!fs.existsSync(targetPath)) {
        write(targetPath, read(templatePath));
        return { created: true, added: ['<entire file>'] };
    }

    const targetContent = read(targetPath);
    const targetDoc = yaml.load(targetContent) || {};
    const merged = mergeMissing(targetDoc, templateDoc);
    const added = describeYamlAdds(targetDoc, templateDoc);

    if (added.length === 0) {
        return { created: false, added: [] };
    }

    const header = targetContent.startsWith('#')
        ? targetContent.split('\n').filter((l) => l.startsWith('#')).join('\n') + '\n\n'
        : '';

    write(targetPath, header + yaml.dump(merged, { lineWidth: 120, noRefs: true }));

    return { created: false, added };
}

function describeYamlAdds(target, template, prefix = '') {
    const added = [];

    if (!template || typeof template !== 'object') {
        return added;
    }

    if (Array.isArray(template)) {
        return added;
    }

    for (const [key, value] of Object.entries(template)) {
        const pathKey = prefix ? `${prefix}.${key}` : key;
        if (!target || !(key in target)) {
            added.push(pathKey);
            continue;
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            added.push(...describeYamlAdds(target[key], value, pathKey));
        }
    }

    return added;
}

function mergeJson(templatePath, targetPath) {
    const templateDoc = JSON.parse(read(templatePath));

    if (!fs.existsSync(targetPath)) {
        write(targetPath, JSON.stringify(templateDoc, null, 4) + '\n');
        return { created: true, added: ['<entire file>'] };
    }

    const targetDoc = JSON.parse(read(targetPath));
    const merged = mergeMissing(targetDoc, templateDoc);
    const added = describeYamlAdds(targetDoc, templateDoc);

    write(targetPath, JSON.stringify(merged, null, 4) + '\n');

    return { created: false, added };
}

function runJob(job) {
    const templatePath = path.join(ROOT, job.template);
    const targetPath = path.join(ROOT, job.target);

    if (!fs.existsSync(templatePath)) {
        if (job.optional) {
            console.log(`  skip ${job.target} (no template)`);
            return;
        }
        throw new Error(`Template not found: ${job.template}`);
    }

    let result;
    switch (job.kind) {
        case 'env':
            result = mergeEnv(templatePath, targetPath);
            break;
        case 'yaml':
            result = mergeYaml(templatePath, targetPath);
            break;
        case 'json':
            result = mergeJson(templatePath, targetPath);
            break;
        default:
            throw new Error(`Unknown kind: ${job.kind}`);
    }

    if (result.created) {
        console.log(`  + ${job.target} (created from template)`);
    } else if (result.added.length > 0) {
        console.log(`  ~ ${job.target} (+${result.added.length}): ${result.added.join(', ')}`);
    } else {
        console.log(`  = ${job.target} (up to date)`);
    }
}

console.log('Merging templates into local config (existing values kept):\n');

for (const job of JOBS) {
    runJob(job);
}

console.log('\nDone.');
