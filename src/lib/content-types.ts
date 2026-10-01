import type { TexVisual } from './tex-visual-types';
export type ContentKind = 'note' | 'journal';

export interface EntryMetadata {
  kind: ContentKind;
  description: string;
  topic: string;
  series?: string;
  order?: number;
  date: string;
  readingMinutes: number;
  prerequisites: string[];
  related: string[];
  videoId?: string;
}

export interface OutlineItem {
  id: string;
  title: string;
  level: number;
}

export interface Entry extends EntryMetadata {
  slug: string;
  /** Obtained from the compiled LaTeX title, not a second authored field. */
  title: string;
  /** Semantic HTML5 with compiler-positioned SVG visual units. */
  html: string;
  visuals: TexVisual[];
  /** TeX4ht styles scoped to .tex-content. */
  css: string;
  outline: OutlineItem[];
  pdfPath: string;
  sourcePath: string;
  assetsPath: string;
  sourceSha256: string;
  compiler: { html: 'make4ht/TeX4ht'; pdf: 'pdfLaTeX'; math: 'TeX/dvisvgm'; protocol: 1 };
}

export type ContentEntry = Entry;
