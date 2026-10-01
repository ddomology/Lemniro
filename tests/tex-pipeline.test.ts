import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import * as cheerio from 'cheerio';
import postcss from 'postcss';
import { assertResolvedLog, compileEntry, extractDocument, parseMetadata, scopeCss, standaloneSource } from '../scripts/tex-pipeline';
import type { Entry } from '../src/lib/content-types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadata = { kind: 'note', description: 'A short note.', topic: 'Topology', date: '2026-10-01', readingMinutes: 3, prerequisites: [], related: [] };
const header = (value: unknown) => `% lemniro: ${JSON.stringify(value)}\n`;

function builtEntries(): Entry[] {
  const manifest = path.join(root, 'generated', 'content.json');
  assert.ok(existsSync(manifest), 'Run npm run content (or npm run build) before the content integration tests.');
  return JSON.parse(readFileSync(manifest, 'utf8')) as Entry[];
}

test('metadata validates editorial fields without duplicating the LaTeX title', () => {
  assert.deepEqual(parseMetadata(header(metadata)), metadata);
  assert.throws(() => parseMetadata(header({ ...metadata, title: 'Second title' })), /title belongs in LaTeX/);
  assert.throws(() => parseMetadata(header({ ...metadata, date: '2026-02-30' })), /valid YYYY-MM-DD/);
  assert.throws(() => parseMetadata(header({ ...metadata, date: '2026-99-99' })), /valid YYYY-MM-DD/);
  assert.throws(() => parseMetadata(header({ ...metadata, related: ['a', 'a'] })), /duplicated/);
  assert.throws(() => parseMetadata(header({ ...metadata, related: ['../a'] })), /entry slugs/);
  assert.throws(() => parseMetadata(header(metadata) + header(metadata)), /exactly one/);
});

test('compiled references and unsafe embeds fail before publication', () => {
  assert.throws(() => assertResolvedLog("LaTeX Warning: Reference `missing' on page 1 undefined on input line 9.", 'test'), /undefined/);
  assert.throws(() => assertResolvedLog('LaTeX Warning: Label `one` multiply defined.', 'test'), /multiply defined/);
  assert.throws(() => extractDocument('<html><head><title>Title</title></head><body><a href="#missing">1</a></body></html>', '', 'note'), /broken compiled reference/);
  assert.throws(() => extractDocument('<html><head><title>Title</title></head><body><script>alert(1)</script></body></html>', '', 'note'), /executable embeds/);
  assert.throws(() => extractDocument('<html><head><title>Title</title></head><body><math><mfrac><mrow>1</mrow><mrow>x</mrow></mfrac></math></body></html>', '', 'note'), /malformed MathML/);
});

test('compiled HTML is extracted semantically and also permits sectionless prose', () => {
  const plain = extractDocument('<html><head><title>A short journal</title></head><body><p>One thought.</p></body></html>', '', 'short-journal');
  assert.equal(plain.title, 'A short journal');
  assert.deepEqual(plain.outline, []);
  const sample = extractDocument('<html><head><title>Title</title></head><body><div class="maketitle"><h1 class="titleHead">A title</h1></div><h3 class="sectionHead" id="idea"><span class="titlemark">1 </span>The idea</h3><p><a href="sample.html#idea">1</a><img src="figure.svg" alt="A figure"></p><math><mi>x</mi></math></body></html>', 'math { color: inherit; }', 'sample');
  assert.equal(sample.title, 'A title');
  assert.deepEqual(sample.outline, [{ id: 'idea', title: 'The idea', level: 2 }]);
  assert.match(sample.html, /<h2/);
  assert.match(sample.html, /href="#idea"/);
  assert.match(sample.html, /src="\.\.\/\.\.\/tex\/sample\/figure.svg"/);
  assert.match(sample.html, /<math>/);
  assert.doesNotMatch(sample.html, /maketitle/);
});

test('TeX4ht styles are contained, including rules nested in media queries', () => {
  const css = scopeCss('body { color: red; } p, .proof { margin: 1em; } @media print { h3 { color: black; } } .figure { background: url(figure.svg); }', 'sample');
  const parsed = postcss.parse(css);
  parsed.walkRules((rule) => assert.ok(rule.selectors.every((selector) => selector.startsWith('.tex-content '))));
  assert.doesNotMatch(css, /color: red/);
  assert.match(css, /\.\.\/\.\.\/tex\/sample\/figure\.svg/);
});

