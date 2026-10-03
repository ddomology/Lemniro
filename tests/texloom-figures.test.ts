import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { sceneFeatures, type Bundle, type ScenePackage } from 'texloom';
import type { LemniroFigureReference } from '../src/lib/texloom-types';
import { authoredSceneIds, loadSceneCatalog, publicFile, verifySceneReference } from '../scripts/texloom-figures';
import { compileEntry, extractDocument } from '../scripts/tex-pipeline';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const shell = (body: string) => `<html><head><title>Lecture</title></head><body>${body}</body></html>`;
const reference = (): LemniroFigureReference => ({ contract: 'texloom-figure/1', id: 'test-scene',
  manifestPath: 'texloom/test-scene/scene.json', manifestSha256: 'a'.repeat(64), posterPath: 'texloom/test-scene/poster.svg',
  title: 'A < B', description: 'Two points & one line.', width: 100, height: 50, duration: 2 });

function fixture() {
  mkdirSync(path.join(root, '.build'), { recursive: true });
  const directory = mkdtempSync(path.join(root, '.build', 'texloom-catalog-'));
  const resource = { kind: 'vector' as const, items: [{ kind: 'path' as const, d: 'M0 0L10 2' }],
    metrics: { width: 10, height: 2, depth: 0 }, inkBounds: [0, 0, 10, 2] as [number, number, number, number] };
  const bundle: Bundle = { version: '0.3', title: 'Test', duration: 2, units: 'bp', viewport: { width: 100, height: 50 },
    camera: { x: 0, y: 0, zoom: 1 }, nodes: [{ id: 'art', kind: 'tex', resourceId: 'art', x: 0, y: 0 }],
    resources: { art: resource }, tracks: [], relations: [] };
  const { resources: _resources, ...scene } = bundle;
  const payload = Buffer.from(JSON.stringify(resource) + '\n');
  const pkg: ScenePackage = { contract: 'texloom-package/1', scene, assets: { version: 1, requiredFeatures: sceneFeatures(bundle),
    entries: [{ id: 'art', kind: 'vector', mediaType: 'application/vnd.texloom.resource+json', byteLength: payload.length,
      sha256: hash(payload), bounds: [0, 0, 10, 2], source: { kind: 'external', uri: 'assets/art.json' } }] } };
  const figure = reference(), base = path.join(directory, 'public', 'texloom', 'test-scene');
  mkdirSync(path.join(base, 'assets'), { recursive: true });mkdirSync(path.join(directory, 'content', 'notes'), { recursive: true });
  writeFileSync(path.join(base, 'assets', 'art.json'), payload);
  writeFileSync(path.join(base, 'poster.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0L10 2"/></svg>');
  const publish = () => {
    const manifest = JSON.stringify(pkg);writeFileSync(path.join(base, 'scene.json'), manifest);figure.manifestSha256 = hash(manifest);
    writeFileSync(path.join(directory, 'content', 'scenes.json'), JSON.stringify([figure]));
  };
  publish();return { directory, base, pkg, figure, payload, publish };
}

test('catalog verifies exact external, inline and packed bytes against the hydrated scene', () => {
  const f = fixture();assert.equal(loadSceneCatalog(f.directory).get('test-scene')?.manifestSha256, f.figure.manifestSha256);
  f.pkg.assets.entries[0].source = { kind: 'inline', data: f.payload.toString('utf8') };f.publish();verifySceneReference(f.directory, f.figure);
  const packed = Buffer.concat([Buffer.from('prefix'), f.payload, Buffer.from('suffix')]);writeFileSync(path.join(f.base, 'pack.bin'), packed);
  f.pkg.assets.entries[0].source = { kind: 'external', uri: 'pack.bin', byteRange: { offset: 6, length: f.payload.length } };
  f.publish();verifySceneReference(f.directory, f.figure);
  packed[9] ^= 1;writeFileSync(path.join(f.base, 'pack.bin'), packed);
  assert.throws(() => loadSceneCatalog(f.directory), /payload byte length or SHA-256 mismatch/);
});

test('unregistered files, changed hashes, malformed catalogs and unsafe posters stop registration', () => {
  const f = fixture();f.figure.manifestSha256 = '0'.repeat(64);assert.throws(() => verifySceneReference(f.directory, f.figure), /manifest SHA-256/);
  f.publish();writeFileSync(path.join(f.directory, 'content', 'scenes.json'), JSON.stringify([f.figure, f.figure]));
  assert.throws(() => loadSceneCatalog(f.directory), /Duplicate scene catalog ID/);
  f.publish();f.pkg.assets.requiredFeatures.push('mesh.unknown');f.publish();assert.throws(() => loadSceneCatalog(f.directory), /unsupported required/);
  f.pkg.assets.requiredFeatures.pop();f.publish();writeFileSync(path.join(f.base, 'poster.svg'), '<svg><script>bad()</script></svg>');
  assert.throws(() => loadSceneCatalog(f.directory), /static SVG/);
  writeFileSync(path.join(f.base, 'poster.svg'), '<svg><style>@import "https://example.invalid/x.css";</style></svg>');
  assert.throws(() => loadSceneCatalog(f.directory), /static SVG/);
  assert.throws(() => publicFile(path.join(f.directory, 'public'), '../escape'), /Nonportable/);
  assert.throws(() => publicFile(path.join(f.directory, 'public'), 'missing.svg'), /Missing local/);
  assert.throws(() => publicFile(path.join(f.directory, 'public'), 'texloom/%2e%2e/x'), /Nonportable/);
});

test('three repeated figures split at whole DOM blocks while keeping static HTML complete and escaped', () => {
  const figure = reference(), catalog = new Map([[figure.id, figure]]), marker = '<div data-texloom-ref="test-scene"></div>';
  const result = extractDocument(shell(`<p>Before.</p>${marker}<div class="newtheorem"><span class="head">Theorem 1.</span>Statement.</div>
    <div class="proof"><p>Whole proof.</p></div>${marker}<h3 class="sectionHead">After</h3>${marker}<p>End.</p>`), '', 'lecture', undefined, catalog);
  assert.deepEqual(result.bodyBlocks?.map(block => block.kind), ['html', 'texloom', 'html', 'texloom', 'html', 'texloom', 'html']);
  assert.equal(result.bodyBlocks?.filter(block => block.kind === 'texloom').length, 3);
  const $ = load(result.html);assert.equal($('figure').length, 3);assert.equal($('.tex-statement').length, 1);assert.equal($('.tex-proof').length, 1);
  assert.equal($('script,iframe,b').length, 0);assert.equal($('figure strong').first().text(), 'A < B');
  assert.equal($('figure img').first().attr('src'), '../../texloom/test-scene/poster.svg');
  assert.equal(new Set($('figure').map((_i, el) => $(el).attr('id')).get()).size, 3);
  const theorem = result.bodyBlocks?.[2];assert.ok(theorem?.kind === 'html' && theorem.html.includes('Whole proof.'));
});

test('nested references and malformed marker data are rejected instead of reparenting content', () => {
  const catalog = new Map([['test-scene', reference()]]), marker = '<div data-texloom-ref="test-scene"></div>';
  for (const body of [`<div class="proof">${marker}</div>`, `<ul><li>${marker}</li></ul>`,
    `<table><tbody><tr><td>${marker}</td></tr></tbody></table>`, `<table>${marker}<tr><td>cell</td></tr></table>`]) {
    assert.throws(() => extractDocument(shell(body), '', 'lecture', undefined, catalog), /document-level|nested/);
  }
  assert.throws(() => extractDocument(shell('<div data-texloom-ref="unknown"></div>'), '', 'lecture', undefined, catalog), /unknown LemniroScene/);
  assert.throws(() => extractDocument(shell('<div data-texloom-ref="test-scene" class="extra"></div>'), '', 'lecture', undefined, catalog), /invalid LemniroScene placeholder/);
  assert.throws(() => extractDocument(shell('<div data-texloom-ref="test-scene">Injected prose</div>'), '', 'lecture', undefined, catalog), /invalid LemniroScene placeholder/);
  assert.throws(() => extractDocument(shell(`<div id="texloom-lecture-1"></div>${marker}`), '', 'lecture', undefined, catalog), /anchor conflicts/);
});

test('legacy prose remains a single HTML document and unsafe embeds remain rejected', () => {
  const plain = extractDocument(shell('<p>Original note.</p>'), '', 'plain');assert.equal(plain.bodyBlocks, undefined);
  assert.throws(() => extractDocument(shell('<iframe src="x"></iframe>'), '', 'plain'), /executable embeds/);
  assert.throws(() => extractDocument(shell('<img onerror="bad()" src="x">'), '', 'plain'), /executable HTML/);
});

test('authoring requires literal registered IDs and ignores ordinary TeX comments', () => {
  const catalog = new Map([['test-scene', reference()]]);
  assert.deepEqual(authoredSceneIds('% \\LemniroScene{missing}\n\\LemniroScene{test-scene}\n\\LemniroScene{test-scene}', catalog, 'note'), ['test-scene', 'test-scene']);
  assert.throws(() => authoredSceneIds('\\LemniroScene{missing}', catalog, 'note'), /unknown LemniroScene/);
  assert.throws(() => authoredSceneIds('\\LemniroScene{\\dynamic}', catalog, 'note'), /literal/);
});

test('unknown references fail before compiler work or publication can replace existing output', () => {
  const f = fixture();cpSync(path.join(root, 'tex'), path.join(f.directory, 'tex'), { recursive: true });
  const note = '% lemniro: {"kind":"note","description":"Test","topic":"Analysis","date":"2026-10-03","readingMinutes":1,"prerequisites":[],"related":[]}\n'
    + '\\documentclass{article}\n\\input{tex/lemniro-preamble}\n\\title{Unknown}\n\\begin{document}\\maketitle\\LemniroScene{missing}\\end{document}';
  writeFileSync(path.join(f.directory, 'content', 'notes', 'unknown.tex'), note);
  const destination = path.join(f.directory, '.build', 'tex-publish', 'unknown');mkdirSync(destination, { recursive: true });
  writeFileSync(path.join(destination, 'sentinel.txt'), 'previous publication');
  assert.throws(() => compileEntry(f.directory, 'content/notes/unknown.tex'), /unknown LemniroScene/);
  assert.equal(readFileSync(path.join(destination, 'sentinel.txt'), 'utf8'), 'previous publication');
});

test('the actual circle-and-sine note compiles three figures, a theorem and its complete proof to HTML and PDF', () => {
  const entry = compileEntry(root, 'content/notes/circle-and-sine.tex');
  const $ = load(entry.html);assert.equal($('figure.texloom-static-figure').length, 3);
  assert.equal(entry.bodyBlocks?.filter(block => block.kind === 'texloom').length, 3);
  assert.equal($('[data-environment="theorem"]').length, 1);assert.equal($('.proof').length, 1);
  assert.ok($('body').text().includes('Both claims hold for every real'));assert.ok(entry.visuals.length > 10);
  const pdf = readFileSync(path.join(root, '.build', 'tex-publish', entry.slug, `${entry.slug}.pdf`));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');assert.ok(pdf.length > 10000);
  const standalone = readFileSync(path.join(root, '.build', 'tex-publish', entry.slug, `${entry.slug}.tex`), 'utf8');
  assert.ok(standalone.includes('Interactive mathematical figure'));assert.ok(standalone.includes('\\LemniroScene{circle-and-sine}'));
});
