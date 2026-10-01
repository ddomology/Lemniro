import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { load } from 'cheerio';
import { logicalViewBox, normalizeVisuals } from '../scripts/tex-visuals';

const fixtureSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="27pt" height="12pt" viewBox="-3 -8 27 12">
  <g data-tex-origin-x="0" data-tex-origin-y="0"/>
  <defs>
    <path id="glyph" d="M-3,-7 L24,-7 L24,3 L-3,3 Z"/>
    <clipPath id="clip"><rect x="-3" y="-8" width="27" height="12"/></clipPath>
  </defs>
  <g clip-path="url(#clip)" fill="#000000"><use href="#glyph"/><use xlink:href="#glyph"/></g>
</svg>`;

function inline(filename = 'formula.svg', metrics = 'data-width="20pt" data-height="7pt" data-depth="2pt" data-em="10pt" data-base-em="10pt"'): string {
  return `<span class="tex-inline-metric" ${metrics}><img class="math" src="${filename}" alt="x_j"></span>`;
}

function fixture(run: (directory: string) => void, svg = fixtureSvg): void {
  const directory = mkdtempSync(path.join(tmpdir(), 'lemniro-tex-visuals-'));
  try {
    writeFileSync(path.join(directory, 'formula.svg'), svg);
    run(directory);
  } finally {
    // Only remove the exact temporary directory allocated for this fixture.
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('lemniro-tex-visuals-'));
    rmSync(directory, { recursive: true, force: true });
  }
}

test('logical view boxes convert TeX points to SVG points and retain a nonzero baseline origin', () => {
  assert.deepEqual(logicalViewBox([11, 20], { widthPt: 72.27, heightPt: 36.135, depthPt: 9.03375 }), [11, -16, 72, 45]);
  assert.deepEqual(logicalViewBox([-4, -10], { widthPt: 72.27, heightPt: 0, depthPt: 72.27 }), [-4, -10, 72, 72]);
  for (const geometry of [
    { widthPt: -1, heightPt: 1, depthPt: 0 },
    { widthPt: 10, heightPt: -1, depthPt: 1 },
    { widthPt: Number.POSITIVE_INFINITY, heightPt: 1, depthPt: 0 },
  ]) assert.throws(() => logicalViewBox([0, 0], geometry), /Invalid logical TeX geometry/);
  assert.throws(() => logicalViewBox([Number.NaN, 0], { widthPt: 10, heightPt: 1, depthPt: 0 }), /Invalid logical TeX geometry/);
});

test('zero-size TeX boxes retain geometry and invisible spacing remains silent', () => {
  fixture(directory => {
    for (const [width, height, expected] of [[0, 7, 'width:0em;height:0.7em'], [20, 0, 'width:2em;height:0em']]) {
      const $ = load(inline('formula.svg', `data-width="${width}pt" data-height="${height}pt" data-depth="0pt" data-em="10pt" data-base-em="10pt"`));
      const [visual] = normalizeVisuals($, directory, 'lap');
      assert.ok($('[data-tex-visual]').attr('style')!.includes(String(expected)));
      assert.ok($('svg').attr('style')!.includes('0.1em'), 'only the degenerate viewport gets padding');
      assert.ok(visual.layoutViewBox[2] > 0 && visual.layoutViewBox[3] > 0);
      assert.equal(visual.geometry.widthPt, width);
      assert.equal(visual.geometry.heightPt, height);
    }
  });
  fixture(directory => {
    const $ = load(`<p>A${inline()}B</p>`);
    const [visual] = normalizeVisuals($, directory, 'phantom');
    assert.equal(visual.alternativeText, '');
    assert.equal($('p').text(), 'AB', 'phantoms add neither Diagram nor their invisible source glyph to copy text');
    assert.equal($('[data-tex-visual]').attr('aria-hidden'), 'true');
    assert.equal($('[data-tex-visual]').attr('role'), undefined);
  }, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0"><g data-tex-origin-x="0" data-tex-origin-y="0"/></svg>');
});

test('inline layout uses TeX advance and depth in em while preserving painted overhang', () => {
  fixture(directory => {
    const $ = load(`<p>Before ${inline()} after.</p>`);
    const visuals = normalizeVisuals($, directory, 'overhang');
    assert.equal(visuals.length, 1);
    const visual = visuals[0];
    assert.deepEqual(visual.geometry, { widthPt: 20, heightPt: 7, depthPt: 2 });
    assert.deepEqual(visual.inkViewBox, [-3, -8, 27, 12], 'ink overhang is separate from the advance width');
    assert.equal(visual.kind, 'inline-math');
    assert.equal(visual.fontSizePt, 10);
    assert.equal(visual.baseFontSizePt, 10);
    const wrapper = $('[data-tex-visual]');
    assert.equal(wrapper.attr('style'), '--tex-font-ratio:1;width:2em;height:0.9em;vertical-align:-0.2em;');
    assert.equal(wrapper.find('svg').attr('viewBox'), logicalViewBox([0, 0], visual.geometry).join(' '));
    assert.equal(wrapper.find('path').attr('d'), 'M-3,-7 L24,-7 L24,3 L-3,3 Z', 'glyph outlines remain unchanged');
    assert.equal(wrapper.find('svg').attr('width'), undefined);
    assert.equal(wrapper.find('svg').attr('height'), undefined);
    assert.equal($('[data-tex-origin-x],.tex-inline-metric,img.math').length, 0);
    assert.equal(wrapper.attr('aria-label'), 'x_j');
    assert.equal(wrapper.find('.tex-visual-text').text(), 'x_j');
    assert.equal($('p').text().replace(/\s+/g, ' '), 'Before x_j after.');
  });
});

test('repeated uses of one SVG get distinct namespaces and preserve all local references', () => {
  fixture(directory => {
    const before = readFileSync(path.join(directory, 'formula.svg'), 'utf8');
    const $ = load(`<p>${inline()} and ${inline()}</p>`);
    const visuals = normalizeVisuals($, directory, 'shared');
    assert.equal(visuals.length, 2, 'each appearance has its own visual record');
    assert.equal(visuals[0].asset, '/tex/shared/formula.svg');
    assert.equal(visuals[0].asset, visuals[1].asset);
    assert.equal(visuals[0].sha256, visuals[1].sha256);
    assert.notEqual(visuals[0].id, visuals[1].id);
    const allIds = $('[id]').toArray().map(node => $(node).attr('id'));
    assert.equal(new Set(allIds).size, allIds.length);
    $('[data-tex-visual]').each((index, node) => {
      const visual = $(node);
      const prefix = `${visuals[index].id}-`;
      assert.equal(visual.find('path').attr('id'), `${prefix}glyph`);
      assert.equal(visual.find(`[id="${prefix}clip"]`).length, 1);
      assert.equal(visual.find('use[href]').attr('href'), `#${prefix}glyph`);
      const xml = load(visual.find('svg').toString(), { xml: true });
      assert.equal(xml('use').last().attr('xlink:href'), `#${prefix}glyph`);
      assert.equal(visual.find('g[clip-path]').attr('clip-path'), `url(#${prefix}clip)`);
      assert.equal(visual.find('g[fill]').attr('fill'), 'currentColor');
    });
    assert.equal(readFileSync(path.join(directory, 'formula.svg'), 'utf8'), before, 'normalization never mutates shared source assets');
  });
});

