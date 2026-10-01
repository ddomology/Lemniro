export function MathFigure() {
  return (
    <figure className="math-figure">
      <div className="figure-heading"><span>THE IDEA, IN A PICTURE</span><span className="figure-index">01 — TOPOLOGY</span></div>
      <svg viewBox="0 0 520 330" role="img" aria-labelledby="cover-title cover-desc">
        <title id="cover-title">Separating a point from a compact set</title>
        <desc id="cover-desc">An illustrative compact set K is covered by finitely many open neighborhoods. A neighborhood U of an outside point x is disjoint from the set.</desc>
        <defs>
          <pattern id="dot-grid" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".11" /></pattern>
          <pattern id="set-hatching" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><line x1="0" y1="0" x2="0" y2="7" stroke="#375b49" strokeWidth=".7" opacity=".23" /></pattern>
        </defs>
        <rect x="12" y="12" width="496" height="306" fill="url(#dot-grid)" />
        <path d="M258 81C303 44 403 63 436 107c36 48 20 110-34 140-51 28-147 13-175-43-25-52-10-91 31-123Z" fill="url(#set-hatching)" stroke="#315643" strokeWidth="1.6" />
        <ellipse cx="272" cy="140" rx="60" ry="75" transform="rotate(-25 272 140)" fill="#315643" fillOpacity=".035" stroke="#315643" strokeOpacity=".63" strokeWidth="1.2" strokeDasharray="5 5" />
        <ellipse cx="369" cy="119" rx="80" ry="57" transform="rotate(15 369 119)" fill="#315643" fillOpacity=".025" stroke="#315643" strokeOpacity=".63" strokeWidth="1.2" strokeDasharray="5 5" />
        <ellipse cx="381" cy="210" rx="80" ry="60" transform="rotate(-17 381 210)" fill="#315643" fillOpacity=".03" stroke="#315643" strokeOpacity=".63" strokeWidth="1.2" strokeDasharray="5 5" />
        <ellipse cx="275" cy="222" rx="66" ry="55" transform="rotate(24 275 222)" fill="#315643" fillOpacity=".025" stroke="#315643" strokeOpacity=".63" strokeWidth="1.2" strokeDasharray="5 5" />
        <ellipse cx="99" cy="167" rx="53" ry="66" transform="rotate(-14 99 167)" fill="#b2694f" fillOpacity=".045" stroke="#ad674f" strokeWidth="1.5" />
        <circle cx="101" cy="170" r="3" fill="#ad674f" />
        <text x="109" y="162" fill="#8f4e39" fontSize="21" fontFamily="Georgia, serif" fontStyle="italic">x</text>
        <text x="54" y="111" fill="#8f4e39" fontSize="21" fontFamily="Georgia, serif" fontStyle="italic">U</text>
        <text x="333" y="181" fill="#274c3a" fontSize="28" fontFamily="Georgia, serif" fontStyle="italic">K</text>
        <path d="M177 269c12 0 19-9 20-18" fill="none" stroke="#7b8379" strokeWidth="1" />
        <text x="39" y="283" fill="#747b71" fontSize="13" fontFamily="Arial, sans-serif">A little space between.</text>
      </svg>
      <figcaption><span>Compactness turns many local choices<br />into one finite argument.</span><span className="figure-qed" aria-hidden="true">∎</span></figcaption>
    </figure>
  );
}
