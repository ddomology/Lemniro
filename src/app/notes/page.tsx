import type { Metadata } from 'next';
import { getAllEntries, entryPath } from '@/lib/content';
import { absolute } from '@/lib/site';
import { NotesLibrary } from '@/components/notes-library';

export const metadata: Metadata = { title: 'Lecture notes', description: 'Open mathematics lecture notes with definitions, examples, and complete proofs. Read online or keep a PDF.', alternates: { canonical: absolute('/notes/') } };

export default function NotesPage() {
  const entries = getAllEntries().filter(entry => entry.kind === 'note').map(entry => ({ slug: entry.slug, title: entry.title, description: entry.description, topic: entry.topic, series: entry.series, readingMinutes: entry.readingMinutes, href: entryPath(entry) }));
  return <div className="shell collection-page"><header className="collection-header"><div className="eyebrow">The open notebook</div><h1>One idea at a time.</h1><p>Definitions to begin with. Proofs to work through.<br />Notes to return to when the idea needs a little room.</p></header><NotesLibrary entries={entries} /><div className="collection-postscript"><span aria-hidden="true">∎</span><p>Every set of notes is free to read online, with a PDF and its LaTeX source alongside it.</p></div></div>;
}
