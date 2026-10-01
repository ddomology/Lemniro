import Link from 'next/link';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M23.8 24c-5.4-9.1-9.2-13-13.5-10.7C.7 18.4 12.1 39.6 22.5 25.8L30.7 14c9.2-10.6 17.3 7.3 9.4 12.1-5.5 3.4-9.9-4-16.3-2.1Z" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 37h19" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={`brand${compact ? ' brand-small' : ''}`} aria-label="Lemniro home"><BrandMark /><span>Lemniro<span className="brand-dot">.</span></span></Link>;
}

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" className="arrow-icon"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
