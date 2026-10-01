import Link from 'next/link';
import type { Entry } from '@/lib/content';
import { entryPath } from '@/lib/content';
import { Arrow } from './brand';

export function EntryCard({ entry, index, variant = 'note' }: { entry: Entry; index?: number; variant?: 'note' | 'journal' }) {
  return <article className={`entry-card entry-card-${variant}`}>
    <div className="entry-card-meta"><span>{entry.topic}</span>{index !== undefined ? <span className="entry-number">{String(index + 1).padStart(2, '0')}</span> : <span>{entry.readingMinutes} min read</span>}</div>
    <h3><Link href={entryPath(entry)}>{entry.title}</Link></h3>
    <p>{entry.description}</p>
    <div className="entry-card-bottom"><span>{entry.series || (variant === 'note' ? 'Lecture notes' : 'From the journal')}{variant === 'note' ? ` · ${entry.readingMinutes} min` : ''}</span><Arrow /></div>
  </article>;
}
