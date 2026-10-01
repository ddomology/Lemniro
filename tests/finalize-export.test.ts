import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { finalizeExport } from '../scripts/finalize-export';

test('Windows-shaped RSC exports keep their bytes, preserve originals, and finalize idempotently', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lemniro-rsc-export-'));
  try {
    const route = path.join(directory, 'notes', 'an-example');
    const nested = path.join(route, '__next.notes', '$slug', '__PAGE__.txt');
    const flat = path.join(route, '__next.notes.$slug.__PAGE__.txt');
    const linuxFile = path.join(route, '__next._tree.txt');
    const bytes = Buffer.from([0, 10, 34, 92, 127, 128, 240, 159, 147, 150]);
    await mkdir(path.dirname(nested), { recursive: true });
    await writeFile(nested, bytes);
    await writeFile(linuxFile, 'already a flat Linux export');

    assert.deepEqual(await finalizeExport(directory), { copied: 1, unchanged: 0 });
    assert.deepEqual(await readFile(flat), bytes);
    assert.deepEqual(await readFile(nested), bytes);
    assert.equal(await readFile(linuxFile, 'utf8'), 'already a flat Linux export');
    assert.deepEqual(await finalizeExport(directory), { copied: 0, unchanged: 1 });

    await writeFile(flat, 'a conflicting destination');
    await assert.rejects(finalizeExport(directory), /Static export segment collision/);
    assert.equal(await readFile(flat, 'utf8'), 'a conflicting destination');
    assert.deepEqual(await readFile(nested), bytes);
  } finally {
    // Only remove the exact temporary fixture allocated by this test.
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('lemniro-rsc-export-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('already-flat Linux output is unchanged', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lemniro-rsc-export-'));
  try {
    const file = path.join(directory, '__next.notes.__PAGE__.txt');
    await writeFile(file, 'segment data');
    assert.deepEqual(await finalizeExport(directory), { copied: 0, unchanged: 0 });
    assert.equal(await readFile(file, 'utf8'), 'segment data');
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('lemniro-rsc-export-'));
    await rm(directory, { recursive: true, force: true });
  }
});
