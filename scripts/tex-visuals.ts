import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';
import type { TexVisual } from '../src/lib/tex-visual-types';

const PT_TO_BP = 72 / 72.27;
const rounded = (value: number) => Number(value.toFixed(7));

function number(value: string | undefined, label: string, positive = false): number {
  if (value === undefined || !/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:pt)?$/.test(value)) throw new Error(`Missing or invalid TeX ${label}: ${value}`);
  const parsed = Number(value.replace(/pt$/, ''));
  if (!Number.isFinite(parsed) || (positive ? parsed <= 0 : parsed < 0)) throw new Error(`Invalid TeX ${label}: ${value}`);
  return parsed;
}

/** Keep advance width and baseline independent of the ink's tight bounding box. */
export function logicalViewBox(origin: [number, number], geometry: TexVisual['geometry']): [number, number, number, number] {
  const { widthPt, heightPt, depthPt } = geometry;
  if (![...origin, widthPt, heightPt, depthPt].every(Number.isFinite) || widthPt < 0 || heightPt < 0 || depthPt < 0) throw new Error('Invalid logical TeX geometry');
  // TeX legitimately emits zero-size boxes (smash, laps, struts). A nonzero
  // SVG viewport lets their overflowing ink paint; the HTML box stays exact.
  return [origin[0], origin[1] - heightPt * PT_TO_BP, (widthPt || 1) * PT_TO_BP, (heightPt + depthPt || 1) * PT_TO_BP].map(rounded) as [number, number, number, number];
}

