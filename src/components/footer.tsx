import Link from 'next/link';
import { site, asset } from '@/lib/site';
import { Brand } from './brand';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-top">
        <div><Brand compact /><p>Open notes. Careful proofs.<br />A clearer view of mathematics.</p></div>
        <div className="footer-links"><Link href="/notes/">Read the notes</Link><Link href="/journal/">From the journal</Link><Link href="/about/">About Lemniro</Link><Link href="/assets/">Visual library</Link></div>
        <div className="footer-links"><a href={site.repository}>Find us on GitHub <span aria-hidden="true">↗</span></a><a href={asset('/feed.xml')}>RSS feed <span aria-hidden="true">↗</span></a>{site.youtube ? <a href={site.youtube}>YouTube <span aria-hidden="true">↗</span></a> : <span className="footer-muted">Video lectures in preparation</span>}</div>
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Lemniro</span><span>Made for the joy of understanding.</span><span className="footer-endmark" aria-hidden="true">∎</span></div>
    </footer>
  );
}
