import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as cheerio from 'cheerio';
import postcss from 'postcss';
import type { Entry, EntryMetadata, OutlineItem } from '../src/lib/content-types';

export function parseMetadata(source: string, sourceName = 'LaTeX source'): EntryMetadata {
  const matches = [...source.matchAll(/^%\s*lemniro:\s*(\{[^\r\n]*\})\s*$/gm)];
  if (matches.length !== 1) throw new Error(`${sourceName}: exactly one '% lemniro: {...}' JSON comment is required.`);
  let value: Record<string, unknown>;
  try { value = JSON.parse(matches[0][1]) as Record<string, unknown>; }
  catch { throw new Error(`${sourceName}: the lemniro metadata comment is not valid JSON.`); }
  const allowed = new Set(['kind', 'description', 'topic', 'series', 'order', 'date', 'readingMinutes', 'prerequisites', 'related', 'videoId']);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${sourceName}: unknown metadata field '${key}'. The title belongs in LaTeX \\title{...}.`);
  }
  for (const key of ['description', 'topic', 'date']) {
    if (typeof value[key] !== 'string' || !(value[key] as string).trim()) throw new Error(`${sourceName}: '${key}' must be a nonempty string.`);
  }
  if (value.kind !== 'note' && value.kind !== 'journal') throw new Error(`${sourceName}: kind must be 'note' or 'journal'.`);
  const date = new Date(`${value.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date as string)
    || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.date) {
    throw new Error(`${sourceName}: date must be a valid YYYY-MM-DD date.`);
  }
  if (!Number.isInteger(value.readingMinutes) || Number(value.readingMinutes) < 1) throw new Error(`${sourceName}: readingMinutes must be a positive integer.`);
  for (const key of ['prerequisites', 'related']) {
    if (!Array.isArray(value[key]) || !(value[key] as unknown[]).every((item) => typeof item === 'string' && item.trim().length > 0)) {
      throw new Error(`${sourceName}: '${key}' must be an array of nonempty strings.`);
    }
  }
  if (!(value.related as string[]).every((item) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item))) throw new Error(`${sourceName}: related must contain entry slugs.`);
  if (new Set(value.related as string[]).size !== (value.related as string[]).length) throw new Error(`${sourceName}: related entry slugs must not be duplicated.`);
  if (value.series !== undefined && (typeof value.series !== 'string' || !value.series.trim())) throw new Error(`${sourceName}: series must be a nonempty string.`);
  if (value.order !== undefined && (!Number.isInteger(value.order) || Number(value.order) < 1)) throw new Error(`${sourceName}: order must be a positive integer.`);
  if (value.videoId !== undefined && (typeof value.videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(value.videoId))) throw new Error(`${sourceName}: videoId must be an 11-character YouTube ID.`);
  return value as unknown as EntryMetadata;
}

export function assertResolvedLog(log: string, label: string): void {
  const failure = log.match(/(?:^! .+|LaTeX Error:[^\n]+|(?:LaTeX|Package [\w-]+) Warning: [^\n]*(?:undefined|multiply defined)|There were undefined (?:references|citations)|Label\(s\) may have changed|Emergency stop|Fatal error occurred)/m);
  if (failure) throw new Error(`${label}: ${failure[0]}. Inspect the compiler log; publishing was stopped.`);
}

function within(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Flatten literal local inputs for a standalone downloadable .tex, without interpreting TeX. */
export function standaloneSource(root: string, filename: string, stack: string[] = []): string {
  const absolute = path.resolve(root, filename);
  if (!within(root, absolute)) throw new Error(`Source input escapes the repository: ${filename}`);
  if (stack.includes(absolute)) throw new Error(`Circular LaTeX input: ${[...stack, absolute].join(' -> ')}`);
  const source = readFileSync(absolute, 'utf8');
  return source.replace(/\\(input|include)\s*\{([^}]+)\}/g, (original, command: string, input: string, offset: number) => {
    const line = source.slice(source.lastIndexOf('\n', offset) + 1, offset);
    // Do not expand examples or instructions that occur in a TeX comment.
    if (/(^|[^\\])%/.test(line)) return original;
    if (!/^[\w./-]+$/.test(input)) throw new Error(`${filename}: the downloadable source requires literal local input filenames, found '${input}'.`);
    const requested = input.endsWith('.tex') ? input : `${input}.tex`;
    const rootPath = path.resolve(root, requested);
    const adjacentPath = path.resolve(path.dirname(absolute), requested);
    const resolved = existsSync(rootPath) ? rootPath : adjacentPath;
    if (!within(root, resolved) || !existsSync(resolved)) throw new Error(`${filename}: missing local input '${input}'.`);
    const relative = path.relative(root, resolved).replaceAll(path.sep, '/');
    const flattened = standaloneSource(root, relative, [...stack, absolute]);
    return `${command === 'include' ? '\\clearpage\n' : ''}% Begin shared source: ${relative}\n${flattened}\n% End shared source: ${relative}\n${command === 'include' ? '\\clearpage\n' : ''}`;
  });
}

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

export function extractDocument(source: string, css: string, slug: string): Pick<Entry, 'title' | 'html' | 'css' | 'outline'> {
  const $ = cheerio.load(source);
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
  });
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
  return { title, html: $('body').html()!.trim(), css: scopeCss(css, slug), outline };
}

function run(command: string, args: string[], directory: string, logName: string): void {
  const result = spawnSync(command, args, { cwd: directory, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180_000, windowsHide: true, shell: false });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const logPath = path.join(directory, logName);
  writeFileSync(logPath, output);
  if (result.error || result.status !== 0) {
    const message = result.error?.message ?? `exit code ${result.status}`;
    throw new Error(`${command} failed (${message}). Install TeX Live with make4ht/TeX4ht and pdfLaTeX, or set MAKE4HT_BIN/PDFLATEX_BIN.\nLog: ${logPath}\n${output.slice(-4500)}`);
  }
}

