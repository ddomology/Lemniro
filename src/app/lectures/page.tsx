import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllEntries, entryPath } from '@/lib/content';
import { absolute, site } from '@/lib/site';
import { Arrow } from '@/components/brand';

export const metadata: Metadata = { title: 'Visual lectures', description: 'Mathematics lectures that follow the written argument, with clear diagrams and time to understand each step.', alternates: { canonical: absolute('/lectures/') } };
export default function LecturesPage() {
  const lectures = getAllEntries().filter(entry => !!entry.videoId);
  return <div className="shell collection-page lectures-page"><header className="collection-header"><div className="eyebrow">From the page to the board</div><h1>See the argument unfold.</h1><p>Visual lectures to accompany the notes.<br />The same mathematics, with another way into the idea.</p></header>{lectures.length > 0 ? <div className="lecture-list">{lectures.map(entry => <article className="library-entry" key={entry.slug}><div><div className="eyebrow">{entry.topic}</div><h2><Link href={entryPath(entry)}>{entry.title}</Link></h2><p>{entry.description}</p><a className="text-link" href={`https://www.youtube.com/watch?v=${encodeURIComponent(entry.videoId!)}`}>Watch on YouTube <Arrow diagonal /></a></div></article>)}</div> : <div className="lecture-empty"><div className="lecture-board" aria-hidden="true"><span>Let X be a space.</span><div className="board-expression">An idea. <i>A picture.</i><br />A proof.</div><div className="chalk-line" /><span className="board-endmark">∎</span></div><div className="lecture-empty-copy"><span className="status-label"><span />In preparation</span><h2>A little more time<br />at the chalkboard.</h2><p>The first lectures are still taking shape. The written notes are ready to explore, with complete arguments and examples to work through at your own pace.</p><Link className="button button-primary" href="/notes/">Read the notes <Arrow /></Link>{site.youtube && <a className="text-link" href={site.youtube}>Visit the YouTube channel <Arrow diagonal /></a>}</div></div>}</div>;
}