test('all discovered sources have complete manifests and valid compiled downloads', () => {
  const entries = builtEntries();
  const sourceSlugs = ['notes', 'journal'].flatMap((kind) => readdirSync(path.join(root, 'content', kind)).filter((file) => file.endsWith('.tex')).map((file) => path.basename(file, '.tex')));
  assert.deepEqual(entries.map((entry) => entry.slug).sort(), sourceSlugs.sort());
  for (const entry of entries) {
    const $ = cheerio.load(entry.html);
    assert.equal($('iframe,script').length, 0);
    const ids = new Set($('[id]').map((_index, element) => $(element).attr('id')).get());
    $('a[href^="#"]').each((_index, element) => assert.ok(ids.has($(element).attr('href')!.slice(1))));
    const pdf = readFileSync(path.join(root, 'public', entry.pdfPath));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.byteLength > 1_000);
    const original = path.join('content', entry.kind === 'note' ? 'notes' : 'journal', `${entry.slug}.tex`);
    const flattened = standaloneSource(root, original);
    assert.equal(createHash('sha256').update(flattened).digest('hex'), entry.sourceSha256);
    const downloadable = readFileSync(path.join(root, 'public', entry.sourcePath), 'utf8');
    assert.ok(downloadable.includes(flattened));
    assert.doesNotMatch(downloadable, /\\input\{tex\/lemniro-preamble\}/);
  }
});

test('the optional topology samples retain TeX visuals and their complete proof', (context) => {
  const entries = builtEntries();
  const topology = entries.find((entry) => entry.slug === 'topological-spaces');
  const proof = entries.find((entry) => entry.slug === 'compact-sets-are-closed');
  if (!topology || !proof) { context.skip('The example notes have been replaced by other authored content.'); return; }
  assert.ok(topology.visuals.some(v => v.alternativeText.includes('ℝ')), 'the shared custom \\R macro compiles');
  const $ = cheerio.load(proof.html);
  const text = $('body').text().replace(/\s+/g, ' ');
  assert.equal($('.proof').length, 2);
  assert.equal($('[data-environment="theorem"]').length, 1);
  assert.ok(text.includes('Every point'), 'the full complement-open conclusion survives compilation');
  assert.ok(text.includes('If the complement is empty'), 'the empty-complement case is retained');
});

