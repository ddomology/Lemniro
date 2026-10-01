import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { getAllEntries, entryPath } from '@/lib/content';
import { absolute } from '@/lib/site';
import { MathFigure } from '@/components/math-figure';
import { EntryCard } from '@/components/entry-card';
import { Arrow } from '@/components/brand';

export const metadata: Metadata = { alternates: { canonical: absolute('/') }, title: 'Lemniro — Mathematics, understood.', description: 'Explore mathematics through open lecture notes, complete proofs, and the ideas that make them click.' };

export default function HomePage() {
  const entries = getAllEntries();
  const notes = entries.filter(entry => entry.kind === 'note').slice(0, 3);
  const journal = entries.filter(entry => entry.kind === 'journal').slice(0, 2);
  return <>
    <section className="shell home-hero">
      <div className="hero-copy"><div className="eyebrow"><span className="small-square" aria-hidden="true" />Mathematics, with room to think</div><h1>Follow the idea.<br /><em>Understand<br className="hero-break" /> the proof.</em></h1><p>Open lecture notes, carefully worked arguments, and a place to let the pieces come together.</p><div className="hero-actions"><Link className="button button-primary" href="/notes/">Explore the notes <Arrow /></Link><Link className="text-link" href="/about/">A note about Lemniro <Arrow diagonal /></Link></div><div className="hero-footnote"><span aria-hidden="true">↳</span> A growing collection. Always open to read.</div></div>
      <MathFigure />
    </section>
    <section className="shell notes-section"><div className="section-heading"><div><div className="eyebrow">The notebook</div><h2>A good place to begin.</h2></div><Link className="text-link" href="/notes/">All notes <Arrow /></Link></div><div className="entry-grid" style={{ '--column-count': Math.max(notes.length, 1) } as CSSProperties}>{notes.map((entry, index) => <EntryCard key={entry.slug} entry={entry} index={index} />)}</div>{notes.length === 0 && <p className="quiet-copy">The first notes are taking shape. Return soon for the opening chapter.</p>}</section>
    <section className="approach-section"><div className="shell approach-inner"><div><div className="eyebrow">A way through mathematics</div><h2>Definitions are the start.<br /><em>Understanding is the point.</em></h2><p>A theorem becomes more useful when you know what its assumptions are doing. Follow the proof, try an example, and come back to the idea from another angle.</p></div><div className="approach-steps"><div><span className="step-mark" aria-hidden="true">01</span><div><h3>Build the language.</h3><p>Definitions with the context and examples that give them meaning.</p></div></div><div><span className="step-mark" aria-hidden="true">02</span><div><h3>Stay with the argument.</h3><p>Complete proofs, with room for the steps that are easy to miss.</p></div></div><div><span className="step-mark" aria-hidden="true">03</span><div><h3>Make the idea your own.</h3><p>Questions and examples to carry beyond the page.</p></div></div></div></div></section>
    <section className="shell journal-section"><div className="section-heading"><div><div className="eyebrow">In the margins</div><h2>From the journal.</h2></div><Link className="text-link" href="/journal/">Visit the journal <Arrow /></Link></div><div className="journal-home-grid" style={{ '--column-count': journal.length + 1 } as CSSProperties}>{journal.map(entry => <EntryCard key={entry.slug} entry={entry} variant="journal" />)}<div className="lecture-teaser"><span className="eyebrow">On the horizon</span><div className="mini-board" aria-hidden="true"><span>Let’s look at this<br /><em>another way.</em></span><svg width="130" height="48" viewBox="0 0 130 48" fill="none"><path d="M3 33c20-42 38 28 61-1 20-29 36-14 60-22m-9-2 10 1-3 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></div><h3>The notes, brought to life.</h3><p>Visual lectures are in preparation. For now, start with the written argument.</p><Link className="text-link" href="/lectures/">About the lectures <Arrow /></Link></div></div></section>
  </>;
}
