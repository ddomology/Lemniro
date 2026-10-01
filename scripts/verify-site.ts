import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { load } from 'cheerio';

const output = path.resolve('out');
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const origin = 'https://site.test';
const files = fs.readdirSync(output, { recursive: true }).filter((file): file is string => typeof file === 'string' && file.endsWith('.html'));
const documents = new Map(files.map(file => [path.resolve(output, file), load(fs.readFileSync(path.join(output, file), 'utf8'))]));
const failures: string[] = [];
let links = 0;
for (const [file, $] of documents) {
  const relative = path.relative(output, file).replaceAll(path.sep, '/');
  const current = new URL(`${base}/${relative.replace(/index\.html$/, '')}`, origin);
  $('a[href], link[href], script[src], img[src]').each((_, element) => {
    if (element.tagName === 'link' && /^(preconnect|dns-prefetch)$/.test($(element).attr('rel') || '')) return;
    const link = $(element).attr('href') || $(element).attr('src') || '';
    if (/^(mailto:|data:|tel:|https?:\/\/)/i.test(link)) return;
    const url = new URL(link, current);
    if (url.origin !== origin) return;
    if (base && !url.pathname.startsWith(`${base}/`) && url.pathname !== base) {
      failures.push(`${relative}: URL misses deployment base: ${link}`); return;
    }
    const local = decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//, '');
    let target = path.resolve(output, local);
    if (!target.startsWith(output + path.sep) && target !== output) {
      failures.push(`${relative}: URL outside export: ${link}`); return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) { failures.push(`${relative}: missing target: ${link}`); return; }
    const targetDoc = documents.get(target);
    if (url.hash && targetDoc) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!targetDoc('[id], [name]').toArray().some(node => targetDoc(node).attr('id') === id || targetDoc(node).attr('name') === id)) failures.push(`${relative}: broken fragment: ${link}`);
    }
    links++;
  });
}
const entries = JSON.parse(fs.readFileSync('generated/content.json', 'utf8')) as Array<{ slug: string; kind: string; title: string; html: string }>;
for (const entry of entries) {
  const file = path.resolve(output, entry.kind === 'journal' ? 'journal' : 'notes', entry.slug, 'index.html');
  const $ = documents.get(file);
  if (!$) { failures.push(`Missing article ${entry.slug}`); continue; }
  if (!$('.tex-content').text().trim()) failures.push(`Empty article ${entry.slug}`);
  const expectedMath = load(entry.html)('math').length;
  if ($('.tex-content math').length !== expectedMath) failures.push(`MathML count changed while exporting ${entry.slug}`);
  if (!$('link[rel="canonical"]').attr('href')?.includes(entry.slug)) failures.push(`Missing canonical for ${entry.slug}`);
}
assert.ok(fs.existsSync(path.join(output, '.nojekyll')), 'Missing .nojekyll');
assert.ok(fs.existsSync(path.join(output, 'sitemap.xml')), 'Missing sitemap');
assert.ok(fs.existsSync(path.join(output, 'feed.xml')), 'Missing RSS feed');
assert.equal(failures.length, 0, failures.join('\n'));
console.log(`Verified ${files.length} HTML files, ${links} internal links/assets, and ${entries.length} TeX articles.`);
