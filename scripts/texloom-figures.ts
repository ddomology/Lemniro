import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';
import { validateBundle, validateScenePackage, sceneFeatures, checkCapabilities, SVG_2D_PROFILE, type Bundle, type Resource, type ScenePackage } from 'texloom';
import { validateLemniroFigureReference } from 'texloom/lemniro';
import type { ContentBlock, LemniroFigureReference } from '../src/lib/texloom-types';

export type SceneCatalog = ReadonlyMap<string, LemniroFigureReference>;
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = (bytes: Uint8Array, label: string): unknown => {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)); }
  catch { throw new Error(`${label}: expected a valid UTF-8 JSON document.`); }
};

function inside(root: string, filename: string): boolean {
  const relative = path.relative(root, filename);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Catalog resources are repository files; runtime transport policy is separate. */
function assertPortablePath(relative: string): void {
  if (!relative || /[\\?#%\0]/.test(relative) || /^[a-z][a-z0-9+.-]*:/i.test(relative)
    || relative.startsWith('/') || relative.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Nonportable figure asset path: ${relative}`);
  }
}

export function publicFile(publicRoot: string, relative: string): string {
  assertPortablePath(relative);
  const root = realpathSync(publicRoot), candidate = path.resolve(root, relative);
  if (!inside(root, candidate) || !existsSync(candidate)) throw new Error(`Missing local figure asset: ${relative}`);
  const resolved = realpathSync(candidate);
  if (!inside(root, resolved) || !statSync(resolved).isFile()) throw new Error(`Figure asset escapes the public root: ${relative}`);
  return resolved;
}

/** Validate exact manifests and every hidden/visible payload before TeX publication. */
export function verifySceneReference(root: string, figure: LemniroFigureReference): void {
  const errors = validateLemniroFigureReference(figure);
  if (errors.some(error => error.severity === 'error')) throw new Error(`Invalid scene catalog entry: ${errors.map(error => error.message).join(' ')}`);
  const publicRoot = path.join(root, 'public');
  const manifestFile = publicFile(publicRoot, figure.manifestPath), manifestBytes = readFileSync(manifestFile);
  if (digest(manifestBytes) !== figure.manifestSha256) throw new Error(`${figure.id}: manifest SHA-256 mismatch.`);
  const input = json(manifestBytes, figure.manifestPath);
  const diagnostics = validateScenePackage(input);
  if (diagnostics.some(error => error.severity === 'error')) throw new Error(`${figure.id}: invalid scene package: ${diagnostics.map(error => error.message).join(' ')}`);
  const pkg = input as ScenePackage, resources: [string, Resource][] = [];
  if (!checkCapabilities(pkg.assets.requiredFeatures, SVG_2D_PROFILE).compatible) throw new Error(`${figure.id}: unsupported required renderer features.`);
  let total = 0;
  for (const entry of pkg.assets.entries) {
    total += entry.byteLength;
    if (entry.byteLength > 16 * 1024 * 1024 || total > 64 * 1024 * 1024) throw new Error(`${figure.id}: asset payload exceeds the default figure byte budget.`);
    let payload: Uint8Array;
    if (entry.source.kind === 'inline') payload = new TextEncoder().encode(entry.source.data);
    else {
      const base = path.posix.dirname(figure.manifestPath);
      // Validate the URI itself before joining: normalization must not hide ../.
      assertPortablePath(entry.source.uri);
      const relative = base === '.' ? entry.source.uri : `${base}/${entry.source.uri}`;
      const assetFile = publicFile(publicRoot, relative);
      const whole = readFileSync(assetFile), range = entry.source.byteRange;
      if (range && range.offset + range.length > whole.byteLength) throw new Error(`${figure.id}/${entry.id}: packed range exceeds its local file.`);
      payload = range ? whole.subarray(range.offset, range.offset + range.length) : whole;
    }
    if (payload.byteLength !== entry.byteLength || digest(payload) !== entry.sha256) throw new Error(`${figure.id}/${entry.id}: payload byte length or SHA-256 mismatch.`);
    const resource = json(payload, `${figure.id}/${entry.id}`) as Resource;
    if (!resource || resource.kind !== entry.kind || JSON.stringify(resource.kind === 'vector' ? resource.inkBounds : [0, 0, 1, 1]) !== JSON.stringify(entry.bounds)) {
      throw new Error(`${figure.id}/${entry.id}: resource kind or native bounds mismatch.`);
    }
    resources.push([entry.id, resource]);
  }
  const hydrated = { ...pkg.scene, resources: Object.fromEntries(resources) } as Bundle;
  const resourceErrors = validateBundle(hydrated);
  if (resourceErrors.some(error => error.severity === 'error')) throw new Error(`${figure.id}: invalid hydrated scene: ${resourceErrors.map(error => error.message).join(' ')}`);
  if (sceneFeatures(hydrated).some(feature => !pkg.assets.requiredFeatures.includes(feature))) throw new Error(`${figure.id}: manifest omits required renderer features.`);
  if (hydrated.viewport.width !== figure.width || hydrated.viewport.height !== figure.height || hydrated.duration !== figure.duration) throw new Error(`${figure.id}: catalog dimensions/duration disagree with the scene.`);
  const poster = readFileSync(publicFile(publicRoot, figure.posterPath), 'utf8');
  const $ = load(poster, { xml: true });
  if ($('svg').length !== 1 || $('script,foreignObject,iframe,object,embed,style,animate,animateMotion,animateTransform,set').length) throw new Error(`${figure.id}: poster must be a static SVG without executable, stylesheet or animation elements.`);
  $('*').each((_index, element) => {
    if (!('attribs' in element)) return;
    for (const [name, value] of Object.entries(element.attribs)) {
      if (/^on/i.test(name) || /^(href|xlink:href)$/i.test(name) && value && !value.startsWith('#')) throw new Error(`${figure.id}: poster contains an executable or external reference.`);
      for (const match of value.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) {
        if (!match[1].startsWith('#')) throw new Error(`${figure.id}: poster contains an external paint reference.`);
      }
    }
  });
}

export function loadSceneCatalog(root: string): SceneCatalog {
  const filename = path.join(root, 'content', 'scenes.json');
  if (!existsSync(filename)) return new Map();
  const input = json(readFileSync(filename), filename);
  if (!Array.isArray(input) || input.length > 4096) throw new Error('content/scenes.json must be an array of at most 4096 figure references.');
  const catalog = new Map<string, LemniroFigureReference>();
  for (const item of input) {
    const diagnostics = validateLemniroFigureReference(item);
    if (diagnostics.some(error => error.severity === 'error')) throw new Error(`Invalid scene catalog entry: ${diagnostics.map(error => error.message).join(' ')}`);
    const figure = item as LemniroFigureReference;
    if (catalog.has(figure.id)) throw new Error(`Duplicate scene catalog ID: ${figure.id}`);
    verifySceneReference(root, figure);
    catalog.set(figure.id, Object.freeze(structuredClone(figure)));
  }
  return catalog;
}

/** Literal IDs give authors a deterministic registry rather than arbitrary embeds. */
export function authoredSceneIds(source: string, catalog: SceneCatalog, label: string): string[] {
  const uncommented = source.split(/\r?\n/).map(line => {
    for (let i = 0; i < line.length; i++) if (line[i] === '%') {
      let slashes = 0; for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) slashes++;
      if (slashes % 2 === 0) return line.slice(0, i);
    }
    return line;
  }).join('\n');
  const ids: string[] = [];
  for (const match of uncommented.matchAll(/\\LemniroScene\s*\{([^}]*)\}/g)) {
    const id = match[1];
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${label}: LemniroScene requires a literal lowercase hyphenated catalog ID.`);
    if (!catalog.has(id)) throw new Error(`${label}: unknown LemniroScene reference '${id}'. Register and verify it in content/scenes.json.`);
    ids.push(id);
  }
  return ids;
}

export function assertFigurePlaceholderStructure(source: string, slug: string): void {
  if (!source.includes('data-texloom-ref')) return;
  // htmlparser2 retains table nesting, avoiding HTML5 foster-parenting that
  // could otherwise silently promote a misplaced placeholder to document level.
  const $ = load(source, { xml: { xmlMode: false, decodeEntities: true } });
  $('[data-texloom-ref]').each((_index, element) => {
    if (element.tagName !== 'div' || $(element).parent()[0]?.type !== 'tag'
      || ($(element).parent()[0] as { tagName?: string }).tagName !== 'body') {
      throw new Error(`${slug}: LemniroScene figures must be document-level blocks, outside paragraphs, theorems, proofs, lists and tables.`);
    }
  });
}

/** Called after local TeX asset rewriting; poster paths are already article-relative. */
export function normalizeTexloomFigures($: CheerioAPI, catalog: SceneCatalog, slug: string): ContentBlock[] | undefined {
  const figures = new Map<object, LemniroFigureReference>();
  $('body [data-texloom-ref]').each((index, element) => {
    const placeholder = $(element), id = placeholder.attr('data-texloom-ref')!;
    if (element.tagName !== 'div' || placeholder.parent()[0]?.type !== 'tag'
      || (placeholder.parent()[0] as { tagName?: string }).tagName !== 'body') throw new Error(`${slug}: nested LemniroScene reference '${id}' is unsupported.`);
    if (Object.keys(element.attribs).some(name => name !== 'data-texloom-ref') || placeholder.html()?.trim()) throw new Error(`${slug}: invalid LemniroScene placeholder data.`);
    const figure = catalog.get(id);
    if (!figure) throw new Error(`${slug}: unknown LemniroScene reference '${id}'.`);
    const blockId = `texloom-${slug}-${index + 1}`;
    if ($('body [id]').toArray().some(node => $(node).attr('id') === blockId)) throw new Error(`${slug}: generated figure anchor conflicts with '${blockId}'.`);
    const block = $('<figure class="texloom-static-figure"></figure>').attr('id', blockId);
    block.append($('<img loading="lazy" decoding="async">').attr({ src: `../../${figure.posterPath}`, alt: figure.description,
      width: String(figure.width), height: String(figure.height) }));
    block.append($('<figcaption></figcaption>').append($('<strong></strong>').text(figure.title), ' — ', $('<span></span>').text(figure.description)));
    placeholder.replaceWith(block);figures.set(block[0], structuredClone(figure));
  });
  if (!figures.size) return undefined;
  const blocks: ContentBlock[] = [];let prose = '';
  const flush = () => { if (prose.trim()) blocks.push({ kind: 'html', html: prose.trim() }); prose = ''; };
  for (const node of $('body').contents().toArray()) {
    const figure = figures.get(node);
    if (figure) { flush();blocks.push({ kind: 'texloom', figure }); }
    else prose += $.html(node);
  }
  flush();return blocks;
}
