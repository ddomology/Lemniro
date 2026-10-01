import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllEntries, getEntry, entryPath } from '@/lib/content';
import { absolute } from '@/lib/site';
import { Article } from '@/components/article';

export const dynamicParams = false;
export function generateStaticParams() { return getAllEntries().filter(entry => entry.kind === 'note').map(entry => ({ slug: entry.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const entry = getEntry((await params).slug); if (!entry || entry.kind !== 'note') return {}; return { title: entry.title, description: entry.description, alternates: { canonical: absolute(entryPath(entry)) }, openGraph: { title: entry.title, description: entry.description, type: 'article', url: absolute(entryPath(entry)) } }; }
export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) { const entry = getEntry((await params).slug); if (!entry || entry.kind !== 'note') notFound(); return <Article entry={entry} />; }
