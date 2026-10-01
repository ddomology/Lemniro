'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Brand } from './brand';

const links = [
  ['/notes/', 'Notes'], ['/journal/', 'Journal'], ['/lectures/', 'Lectures'], ['/about/', 'About'],
] as const;

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}<span aria-hidden="true">{open ? '−' : '+'}</span></button>
        <nav id="primary-navigation" className={`primary-navigation${open ? ' is-open' : ''}`} aria-label="Main navigation">
          {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname.startsWith(href.replace(/\/$/, '')) ? 'page' : undefined}>{label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
