import type { MetadataRoute } from 'next';
import { getAllEntries, entryPath } from '@/lib/content';
import { absolute } from '@/lib/site';

export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...['/', '/notes/', '/journal/', '/lectures/', '/about/'].map(path => ({ url: absolute(path) })),
    ...getAllEntries().map(entry => ({ url: absolute(entryPath(entry)), lastModified: entry.date })),
  ];
}
