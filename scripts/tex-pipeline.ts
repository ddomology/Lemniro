import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Entry, EntryMetadata } from '../src/lib/content-types';
import { extractDocument } from './tex-document';
export { extractDocument, scopeCss } from './tex-document';

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
  run(process.env.MAKE4HT_BIN || 'make4ht', ['-a', 'warning', '-f', 'html5+dvisvgm_hashes', '-c', 'tex/lemniro-html.cfg', '-e', 'tex/lemniro.mk4', '-d', 'html', relativeSource.replaceAll(path.sep, '/'), 'pic-m,pic-equation,pic-align,svg', '', '', texOptions], work, 'make4ht-command.log');
  assertResolvedLog(readFileSync(path.join(work, `${slug}.log`), 'utf8'), `${relativeSource} (HTML)`);
  const pdfArgs = ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-output-directory=pdf', relativeSource.replaceAll(path.sep, '/')];
  for (let pass = 1; pass <= 2; pass++) run(process.env.PDFLATEX_BIN || 'pdflatex', pdfArgs, work, `pdflatex-pass-${pass}.log`);
  assertResolvedLog(readFileSync(path.join(work, 'pdf', `${slug}.log`), 'utf8'), `${relativeSource} (PDF)`);
  const htmlFile = path.join(work, 'html', `${slug}.html`);
  const cssFile = path.join(work, 'html', `${slug}.css`);
  const compiled = extractDocument(readFileSync(htmlFile, 'utf8'), readFileSync(cssFile, 'utf8'), slug, path.join(work, 'html'));
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
    compiler: { html: 'make4ht/TeX4ht', pdf: 'pdfLaTeX', math: 'TeX/dvisvgm', protocol: 1 },
  };
  writeFileSync(path.join(destination, 'provenance.json'), `${JSON.stringify({ source: relativeSource.replaceAll(path.sep, '/'), sourceSha256, compiler: entry.compiler }, null, 2)}\n`);
  writeFileSync(path.join(destination, 'visuals.json'), `${JSON.stringify(compiled.visuals, null, 2)}\n`);
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
    console.log(`Compiling ${source.replaceAll(path.sep, '/')} → HTML + TeX SVG + PDF`);
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