test('display math and diagrams keep their kind, point scale, and text alternatives', () => {
  fixture(directory => {
    const $ = load('<div class="math-display"><img src="formula.svg" data-tex-font="20pt" data-tex-base-font="10pt" alt="a+b"></div><div class="figure"><img src="formula.svg" data-tex-font="20pt" data-tex-base-font="10pt" alt="[pict]"><div class="caption">Composition of maps.</div></div>');
    const visuals = normalizeVisuals($, directory, 'blocks');
    assert.deepEqual(visuals.map(visual => visual.kind), ['display-math', 'diagram']);
    assert.equal(visuals[0].alternativeKind, 'compiled-text');
    assert.equal(visuals[1].alternativeKind, 'caption');
    assert.equal(visuals[1].alternativeText, 'Composition of maps.');
    assert.equal(visuals[0].geometry.depthPt, 0);
    assert.ok(Math.abs(visuals[0].geometry.widthPt - 27 * 72.27 / 72) < 1e-10);
    const display = $('.tex-math').attr('style')!;
    const diagram = $('.tex-diagram').attr('style')!;
    assert.match(display, /--tex-font-ratio:2;width:1\.3550625em/);
    assert.match(diagram, /width:2\.710125em/);
    assert.doesNotMatch(display, /vertical-align/);
  });
});

test('missing or invalid inline metrics fail rather than publishing a guessed baseline', () => {
  fixture(directory => {
    for (const metrics of [
      'data-height="7pt" data-depth="2pt" data-em="10pt" data-base-em="10pt"',
      'data-width="20pt" data-height="7pt" data-em="10pt" data-base-em="10pt"',
      'data-width="NaN" data-height="7pt" data-depth="2pt" data-em="10pt" data-base-em="10pt"',
      'data-width="20pt" data-height="7pt" data-depth="-2pt" data-em="10pt" data-base-em="10pt"',
      'data-width="20pt" data-height="7pt" data-depth="2pt" data-em="0pt" data-base-em="10pt"',
      'data-width="20pt" data-height="7pt" data-depth="2pt" data-em="10pt"',
    ]) assert.throws(() => normalizeVisuals(load(inline('formula.svg', metrics)), directory, 'broken'), /(?:Missing or invalid|Invalid) TeX/);
    assert.throws(() => normalizeVisuals(load('<img class="math" src="formula.svg" alt="x">'), directory, 'broken'), /missing its TeX metrics/);
  });
  fixture(directory => {
    assert.throws(() => normalizeVisuals(load(inline()), directory, 'broken'), /missing the TeX baseline marker/);
  }, fixtureSvg.replace('<g data-tex-origin-x="0" data-tex-origin-y="0"/>', ''));
  fixture(directory => {
    assert.throws(() => normalizeVisuals(load(inline()), directory, 'broken'), /(?:Invalid|invalid).*?(?:origin|geometry|baseline)/);
  }, fixtureSvg.replace('data-tex-origin-x="0"', 'data-tex-origin-x="NaN"'));
  fixture(directory => {
    assert.throws(() => normalizeVisuals(load(inline()), directory, 'broken'), /(?:Invalid|invalid|missing).*?(?:origin|geometry|baseline)/);
  }, fixtureSvg.replace('data-tex-origin-x="0"', 'data-tex-origin-x=""'));
});

test('duplicate IDs and unresolved glyph or paint references inside a source SVG fail', () => {
  for (const [svg, expected] of [
    [fixtureSvg.replace('<clipPath id="clip">', '<clipPath id="glyph">'), /duplicate ID/],
    [fixtureSvg.replace('href="#glyph"', 'href="#missing"'), /unresolved SVG reference/],
    [fixtureSvg.replace('url(#clip)', 'url(#missing)'), /unresolved SVG paint reference/],
  ] as const) fixture(directory => {
    assert.throws(() => normalizeVisuals(load(inline()), directory, 'broken'), expected);
  }, svg);
});
