import type {Entry} from '@/lib/content';
import {asset} from '@/lib/site';
import {TexloomFigure} from './texloom-figure';

/** The content compiler splits only validated top-level figure placeholders.
 * HTML fragments remain its sanitized output; React never parses note HTML. */
export function TexDocument({entry}: {entry: Entry}) {
  if (!entry.bodyBlocks) return <div className="tex-content" dangerouslySetInnerHTML={{__html: entry.html}} />;
  return <div className="tex-content">{entry.bodyBlocks.map((block, index) => block.kind === 'html'
    ? <div className="tex-document-fragment" key={`html-${index}`} dangerouslySetInnerHTML={{__html: block.html}} />
    : <TexloomFigure key={`figure-${index}-${block.figure.id}`} figure={block.figure} publicBasePath={asset('/')} />
  )}</div>;
}
