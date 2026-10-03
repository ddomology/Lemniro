import type { LemniroFigureReference } from 'texloom/lemniro';
export type { LemniroFigureReference } from 'texloom/lemniro';

/** Only complete document-level figures become interactive React boundaries. */
export type ContentBlock = { kind: 'html'; html: string }
  | { kind: 'texloom'; figure: LemniroFigureReference };
