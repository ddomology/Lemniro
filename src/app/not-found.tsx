import Link from 'next/link';
import { Arrow } from '@/components/brand';

export default function NotFound() { return <div className="shell not-found"><span className="eyebrow">404 · A small detour</span><h1>This page is<br /><em>outside our set.</em></h1><p>The address may have changed, or the page has yet to be written.</p><Link className="button button-primary" href="/notes/">Back to the notes <Arrow /></Link></div>; }
