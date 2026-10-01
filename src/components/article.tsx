import Link from 'next/link';
import type { Entry } from '@/lib/content';
import { entryPath, getAllEntries } from '@/lib/content';
import { absolute, asset, site } from '@/lib/site';
import { Arrow } from './brand';

function formattedDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}

export function Article({ entry }: { entry: Entry }) {
  const all = getAllEntries();
  const related = entry.related.map(slug => all.find(item => item.slug === slug)).filter((item): item is Entry => !!item).slice(0, 3);
  const notes = entry.kind === 'note';
  const structured = { '@context': 'https://schema.org', '@type': notes ? 'LearningResource' : 'Article', name: entry.title, headline: entry.title, description: entry.description, datePublished: entry.date, inLanguage: 'en', url: absolute(entryPath(entry)), author: { '@type': 'Person', name: site.author }, publisher: { '@type': 'Organization', name: site.name, url: site.url }, ...(notes ? { learningResourceType: 'Lecture notes', isAccessibleForFree: true } : {}) };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
    <div className="shell article-shell">
      <div className="article-breadcrumb"><Link href={notes ? '/notes/' : '/journal/'}>{notes ? 'Notes' : 'Journal'}</Link><span aria-hidden="true">/</span><span>{entry.topic}</span></div>
      <header className="article-header"><div className="eyebrow">{entry.series || (notes ? 'Lecture notes' : 'The journal')}</div><h1>{entry.title}</h1><p className="article-deck">{entry.description}</p><div className="article-meta"><span>{entry.topic}</span><span>{entry.readingMinutes} min read</span><time dateTime={entry.date}>{formattedDate(entry.date)}</time></div></header>
      <div className="article-layout">
        <aside className="article-sidebar" aria-label="Article navigation">
          {entry.outline.length > 0 && <nav className="table-of-contents" aria-label="On this page"><h2>On this page</h2><ol>{entry.outline.map(item => <li key={item.id} className={item.level > 2 ? 'toc-subsection' : undefined}><a href={`#${item.id}`}>{item.title}</a></li>)}</ol></nav>}
          <div className="article-downloads"><h2>Keep a copy</h2><a href={asset(entry.pdfPath)}>Download PDF <Arrow diagonal /></a><a href={asset(entry.sourcePath)}>LaTeX source <Arrow diagonal /></a></div>
          {entry.prerequisites.length > 0 && <div className="prerequisites"><h2>Before you begin</h2><ul>{entry.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></div>}
        </aside>
        <article className="article-body">
          {entry.css && <style dangerouslySetInnerHTML={{ __html: entry.css }} />}
          <div className="tex-content" dangerouslySetInnerHTML={{ __html: entry.html }} />
          {entry.videoId && <section className="article-video"><h2>Watch the lecture</h2><a className="text-link" href={`https://www.youtube.com/watch?v=${encodeURIComponent(entry.videoId)}`}>Open the accompanying video <Arrow diagonal /></a></section>}
          <div className="article-colophon"><span className="colophon-square" aria-hidden="true">∎</span><p>Found something worth revisiting?<br />The <a href={asset(entry.pdfPath)}>PDF</a> is yours to keep, and the <a href={asset(entry.sourcePath)}>source</a> is open to explore.</p><a href={`${site.repository}/issues`}>Suggest a correction <Arrow diagonal /></a></div>
        </article>
      </div>
      {related.length > 0 && <section className="related-section"><div className="section-heading"><div><div className="eyebrow">Keep the thread</div><h2>Read next</h2></div></div><div className="related-grid">{related.map(item => <Link key={item.slug} href={entryPath(item)}><span className="entry-card-meta">{item.topic}</span><h3>{item.title}</h3><Arrow /></Link>)}</div></section>}
    </div>
  </>;
}