/** Inline each compiler-produced SVG in a separate ID namespace so CSS color works. */
export function normalizeVisuals($: CheerioAPI, directory: string, slug: string): TexVisual[] {
  const visuals: TexVisual[] = [];
  const files = new Map<string, string>();
  $('img[src$=".svg"]').each((_index, element) => {
    const img = $(element);
    const filename = img.attr('src')!;
    if (path.basename(filename) !== filename || filename.includes('\\')) throw new Error(`${slug}: nonlocal SVG asset ${filename}`);
    const raw = files.get(filename) ?? readFileSync(path.join(directory, filename), 'utf8');
    files.set(filename, raw);
    const svgDoc = load(raw, { xml: true });
    const svg = svgDoc('svg').first();
    if (!svg.length || svgDoc('script,foreignObject,iframe').length) throw new Error(`${slug}: invalid SVG ${filename}`);
    const ink = (svg.attr('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
    const metrics = img.closest('.tex-inline-metric');
    const inline = metrics.length > 0;
    if (ink.length !== 4 || !ink.every(Number.isFinite) || ink[2] < 0 || ink[3] < 0 || (!inline && (!ink[2] || !ink[3]))) throw new Error(`${slug}: invalid SVG viewBox ${filename}`);
    const silent = inline && ink[2] === 0 && ink[3] === 0;
    const display = !inline && (img.is('.math-display,.tex-block-svg') || img.parents('.math-display,.tex-math-block,.align,.gather,.multline,.equation,.equation-star').length > 0);
    if (img.hasClass('math') && !inline) throw new Error(`${slug}: inline math is missing its TeX metrics`);
    const fontSizePt = number(img.attr('data-tex-font') ?? metrics.attr('data-em'), 'font size', true);
    const baseFontSizePt = number(img.attr('data-tex-base-font') ?? metrics.attr('data-base-em'), 'base font size', true);
    const kind: TexVisual['kind'] = inline ? 'inline-math' : display ? 'display-math' : 'diagram';
    const id = `${slug}-visual-${visuals.length + 1}`;
    let geometry: TexVisual['geometry'];
    if (inline) {
      geometry = { widthPt: number(metrics.attr('data-width'), 'width'), heightPt: number(metrics.attr('data-height'), 'height'), depthPt: number(metrics.attr('data-depth'), 'depth') };
      const marker = svgDoc('[data-tex-origin-x][data-tex-origin-y]').first();
      if (!marker.length) throw new Error(`${slug}: SVG is missing the TeX baseline marker`);
      const coordinates = [marker.attr('data-tex-origin-x'), marker.attr('data-tex-origin-y')];
      if (!coordinates.every(value => value !== undefined && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))) throw new Error(`${slug}: invalid TeX baseline origin`);
      const origin: [number, number] = [Number(coordinates[0]), Number(coordinates[1])];
      svg.attr('viewBox', logicalViewBox(origin, geometry).join(' '));
      if (!geometry.widthPt || !(geometry.heightPt + geometry.depthPt)) {
        svg.attr('style', `width:${rounded((geometry.widthPt || 1) / fontSizePt)}em;height:${rounded((geometry.heightPt + geometry.depthPt || 1) / fontSizePt)}em;`);
      }
    } else {
      geometry = { widthPt: ink[2] / PT_TO_BP, heightPt: ink[3] / PT_TO_BP, depthPt: 0 };
    }
    svgDoc('[data-tex-origin-x]').remove();
    const ids = new Map<string, string>();
    svgDoc('[id]').each((_i, node) => {
      const old = svgDoc(node).attr('id')!;
      if (ids.has(old)) throw new Error(`${slug}: duplicate ID inside ${filename}`);
      ids.set(old, `${id}-${old}`);
    });
    svgDoc('*').each((_i, node) => {
      if (!('attribs' in node)) return;
      for (const [attribute, value] of Object.entries(node.attribs)) {
        if (/^on/i.test(attribute)) throw new Error(`${slug}: executable SVG attribute`);
        if (attribute === 'id') svgDoc(node).attr(attribute, ids.get(value)!);
        else if (attribute === 'href' || attribute === 'xlink:href') {
          if (value.startsWith('#')) {
            const target = ids.get(value.slice(1));
            if (!target) throw new Error(`${slug}: unresolved SVG reference ${value}`);
            svgDoc(node).attr(attribute, `#${target}`);
          } else if (!/^data:image\//.test(value)) throw new Error(`${slug}: external SVG dependency ${value}`);
        } else {
          let changed = value.replace(/url\(['"]?#([^)'"\s]+)['"]?\)/g, (_all, old: string) => {
            const target = ids.get(old);
            if (!target) throw new Error(`${slug}: unresolved SVG paint reference #${old}`);
            return `url(#${target})`;
          });
          if (/^(fill|stroke)$/.test(attribute) && /^(black|#000000|#000)$/i.test(changed)) changed = 'currentColor';
          if (changed !== value) svgDoc(node).attr(attribute, changed);
        }
      }
    });
    svg.removeAttr('width').removeAttr('height').attr({ 'aria-hidden': 'true', focusable: 'false', 'data-tex-svg': 'true' });
    if (!svg.attr('fill')) svg.attr('fill', 'currentColor');
    const caption = img.closest('.figure').find('.caption').text().replace(/\s+/g, ' ').trim();
    const compiledText = (img.attr('alt') ?? '').replace(/\s+/g, ' ').trim();
    const generic = !compiledText || /^\[?(?:pict|picture)\]?$/i.test(compiledText);
    const alternativeText = silent ? '' : generic ? caption || (display ? 'Displayed mathematics' : 'Diagram') : compiledText;
    const layoutViewBox = svg.attr('viewBox')!.split(/[\s,]+/).map(Number) as TexVisual['layoutViewBox'];
    const visual: TexVisual = { id, kind, asset: `/tex/${slug}/${filename}`, sha256: createHash('sha256').update(raw).digest('hex'), alternativeText, alternativeKind: silent ? 'silent' : generic ? caption ? 'caption' : 'generic' : 'compiled-text', fontSizePt, baseFontSizePt, geometry, inkViewBox: ink as TexVisual['inkViewBox'], layoutViewBox };
    visuals.push(visual);
    const denominator = kind === 'diagram' ? baseFontSizePt : fontSizePt;
    const wrapper = $('<span></span>').attr({ class: kind === 'diagram' ? 'tex-diagram' : 'tex-math', 'data-tex-visual': id, 'data-tex-kind': kind, role: 'img', 'aria-label': alternativeText });
    if (silent) wrapper.removeAttr('role').removeAttr('aria-label').attr('aria-hidden', 'true');
    const dimensions = kind === 'diagram'
      ? `width:${rounded(geometry.widthPt / denominator)}em;aspect-ratio:${rounded(geometry.widthPt / (geometry.heightPt + geometry.depthPt))};`
      : `width:${rounded(geometry.widthPt / denominator)}em;height:${rounded((geometry.heightPt + geometry.depthPt) / denominator)}em;`;
    wrapper.attr('style', `--tex-font-ratio:${rounded(fontSizePt / baseFontSizePt)};${dimensions}${inline ? `vertical-align:${rounded(-geometry.depthPt / denominator)}em;` : ''}`);
    // Alternative text participates in headings, search and copy without exposing
    // SVG glyph definitions. It is explicitly not advertised as semantic MathML.
    const text = $('<span class="tex-visual-text" aria-hidden="true"></span>').text(alternativeText);
    if (!silent) wrapper.append(text);
    wrapper.append(svg.toString());
    if (inline) metrics.replaceWith(wrapper); else img.replaceWith(wrapper);
  });
  if ($('img.math, .tex-inline-metric').length) throw new Error(`${slug}: incomplete math conversion`);
  return visuals;
}
