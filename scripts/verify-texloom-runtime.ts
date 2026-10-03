import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (filename: string) => JSON.parse(readFileSync(filename, 'utf8'));
const project = json(path.join(root, 'package.json'));
const lock = json(path.join(root, 'package-lock.json'));
const dependency = project.dependencies.texloom;
assert.match(dependency, /^file:vendor\/texloom-[\w.-]+\.tgz$/);
const recorded = lock.packages['node_modules/texloom'];
assert.equal(recorded.resolved, dependency);
assert.equal(lock.packages[''].dependencies.texloom, dependency);
const archive = readFileSync(path.join(root, dependency.slice(5)));
assert.equal(recorded.integrity, `sha512-${createHash('sha512').update(archive).digest('base64')}`);
const installed = path.dirname(fileURLToPath(import.meta.resolve('texloom')));
const provenance = json(path.join(installed, 'provenance.json'));
assert.deepEqual(provenance, json(path.join(root, 'vendor', 'texloom-provenance.json')));
assert.equal(provenance.contract, 'texloom-lemniro-distribution/1');
assert.match(provenance.sourceCommit, /^[0-9a-f]{40}$/);
for (const [filename, hash] of Object.entries(provenance.files)) {
  assert.ok(/^[A-Za-z0-9_./-]+$/.test(filename) && !filename.split('/').some(part => !part || part === '.' || part === '..'));
  assert.match(filename, /\.(mjs|d\.ts)$/);
  assert.equal(createHash('sha256').update(readFileSync(path.join(installed, filename))).digest('hex'), hash, filename);
}
console.log(`Verified Texloom ${provenance.sourceCommit}: ${Object.keys(provenance.files).length} runtime/type files and locked archive integrity.`);
