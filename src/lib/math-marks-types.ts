export type MathFamily = 'Foundations' | 'Algebra' | 'Analysis' | 'Geometry & topology' | 'Discrete & probability' | 'Applied mathematics' | 'Lecture tools';

export interface MathMark {
  slug: string;
  label: string;
  family: MathFamily;
  description: string;
  keywords: string[];
  /** Original SVG shapes on a 64 × 64 canvas; no fonts or external assets. */
  body: string;
}
