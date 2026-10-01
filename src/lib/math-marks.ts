import { foundationMarks } from './math-marks-foundations';
import { spaceMarks } from './math-marks-spaces';
import type { MathFamily, MathMark } from './math-marks-types';

export type { MathFamily, MathMark } from './math-marks-types';
export const mathMarks: MathMark[] = [...foundationMarks, ...spaceMarks];

export const lectureMarks: MathMark[] = [
  { slug: 'definition', label: 'Definition', family: 'Lecture tools', description: 'An open book for introducing mathematical language.', keywords: ['def', 'define', 'terminology'], body: '<path d="M32 17C23 11 14 12 9 15v35c8-4 15-3 23 2 8-5 15-6 23-2V15c-5-3-14-4-23 2Zm0 0v35M16 24c3-1 7-1 10 1m-10 7c3-1 7-1 10 1m12-8c3-2 7-2 10-1m-10 9c3-2 7-2 10-1"/>' },
  { slug: 'theorem', label: 'Theorem', family: 'Lecture tools', description: 'A framed diamond marks a central mathematical result.', keywords: ['thm', 'result', 'statement'], body: '<rect x="11" y="11" width="42" height="42" rx="4"/><path d="m32 20 12 12-12 12-12-12Z"/><circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none"/>' },
  { slug: 'lemma', label: 'Lemma', family: 'Lecture tools', description: 'Three steps leading toward a result.', keywords: ['auxiliary', 'step', 'lem'], body: '<path d="M10 52V40h14V28h14V16h16M15 25 42 9m-8 0h8l-3 8"/><path d="M25 51h28M39 39h14M48 27h5" opacity=".4"/>' },
  { slug: 'corollary', label: 'Corollary', family: 'Lecture tools', description: 'Consequences branch from an established result.', keywords: ['cor', 'consequence'], body: '<rect x="26" y="8" width="12" height="12" rx="2"/><path d="M32 20v13m0 0L16 45m16-12 16 12m-9-3 9 3-1-8m-23 5-8 3 1-8"/><circle cx="14" cy="50" r="4"/><circle cx="50" cy="50" r="4"/>' },
  { slug: 'proof', label: 'Proof', family: 'Lecture tools', description: 'A connected argument arrives at its end-of-proof square.', keywords: ['demonstration', 'qed', 'argument'], body: '<circle cx="12" cy="17" r="3"/><circle cx="32" cy="32" r="3"/><path d="M15 17h12q5 0 5 5v7m0 6v8q0 5 5 5h9m-5-4 5 4-5 4"/><rect x="49" y="43" width="9" height="9" fill="currentColor" stroke="none"/>' },
  { slug: 'example', label: 'Example', family: 'Lecture tools', description: 'A magnifying glass brings a concrete example into focus.', keywords: ['illustration', 'case', 'eg'], body: '<circle cx="28" cy="27" r="16"/><path d="m40 39 13 14M23 27h10m-5-5v10"/>' },
  { slug: 'exercise', label: 'Exercise', family: 'Lecture tools', description: 'A pencil and writing surface invite a worked solution.', keywords: ['practice', 'problem', 'ex'], body: '<path d="M33 12H12v41h41V32M25 39l3-11 19-19 8 8-19 19-11 3Zm18-26 8 8M28 28l8 8M20 46h19"/>' },
  { slug: 'remark', label: 'Remark', family: 'Lecture tools', description: 'A margin note adds context to an argument.', keywords: ['note', 'observation', 'aside'], body: '<path d="M12 12h40v31H28L17 53V43h-5ZM21 23h22M21 31h14"/>' },
];

export const allMarks: MathMark[] = [...mathMarks, ...lectureMarks];
export const mathFamilies: MathFamily[] = ['Foundations', 'Algebra', 'Analysis', 'Geometry & topology', 'Discrete & probability', 'Applied mathematics', 'Lecture tools'];

const palettes: Record<MathFamily, { ink: string; background: string; border: string }> = {
  'Foundations': { ink: '#68526f', background: '#eee9ef', border: '#d5c9d8' },
  'Algebra': { ink: '#3d5d76', background: '#e8eef2', border: '#c5d3dd' },
  'Analysis': { ink: '#8a553d', background: '#f2eae1', border: '#ddc8b7' },
  'Geometry & topology': { ink: '#365944', background: '#e9eee4', border: '#c7d3bd' },
  'Discrete & probability': { ink: '#776333', background: '#f1eee1', border: '#d9d1b4' },
  'Applied mathematics': { ink: '#3d6867', background: '#e5eeeb', border: '#bdd3cd' },
  'Lecture tools': { ink: '#57614e', background: '#eeeee6', border: '#d0d4c4' },
};

export const getMarkColor = (family: MathFamily) => palettes[family];

/** Exact labels and useful broad topic aliases; unknown topics keep their text. */
export function getMarkByTopic(topic: string): MathMark | undefined {
  const key = topic.trim().toLowerCase().replaceAll('&', 'and').replace(/[\s_]+/g, '-');
  const aliases: Record<string, string> = { algebra: 'abstract-algebra', analysis: 'real-analysis', 'mathematical-logic': 'logic', 'set-theory-and-logic': 'set-theory', statistics: 'probability', 'differential-equations-and-dynamical-systems': 'differential-equations', 'geometric-topology': 'topology' };
  return allMarks.find(mark => mark.slug === (aliases[key] || key));
}
