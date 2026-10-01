import type { Metadata } from 'next';
import { getAllEntries } from '@/lib/content';
import { absolute } from '@/lib/site';
import { EntryCard } from '@/components/entry-card';

export const metadata: Metadata = { title: 'The journal', description: 'Ideas, examples, and reflections from the margins of the mathematics notebook.', alternates: { canonical: absolute('/journal/') } };
export default function JournalPage() { const entries = getAllEntries().filter(entry => entry.kind === 'journal'); return <div className="shell collection-page"><header className="collection-header"><div className="eyebrow">In the margins</div><h1>The journal.</h1><p>Some ideas need a different kind of page.<br />Examples, questions, and the connections in between.</p></header><div className="journal-grid">{entries.map(entry => <EntryCard key={entry.slug} entry={entry} variant="journal" />)}</div>{entries.length === 0 && <div className="empty-state"><p>The first journal entry is on its way.</p></div>}</div>; }