test('the downloadable proof source compiles without repository files', (context) => {
  const entry = builtEntries().find((item) => item.slug === 'compact-sets-are-closed');
  if (!entry) { context.skip('The example proof has been replaced by other authored content.'); return; }
  mkdirSync(path.join(root, '.build'), { recursive: true });
  const isolated = mkdtempSync(path.join(root, '.build', 'source-download-test-'));
  cpSync(path.join(root, 'public', entry.sourcePath), path.join(isolated, 'download.tex'));
  for (let pass = 0; pass < 2; pass++) {
    const result = spawnSync(process.env.PDFLATEX_BIN || 'pdflatex', ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', 'download.tex'], { cwd: isolated, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120_000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout.slice(-2500));
  }
  assertResolvedLog(readFileSync(path.join(isolated, 'download.log'), 'utf8'), 'standalone download');
});

test('an actual LaTeX reference failure blocks HTML publication', () => {
  mkdirSync(path.join(root, '.build'), { recursive: true });
  const isolated = mkdtempSync(path.join(root, '.build', 'missing-ref-test-'));
  mkdirSync(path.join(isolated, 'content', 'notes'), { recursive: true });
  mkdirSync(path.join(isolated, 'tex'));
  cpSync(path.join(root, 'tex'), path.join(isolated, 'tex'), { recursive: true });
  writeFileSync(path.join(isolated, 'content', 'notes', 'broken.tex'), `${header(metadata)}\\documentclass{article}\n\\input{tex/lemniro-preamble}\n\\title{Broken reference}\n\\begin{document}\n\\maketitle\nSee Theorem~\\ref{does-not-exist}.\n\\end{document}\n`);
  assert.throws(() => compileEntry(isolated, path.join('content', 'notes', 'broken.tex')), /undefined|failed|missing/);
});

test('a complete lecture compiles semantic HTML, custom statements, AMS math, and TikZ', () => {
  mkdirSync(path.join(root, '.build'), { recursive: true });
  const isolated = mkdtempSync(path.join(root, '.build', 'lecture-render-test-'));
  mkdirSync(path.join(isolated, 'content', 'notes'), { recursive: true });
  cpSync(path.join(root, 'tex'), path.join(isolated, 'tex'), { recursive: true });
  cpSync(path.join(root, 'examples', 'lecture-note.tex'), path.join(isolated, 'content', 'notes', 'lecture-note.tex'));
  const entry = compileEntry(isolated, path.join('content', 'notes', 'lecture-note.tex'));
  const $ = cheerio.load(entry.html);
  assert.ok($('p').length > 10, 'prose is HTML text');
  assert.match(entry.title, /^Continuity of f\s*:/, 'title math has a readable text alternative');
  assert.equal(entry.visuals.length, $('[data-tex-visual]').length, 'removed title graphics do not leak into the article manifest');
  assert.ok($('ol li').length >= 3 && $('ul li').length >= 1, 'lists retain structure');
  assert.ok($('table').length >= 1, 'tables retain structure');
  assert.equal($('[data-environment="claim"]').length, 1, 'custom theorem names survive');
  assert.equal($('[data-environment="theorem"]').length, 1);
  assert.equal($('.proof').length, 2);
  assert.equal($('math,img.math,.tex-inline-metric').length, 0, 'all mathematics passes through the TeX visual adapter');
  assert.ok(entry.visuals.filter(v => v.kind === 'display-math').length >= 6, 'complex display environments are rendered');
  const macroExample = $('[data-environment="example"]').filter((_i, el) => $(el).find('.head').text().includes('Macro equivalence'));
  const pair = macroExample.find('.tex-math').slice(0, 2).map((_i, el) => $(el).attr('data-tex-visual')).get().map(id => entry.visuals.find(v => v.id === id)!);
  assert.equal(pair.length, 2);
  for (const key of ['widthPt', 'heightPt', 'depthPt'] as const) assert.ok(Math.abs(pair[0].geometry[key] - pair[1].geometry[key]) < .001, `preamble macro and literal match in ${key}`);
  const figure = $('.figure .tex-diagram');
  assert.equal(figure.length, 1, 'TikZ is a single vector diagram, not a screenshot of the document');
  const figureAsset = entry.visuals.find(v => v.id === figure.attr('data-tex-visual'))!;
  const filename = path.basename(figureAsset.asset);
  const svg = readFileSync(path.join(isolated, '.build', 'tex-publish', entry.slug, filename), 'utf8');
  assert.match(svg, /<svg\b/);
  assert.match(svg, /<(?:path|use)\b/);
  assert.ok($('.caption').text().includes('Continuous maps'));
  for (const visual of entry.visuals) {
    assert.ok(existsSync(path.join(isolated, '.build', 'tex-publish', entry.slug, path.basename(visual.asset))));
    assert.ok(visual.geometry.widthPt > 0 && visual.geometry.heightPt + visual.geometry.depthPt > 0);
  }
});

test('real TeX zero-size boxes survive legacy script-toggle whitespace and keep spacing silent', () => {
  mkdirSync(path.join(root, '.build'), { recursive: true });
  const isolated = mkdtempSync(path.join(root, '.build', 'zero-box-test-'));
  mkdirSync(path.join(isolated, 'content', 'notes'), { recursive: true });
  cpSync(path.join(root, 'tex'), path.join(isolated, 'tex'), { recursive: true });
  // Reproduce the TeX Live 2023 bug even when tests run on newer TeX4ht.
  const config = path.join(isolated, 'tex', 'lemniro-html.cfg');
  const compatibilityHook = '\\input{tex/lemniro-compat}';
  const source = readFileSync(config, 'utf8');
  assert.ok(source.includes(compatibilityHook));
  writeFileSync(config, source.replace(compatibilityHook, `\\ExplSyntaxOn
\\clist_map_inline:nn { SUBOn, SUPOn, x:SUBOn, x:SUPOn }
  { \\tl_put_right:cn {#1} { ~ } }
\\ExplSyntaxOff
${compatibilityHook}`));
  writeFileSync(path.join(isolated, 'content', 'notes', 'zero-boxes.tex'), `${header(metadata)}\\documentclass{article}
\\input{tex/lemniro-preamble}
\\usepackage{mathtools}
\\title{Geometry}
\\begin{document}\\maketitle
Ordinary $x$. Smash $\\smash{x}$. Overlap $\\mathrlap{x}$.
Phantom $\\phantom{x}$. Strut $\\mathstrut$.
\\end{document}
`);
  const entry = compileEntry(isolated, path.join('content', 'notes', 'zero-boxes.tex'));
  const [ordinary, smash, lap, phantom, strut] = entry.visuals;
  assert.equal(entry.visuals.length, 5);
  assert.equal(smash.geometry.heightPt + smash.geometry.depthPt, 0);
  assert.equal(lap.geometry.widthPt, 0);
  assert.ok(Math.abs(ordinary.geometry.widthPt - phantom.geometry.widthPt) < .001);
  assert.equal(phantom.alternativeText, '');
  assert.equal(strut.alternativeText, '');
  assert.ok(entry.visuals.every(visual => visual.layoutViewBox[2] > 0 && visual.layoutViewBox[3] > 0));
});
