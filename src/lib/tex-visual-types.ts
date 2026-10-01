/** Compiler/renderer boundary. Distances in geometry are TeX points (72.27/in). */
export interface TexVisual {
  id: string;
  kind: 'inline-math' | 'display-math' | 'diagram';
  asset: string;
  sha256: string;
  alternativeText: string;
  /** TeX4ht's flattened text is a fallback, not semantic MathML. */
  alternativeKind: 'compiled-text' | 'caption' | 'generic' | 'silent';
  fontSizePt: number;
  baseFontSizePt: number;
  geometry: { widthPt: number; heightPt: number; depthPt: number };
  /** Original painted bounds; can extend beyond the logical TeX box. */
  inkViewBox: [number, number, number, number];
  /** SVG box used for browser placement; differs from ink bounds for inline math. */
  layoutViewBox: [number, number, number, number];
}
