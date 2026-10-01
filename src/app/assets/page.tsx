import type { Metadata } from 'next';
import { AssetLibrary } from '@/components/asset-library';
import { allMarks, getMarkColor, mathMarks } from '@/lib/math-marks';
import { absolute, asset } from '@/lib/site';
import './assets.css';

export const metadata: Metadata = {
  title: 'Mathematical marks',
  description: 'A family of mathematical SVG marks for subject tags, lecture notes, and course covers. Explore and download the Lemniro asset collection.',
  alternates: { canonical: absolute('/assets/') },
};

export default function AssetsPage() {
  return <div className="shell asset-page">
    <header className="asset-hero">
      <div className="asset-hero-copy">
        <div className="eyebrow"><span className="small-square" />The Lemniro collection · 01</div>
        <h1>A little mark.<br /><em>A world of mathematics.</em></h1>
        <p>From sets and spaces to chance and change. One visual language for the subjects we study, and the notes we make along the way.</p>
        <div className="asset-hero-actions">
          <a className="button button-primary" href={asset('/assets/lemniro-math-assets.zip')} download>Download the collection <span aria-hidden="true">↓</span></a>
          <a className="text-link" href="#mark-library">Explore the marks <span aria-hidden="true">↘</span></a>
        </div>
        <div className="asset-format-note">{allMarks.length} marks · SVG icons & badges · {mathMarks.length} course covers</div>
      </div>
      <figure className="asset-specimen" aria-label="A selection of mathematical marks from the collection">
        <div className="asset-specimen-heading"><span>OBJECTS OF STUDY</span><span>LEMNIRO / SVG</span></div>
        <div className="asset-specimen-grid">{mathMarks.filter((_, index) => index % 3 === 0).slice(0, 9).map(mark => <div key={mark.slug} title={mark.label}><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark.body }} /><span>{mark.label}</span></div>)}</div>
        <figcaption><span>Many branches. A shared language.</span><span aria-hidden="true">∎</span></figcaption>
      </figure>
    </header>
    <section className="asset-use-strip" aria-label="Ways to use the collection">
      <div><span className="eyebrow">Made to belong</span><h2>Small details, familiar ideas.</h2></div>
      <div className="asset-tag-samples">{mathMarks.slice(0, 4).map(mark => <span className="asset-tag" key={mark.slug} style={{ color: getMarkColor(mark.family).ink, background: getMarkColor(mark.family).background, borderColor: getMarkColor(mark.family).border }}><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark.body }} />{mark.label}</span>)}</div>
    </section>
    <AssetLibrary />
    <section className="asset-format-guide" aria-labelledby="asset-formats-heading">
      <div><div className="eyebrow">A place for every mark</div><h2 id="asset-formats-heading">Three ways to use them.</h2></div>
      <dl><div><dt>01 / Icon</dt><dd>A transparent SVG for topic tags, navigation, and small accents. Inherit a color when used inline.</dd></div><div><dt>02 / Badge</dt><dd>A square composition with a paper background. Ready for cards, notebooks, and course lists.</dd></div><div><dt>03 / Cover</dt><dd>A wide subject illustration for a chapter opening or course page. Available for each mathematical subject.</dd></div></dl>
      <p>These marks are visual cues, not mathematical definitions. Keep a subject label alongside them.<a href={asset('/assets/math/manifest.json')} download>Download the asset manifest <span aria-hidden="true">↗</span></a></p>
    </section>
  </div>;
}
