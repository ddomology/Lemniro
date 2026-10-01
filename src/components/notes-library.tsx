'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Arrow } from './brand';

type NoteSummary = { slug: string; title: string; description: string; topic: string; series?: string; readingMinutes: number; href: string; };

export function NotesLibrary({ entries }: { entries: NoteSummary[] }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All notes');
  const topics = [...new Set(entries.map(entry => entry.topic))];
  const visible = entries.filter(entry => (topic === 'All notes' || entry.topic === topic) && `${entry.title} ${entry.description} ${entry.topic} ${entry.series || ''}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <div className="note-library">
    <div className="library-toolbar">
      <div className="topic-filters" role="group" aria-label="Filter by topic">{['All notes', ...topics].map(label => <button type="button" className={topic === label ? 'active' : ''} aria-pressed={topic === label} key={label} onClick={() => setTopic(label)}>{label}</button>)}</div>
      <label className="search-label"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.5" /></svg><span className="sr-only">Search notes</span><input type="search" placeholder="Find an idea…" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </div>
    <p className="result-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'note' : 'notes'}{query ? ` matching “${query}”` : ''}</p>
    <div className="library-list">{visible.map((entry, index) => <article className="library-entry" key={entry.slug}><span className="library-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><div className="entry-card-meta"><span>{entry.topic}</span>{entry.series && <span>{entry.series}</span>}</div><h2><Link href={entry.href}>{entry.title}</Link></h2><p>{entry.description}</p></div><div className="library-entry-tail"><span>{entry.readingMinutes} min read</span><Arrow /></div></article>)}</div>
    {visible.length === 0 && <div className="empty-state compact"><p>No notes found for this search.</p><button type="button" className="text-link" onClick={() => {setQuery('');setTopic('All notes');}}>Clear filters <Arrow /></button></div>}
  </div>;
}
