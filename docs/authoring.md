# Authoring in LaTeX

Each published article has one canonical `.tex` file. Use `content/notes/` for course notes and `content/journal/` for shorter articles. Filenames become stable URL slugs: use lowercase words separated by hyphens, and avoid renaming a published file without considering its incoming links.

## Minimal note

Save this as `content/notes/continuous-maps.tex`:

```tex
% lemniro: {"kind":"note","description":"The open-set definition of continuity and an identity-map example.","topic":"Topology","series":"A first course in topology","order":3,"date":"2026-10-01","readingMinutes":4,"prerequisites":["Topological spaces"],"related":[]}
\documentclass[11pt]{article}
\input{tex/lemniro-preamble}
\title{Continuous maps}
\begin{document}
\maketitle

\section{The definition}
\begin{definition}[Continuity]\label{def:continuity}
A map $f:X\to Y$ between topological spaces is continuous if
$f^{-1}(V)$ is open in $X$ for every open set $V\subseteq Y$.
\end{definition}

\begin{example}
The identity map on a topological space is continuous: the inverse
image of an open set under the identity is that same open set.
\end{example}

\begin{remark}
Definition~\ref{def:continuity} does not require a distance function.
\end{remark}
\end{document}
```

The metadata is a single JSON object in the first `% lemniro:` comment. JSON uses double quotes. LaTeX ignores the comment; the site reads it for navigation and discovery. The article title comes from `\title{...}`.

## Metadata

| Field | Meaning |
| --- | --- |
| `kind` | `"note"` or `"journal"`; match the source directory. |
| `description` | A concise plain-text summary for cards and search metadata. |
| `topic` | Subject label, such as `"Topology"`. |
| `date` | Publication date in `YYYY-MM-DD` form. |
| `readingMinutes` | Estimated reading time in minutes. |
| `prerequisites` | Array of plain-text prerequisites; use `[]` when none. |
| `related` | Array of existing article slugs; use `[]` when none. |
| `series` | Optional course or sequence name. |
| `order` | Optional position within that series. |
| `videoId` | Optional published YouTube video ID, without a full URL. |

For a journal entry, use the same LaTeX structure with `"kind":"journal"` in a file under `content/journal/`. Do not add a video ID until the video actually exists.

## Lecture-note structure

The shared preamble provides:

- Numbered `definition`, `theorem`, `proposition`, `lemma`, `corollary`, `example`, and `exercise` environments.
- `proof` with an end-of-proof marker, and an unnumbered `remark` environment.
- AMS math, numbered equations, and standard `\label`, `\ref`, and `\eqref` references.
- Shared notation including `\R`, `\N`, `\T`, `\set{...}`, `\powerset{...}`, `\closure{...}`, and `\Int`.

Write the full mathematical content in normal LaTeX. Give statements stable labels, and reference those labels rather than manually typing theorem or equation numbers. The examples in `content/` demonstrate definitions, explanations, examples, complete proofs, and exercises.

Keep new mathematical macros in `tex/lemniro-preamble.tex` when they should be shared. Both compilers read that file. Test a macro or package in both HTML and PDF before using it throughout a course.

For macros defined in the preamble, use `\sp{...}` and `\sb{...}` for
superscripts and subscripts, for example `\newcommand{\inv}[1]{#1\sp{-1}}`.
These are standard TeX commands accepted by both outputs. TeX4ht activates
`^` and `_` for HTML math after the preamble, so storing the literal characters
in a preamble macro can lose its script markup. Ordinary formulas in the
document body can use `^` and `_` as usual.

## Checking a change

```sh
npm run content
npm run build
npm test
npm run check
npm run verify
npm run preview
```

Build before testing on a fresh checkout. Tests include checks against the generated content manifest, HTML, and PDFs. `npm run build` already runs `npm run content`, so the first command is optional when doing the complete sequence above.

Inspect the article in a current browser and open its PDF. Check formula layout, theorem boundaries, internal references, and narrow-screen readability. The compiler rejects malformed metadata, broken article relationships, and TeX compilation failures; it cannot verify a mathematical proof for you.

The generated directories are disposable. Edit `content/` and `tex/`, rather than generated HTML or the export in `out/`.

## Whole-document web rendering

The conversion runs for every discovered `.tex` article, not just selected formulas.
`tex/lemniro-html.cfg` is the shared HTML configuration; `tex-typography.css` applies
the same reading typography to every article. No hand-written React lesson is needed.

| LaTeX content | Published web content |
| --- | --- |
| Sections and paragraphs | HTML headings and selectable text with responsive line breaks |
| Definition, theorem, proof, remark | HTML blocks with the compiled labels and text |
| A custom `\newtheorem{claim}{Claim}` | A statement block carrying `data-environment="claim"` |
| Lists and `tabular` | HTML lists and tables |
| Inline/display math, `align`, matrices, cases | Structured MathML with the complete Latin Modern Math font |
| `tikzpicture` | An SVG diagram inside the HTML figure |
| `\label`, `\ref`, `\eqref` | Compiled numbers and internal links |

The browser lays out HTML paragraphs and MathML; it does not reproduce the PDF's
page geometry or TeX's paragraph-breaking algorithm. Latin Modern aligns the
web text and mathematics with the PDF's Computer Modern lineage. The full math
font, including its MATH table and mathematical alphabets, is bundled locally.

The shared HTML configuration also balances TeX4ht's image/math state for TikZ
on older TeX Live versions. The build rejects bare non-whitespace text in
MathML layout nodes, which browsers can silently omit; this catches the known
post-TikZ token-loss regression. It does not replace visual or mathematical review.

### TikZ

Load the package and the libraries needed by the document normally:

```tex
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning}
```

Write `tikzpicture` inside a normal `figure` and give it a descriptive `\caption`.
TeX4ht uses its SVG driver for the diagram; `dvisvgm` handles vector conversion
where needed. The caption and reference remain HTML. No screenshot or separate
manually maintained SVG source is required. Shell-dependent externalization is
not enabled by this pipeline.

See [`examples/lecture-note.tex`](../examples/lecture-note.tex) for a complete
document with custom macros, definitions, a lemma, proofs, a theorem, corollary,
remark, a custom claim, an example, exercise, an arrow diagram, matrices, cases,
equations, nested lists, a table, and a footnote. It is compiled by integration
tests but is not automatically published as a lesson. To publish a copy, place
it under `content/notes/` and edit its metadata.

## Supported scope

The current baseline uses the `article` class and the shared preamble. Support is grounded in the included notes and the complete example above. This is not a universal renderer for arbitrary document classes or packages: unusual output routines, bibliographies, external graphics dependencies, or advanced page layouts may require converter configuration and output checks. Add a representative example when extending support. A package compiling to PDF does not by itself prove that its HTML output is correct.

PDF and HTML have different layout needs. A page break or margin choice that works in a PDF does not define a useful phone layout. Prefer logical structure in the source and leave web spacing and responsive layout to the site.
