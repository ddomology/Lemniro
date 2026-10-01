'use client';

import { useState } from 'react';
import { allMarks, getMarkColor } from '@/lib/math-marks';
import { asset } from '@/lib/site';

export function AssetLibrary() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('All marks');
  const families = ['All marks', ...new Set(allMarks.map(mark => mark.family))];
  const normalizedQuery = query.toLowerCase().trim();
  const visible = allMarks.filter(mark => (family === 'All marks' || family === mark.family) && `${mark.label} ${mark.family} ${mark.description} ${mark.keywords.join(' ')}`.toLowerCase().includes(normalizedQuery));

  return <section className="asset-library" id="mark-library" aria-labelledby="mark-library-heading">
    <div className="asset-library-heading"><div><div className="eyebrow">The complete collection</div><h2 id="mark-library-heading">Find your field.</h2></div><label className="asset-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><span className="sr-only">Search mathematical marks</span><input type="search" placeholder="Try topology, proofs, sets…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <div className="asset-filters" role="group" aria-label="Filter marks by family">{families.map(label => <button key={label} type="button" aria-pressed={family === label} onClick={() => setFamily(label)}>{label}</button>)}</div>
    <p className="asset-result-count" role="status">{visible.length} of {allMarks.length} marks{query.trim() ? ` matching “${query.trim()}”` : ''}<span>Every download is an SVG</span></p>
    <div className="asset-grid">{visible.map(mark => <article className="asset-card" key={mark.slug}>
      <div className="asset-card-top"><span style={{ color: getMarkColor(mark.family).ink }}>{mark.family}</span><span aria-hidden="true">{String(allMarks.findIndex(item => item.slug === mark.slug) + 1).padStart(2, '0')}</span></div>
      <div className="asset-card-preview" style={{ color: getMarkColor(mark.family).ink }}><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark.body }} /></div>
      <h3>{mark.label}</h3><p>{mark.description}</p>
      <div className="asset-downloads" aria-label={`Download ${mark.label} assets`}>
        <a href={asset(`/assets/math/icons/${mark.slug}.svg`)} download aria-label={`Download ${mark.label} icon SVG`}>Icon <span aria-hidden="true">↓</span></a>
        <a href={asset(`/assets/math/badges/${mark.slug}.svg`)} download aria-label={`Download ${mark.label} badge SVG`}>Badge <span aria-hidden="true">↓</span></a>
        {mark.family !== 'Lecture tools' && <a href={asset(`/assets/math/covers/${mark.slug}.svg`)} download aria-label={`Download ${mark.label} cover SVG`}>Cover <span aria-hidden="true">↓</span></a>}
      </div>
      {mark.family !== 'Lecture tools' && <details className="asset-cover-details"><summary>Preview cover <span aria-hidden="true">+</span></summary><img src={asset(`/assets/math/covers/${mark.slug}.svg`)} alt={`${mark.label} course cover`} width="960" height="600" loading="lazy" /></details>}
    </article>)}</div>
    {visible.length === 0 && <div className="asset-empty"><h3>No marks found.</h3><p>Try a broader subject or choose another family.</p><button type="button" className="text-link" onClick={() => { setQuery(''); setFamily('All marks'); }}>Clear filters <span aria-hidden="true">↗</span></button></div>}
  </section>;
}
