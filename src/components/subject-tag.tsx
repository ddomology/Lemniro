import { getMarkByTopic, getMarkColor } from '@/lib/math-marks';
import type { CSSProperties } from 'react';

export function SubjectTag({ topic, compact = false }: { topic: string; compact?: boolean }) {
  const mark = getMarkByTopic(topic);
  const palette = mark && getMarkColor(mark.family);
  const style = palette ? { '--tag-ink': palette.ink, '--tag-paper': palette.background, '--tag-line': palette.border } as CSSProperties : undefined;
  return <span className={`subject-tag${compact ? ' subject-tag-compact' : ''}`} style={style}>
    {mark && <svg viewBox="0 0 64 64" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark.body }} />}
    <span>{topic}</span>
  </span>;
}
