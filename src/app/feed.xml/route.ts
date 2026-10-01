import { getAllEntries, entryPath } from '@/lib/content';
import { absolute, site } from '@/lib/site';

export const dynamic = 'force-static';
const xml = (value: string) => value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
export function GET() {
  const entries = getAllEntries().toSorted((a, b) => b.date.localeCompare(a.date));
  const items = entries.map(entry => `<item><title>${xml(entry.title)}</title><link>${xml(absolute(entryPath(entry)))}</link><guid isPermaLink="true">${xml(absolute(entryPath(entry)))}</guid><description>${xml(entry.description)}</description><pubDate>${new Date(entry.date + 'T00:00:00Z').toUTCString()}</pubDate></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${site.name}</title><link>${xml(absolute())}</link><description>${xml(site.description)}</description><language>en</language><atom:link href="${xml(absolute('/feed.xml'))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
