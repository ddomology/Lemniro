import entries from '../../generated/content.json';
import type { ContentKind, Entry } from './content-types';

export type { ContentKind, Entry, ContentEntry, EntryMetadata, OutlineItem } from './content-types';

export function getAllEntries(kind?: ContentKind): Entry[] {
  return (entries as Entry[])
    .filter((entry) => !kind || entry.kind === kind)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
      || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function getEntry(slug: string): Entry | undefined {
  return getAllEntries().find((entry) => entry.slug === slug);
}

export function entryPath<T extends Pick<Entry, 'kind' | 'slug'>>(entry: T): string {
  return `/${entry.kind === 'note' ? 'notes' : 'journal'}/${entry.slug}/`;
}
