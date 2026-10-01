import * as cheerio from 'cheerio';
import postcss from 'postcss';
import type { Entry, OutlineItem } from '../src/lib/content-types';
import { normalizeVisuals } from './tex-visuals';

function localAsset(reference: string, slug: string): string {
  if (!reference || /^(?:#|\/|[a-z][a-z0-9+.-]*:)/i.test(reference)) return reference;
  const normalized = reference.replace(/^\.\//, '');
  if (normalized.startsWith('../')) throw new Error(`${slug}: an HTML asset escaped the document directory: ${reference}`);
  return `../../tex/${slug}/${normalized}`;
}

export function scopeCss(source: string, slug: string): string {
  const tree = postcss.parse(source);
  tree.walkAtRules('import', () => { throw new Error(`${slug}: CSS imports are not supported; bundle the asset locally.`); });
  tree.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    // The site owns page background and page width. Retain all document-level rules.
    const selectors = rule.selectors.filter((selector) => !/^(?:html|body|:root)(?:\b|$)/.test(selector.trim()));
    if (!selectors.length) { rule.remove(); return; }
    rule.selectors = selectors.map((selector) => `.tex-content ${selector}`);
  });
  tree.walkDecls((declaration) => {
    declaration.value = declaration.value.replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (_whole, _quote: string, url: string) => `url("${localAsset(url, slug)}")`);
  });
  return tree.toString();
}

export function extractDocument(source: string, css: string, slug: string, artifactsDirectory?: string): Pick<Entry, 'title' | 'html' | 'css' | 'outline' | 'visuals'> {
  const $ = cheerio.load(source);
  const visuals = artifactsDirectory ? normalizeVisuals($, artifactsDirectory, slug) : [];
  const title = $('h1.titleHead').first().text().replace(/\s+/g, ' ').trim() || $('title').text().trim();
  if (!title) throw new Error(`${slug}: compiled LaTeX has no title. Include \\title{...} and \\maketitle.`);
  $('.maketitle').remove();
  if ($('body script, body iframe, body object, body embed').length) throw new Error(`${slug}: executable embeds are not supported in compiled notes.`);
  $('body *').each((_index, element) => {
    for (const [attribute, value] of Object.entries(element.attribs)) {
      if (/^on/i.test(attribute) || /^(?:href|src)$/i.test(attribute) && /^\s*javascript:/i.test(value)) throw new Error(`${slug}: executable HTML is not supported in compiled notes.`);
    }
  });
  // MathML Core does not paint bare text inside layout nodes such as mrow.
  // Catch converter regressions (notably math after TikZ on older TeX4ht)
  // before publishing formulas with silently missing symbols.
  $('math, math *').each((_index, element) => {
    if (/^(mi|mn|mo|mtext|ms|annotation|annotation-xml)$/.test(element.tagName)
      || $(element).parents('annotation, annotation-xml').length) return;
    const invalid = $(element).contents().toArray().find(node => node.type === 'text' && node.data.trim());
    if (invalid?.type === 'text') throw new Error(`${slug}: malformed MathML: bare text '${invalid.data.trim().slice(0, 60)}' inside <${element.tagName}>. Inspect the TeX4ht configuration; publishing was stopped.`);
  });
  const outline: OutlineItem[] = [];
  $('.sectionHead, .likesectionHead, .subsectionHead, .likesubsectionHead, .subsubsectionHead, .likesubsubsectionHead').each((index, element) => {
    const heading = $(element);
    const classes = heading.attr('class') ?? '';
    const level = classes.includes('subsubsection') ? 4 : classes.includes('subsection') ? 3 : 2;
    const text = heading.clone();
    text.find('.titlemark').remove();
    const headingTitle = text.text().replace(/\s+/g, ' ').trim();
    const id = heading.attr('id') || `section-${index + 1}`;
    heading.attr('id', id);
    element.tagName = `h${level}`;
    outline.push({ id, title: headingTitle, level });
  });
  $('.newtheorem').each((_index, element) => {
    const name = $(element).find('.head').first().text().trim().match(/^(Definition|Theorem|Proposition|Lemma|Corollary|Example|Exercise|Remark)\b/i)?.[1];
    if (!$(element).attr('data-environment')) $(element).attr('data-environment', name?.toLowerCase() || 'statement');
    $(element).addClass('tex-statement');
  });
  $('.proof').addClass('tex-proof');
  $('p').addClass('tex-paragraph');
  // Normalize one visual + one number into a predictable, CSS-owned display.
  // Multi-line environments are one TeX visual so their internal alignment and
  // numbers remain exact. Named reference anchors stay in the HTML either way.
  if (artifactsDirectory) {
    $('table.equation, table.equation-star, div.math-display, div.tex-math-block, div.align').each((_index, element) => {
      const block = $(element);
      if (!block.parent().length || block.parents('.tex-display').length) return;
      const visual = block.find('.tex-math').first();
      if (block.find('.tex-math').length !== 1) return;
      const scroll = $('<div class="tex-display-scroll" tabindex="0" role="group" aria-label="Equation; scroll horizontally if needed"></div>');
      const display = $('<div class="tex-display"></div>').attr('data-tex-environment', block.attr('data-tex-environment') || (block.is('table') ? 'equation' : 'display'));
      if (block.attr('id')) scroll.attr('id', block.attr('id')!);
      const anchors = block.find('a[id]').toArray();
      for (const anchor of anchors) scroll.append($(anchor).remove());
      display.append(visual.remove());
      const number = block.find('td.eq-no,td.equation-label').first();
      if (number.length && number.text().trim()) display.append($('<span class="tex-equation-number"></span>').html(number.html() || ''));
      scroll.append(display);
      block.replaceWith(scroll);
    });
  }
  $('body [href], body [src], body [data]').each((_index, element) => {
    for (const attribute of ['href', 'src', 'data']) {
      const value = $(element).attr(attribute);
      if (value === undefined) continue;
      const sameDocument = value.replace(new RegExp(`^${slug}\\.html(?=#)`), '');
      $(element).attr(attribute, localAsset(sameDocument, slug));
    }
  });
  const ids = new Set<string>();
  $('body [id]').each((_index, element) => {
    const id = $(element).attr('id')!;
    if (ids.has(id)) throw new Error(`${slug}: duplicate compiled HTML anchor '${id}'.`);
    ids.add(id);
  });
  $('body a[href^="#"]').each((_index, element) => {
    const id = decodeURIComponent($(element).attr('href')!.slice(1));
    if (id && !ids.has(id)) throw new Error(`${slug}: broken compiled reference '#${id}'.`);
  });
  $('p').each((_index, element) => {
    if (!$(element).text().trim() && !$(element).find('math,img,svg,a[id]').length) $(element).remove();
  });
  $('table.equation, table.equation-star, table.align, table.align-star').each((_index, element) => {
    if (!$(element).parents('.tex-display-scroll').length) $(element).wrap('<div class="tex-display-scroll" tabindex="0" role="group" aria-label="Equation; scroll horizontally if needed"></div>');
  });
  // The site renders the title separately; its TeX graphics are not article
  // assets after the compiled maketitle block has been removed.
  const usedVisuals = new Set($('[data-tex-visual]').map((_index, element) => $(element).attr('data-tex-visual')).get());
  return { title, html: $('body').html()!.trim(), css: scopeCss(css, slug), outline, visuals: visuals.filter(visual => usedVisuals.has(visual.id)) };
}