export function compileEntry(root: string, relativeSource: string): Entry {
  const source = readFileSync(path.join(root, relativeSource), 'utf8');
  const metadata = parseMetadata(source, relativeSource);
  const slug = path.basename(relativeSource, '.tex');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Use a lowercase hyphenated source filename: ${relativeSource}`);
  const expectedFolder = metadata.kind === 'note' ? 'notes' : 'journal';
  if (relativeSource.replaceAll(path.sep, '/').split('/')[1] !== expectedFolder) throw new Error(`${relativeSource}: metadata kind does not match its folder.`);
  const standalone = standaloneSource(root, relativeSource);
  const work = path.join(root, '.build', 'tex', slug);
  if (!within(path.join(root, '.build'), work)) throw new Error('Invalid build directory.');
  // Clear only this generated compiler directory; stale .aux files must not mask bad references.
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  for (const directory of ['tex', 'content']) cpSync(path.join(root, directory), path.join(work, directory), { recursive: true });
  for (const directory of ['html', 'pdf']) mkdirSync(path.join(work, directory));
  const texOptions = '-no-shell-escape -interaction=nonstopmode -halt-on-error -file-line-error';
  run(process.env.MAKE4HT_BIN || 'make4ht', ['-a', 'warning', '-f', 'html5', '-c', 'tex/lemniro-html.cfg', '-d', 'html', relativeSource.replaceAll(path.sep, '/'), 'mathml,svg', '', '', texOptions], work, 'make4ht-command.log');
  assertResolvedLog(readFileSync(path.join(work, `${slug}.log`), 'utf8'), `${relativeSource} (HTML)`);
  const pdfArgs = ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-output-directory=pdf', relativeSource.replaceAll(path.sep, '/')];
  for (let pass = 1; pass <= 2; pass++) run(process.env.PDFLATEX_BIN || 'pdflatex', pdfArgs, work, `pdflatex-pass-${pass}.log`);
  assertResolvedLog(readFileSync(path.join(work, 'pdf', `${slug}.log`), 'utf8'), `${relativeSource} (PDF)`);
  const htmlFile = path.join(work, 'html', `${slug}.html`);
  const cssFile = path.join(work, 'html', `${slug}.css`);
  const compiled = extractDocument(readFileSync(htmlFile, 'utf8'), readFileSync(cssFile, 'utf8'), slug);
  const destination = path.join(root, '.build', 'tex-publish', slug);
  mkdirSync(destination, { recursive: true });
  cpSync(path.join(work, 'html'), destination, { recursive: true });
  cpSync(path.join(work, 'pdf', `${slug}.pdf`), path.join(destination, `${slug}.pdf`));
  writeFileSync(path.join(destination, `${slug}.tex`), `% Standalone download; generated from ${relativeSource.replaceAll(path.sep, '/')} and its local inputs.\n${standalone}`);
  const sourceSha256 = createHash('sha256').update(standalone).digest('hex');
  const entry: Entry = {
    ...metadata, slug, ...compiled,
    pdfPath: `/tex/${slug}/${slug}.pdf`,
    sourcePath: `/tex/${slug}/${slug}.tex`,
    assetsPath: `/tex/${slug}/`, sourceSha256,
    compiler: { html: 'make4ht/TeX4ht', pdf: 'pdfLaTeX', math: 'MathML' },
  };
  writeFileSync(path.join(destination, 'provenance.json'), `${JSON.stringify({ source: relativeSource.replaceAll(path.sep, '/'), sourceSha256, compiler: entry.compiler }, null, 2)}\n`);
  return entry;
}

export function buildContent(root: string): Entry[] {
  const sources = ['notes', 'journal'].flatMap((kind) => {
    const directory = path.join(root, 'content', kind);
    return readdirSync(directory).filter((file) => file.endsWith('.tex')).sort().map((file) => path.join('content', kind, file));
  });
  if (!sources.length) throw new Error('No .tex documents were found in content/notes or content/journal.');
  const slugs = sources.map((source) => path.basename(source, '.tex'));
  if (new Set(slugs).size !== slugs.length) throw new Error('Each source filename must have a globally unique slug.');
  const stage = path.join(root, '.build', 'tex-publish');
  if (!within(path.join(root, '.build'), stage)) throw new Error('Invalid publication staging directory.');
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  const entries = sources.map((source) => {
    console.log(`Compiling ${source.replaceAll(path.sep, '/')} → HTML + MathML + PDF`);
    const entry = compileEntry(root, source);
    console.log(`  ${entry.title}: ${entry.outline.length} sections`);
    return entry;
  });
  for (const entry of entries) {
    for (const related of entry.related) {
      if (!slugs.includes(related) || related === entry.slug) throw new Error(`${entry.slug}: invalid related entry '${related}'.`);
    }
  }
  const target = path.join(root, 'public', 'tex');
  if (!within(path.join(root, 'public'), target)) throw new Error('Invalid generated asset directory.');
  // Publish only after all sources compile, so a failed source never yields a partial manifest.
  rmSync(target, { recursive: true, force: true });
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(stage, target, { recursive: true });
  mkdirSync(path.join(root, 'generated'), { recursive: true });
  writeFileSync(path.join(root, 'generated', 'content.json'), `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`Prepared ${entries.length} LaTeX documents. No separate HTML or Markdown content is authored.`);
  return entries;
}
