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

Use ordinary `^` and `_` in formulas and preamble macros, for example
`\newcommand{\inv}[1]{#1^{-1}}`. The web math is drawn from TeX's compiled
output, so the old MathML-specific `\sp`/`\sb` workaround is unnecessary.
The complete example checks that a preamble macro and its literal formula
produce the same measured geometry.

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
`tex/lemniro-html.cfg` is the shared compiler adapter; `src/app/tex-reader.css`
applies the reading design to every article. No hand-written React lesson is needed.

| LaTeX content | Published web content |
| --- | --- |
| Sections and paragraphs | HTML headings and selectable text with responsive line breaks |
| Definition, theorem, proof, remark | HTML blocks with the compiled labels and text |
| A custom `\newtheorem{claim}{Claim}` | A statement block carrying `data-environment="claim"` |
| Lists and `tabular` | HTML lists and tables |
| Inline math | SVG glyphs positioned by TeX, with measured width, height, depth, and baseline |
| A numbered `equation` | TeX SVG with a separate HTML equation number |
| `align`, `gather`, `multline`, and their starred forms | One SVG per complete environment, including its internal spacing and numbers |
| Matrices, cases, and other formula content | Drawn within the enclosing TeX visual |
| `tikzpicture` | SVG paths inside the HTML figure; the caption remains text |
| `\label`, `\ref`, `\eqref` | Compiled numbers and internal links |

The browser wraps HTML prose while TeX places the symbols inside each visual.
The web page therefore keeps TeX's formula shapes and spacing without fixing
paragraphs to PDF page widths. Long display equations scroll horizontally on
narrow screens. Formula internals do not reflow independently.

Web colors, paragraph spacing, heading styles, statement frames, and display
placement belong to CSS. Black SVG strokes and fills inherit `currentColor`;
explicit diagram colors are retained. Changing the actual mathematical typeface
requires changing the TeX font configuration and recompiling, because its glyphs
are vector paths. See [the rendering contract](tex-rendering.md) for selectors
and extension points.

Prose remains selectable text. Formulas have text alternatives derived from
TeX4ht's compiled text; diagrams can use their figure caption. These alternatives
can flatten subscripts, fractions, and two-dimensional relationships, and a generic
label is used if neither useful text nor a caption is available. They are not
semantic MathML or exact TeX source. Explain important formulas and diagrams in
the surrounding prose, and inspect text alternatives when reviewing an article.

### TikZ

Load the package and the libraries needed by the document normally:

```tex
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning}
```

Write `tikzpicture` inside a normal `figure` and give it a descriptive `\caption`.
The TeX4ht/dvisvgm pipeline supplies the SVG drawing. The caption and reference
remain HTML. No screenshot or separate
manually maintained SVG source is required. Shell-dependent externalization is
not enabled by this pipeline.

See [`examples/lecture-note.tex`](../examples/lecture-note.tex) for a complete
document with custom macros, definitions, a lemma, proofs, a theorem, corollary,
remark, a custom claim, an example, exercise, an arrow diagram, matrices, cases,
equations, nested lists, a table, and a footnote. It is compiled by integration
tests but is not automatically published as a lesson. To publish a copy, place
it under `content/notes/` and edit its metadata.

## Interactive Texloom figures

Place a registered figure between document-level paragraphs:

```tex
\LemniroScene{circle-and-sine}
```

The ID is a literal lowercase hyphenated name from `content/scenes.json`.
The catalog records `texloom-figure/1`, a local manifest path and SHA-256,
poster path, plain-text title/description, dimensions and duration. Paths are
relative to the site's `public/` root. The compiler verifies the manifest,
every resource payload (including hidden resources), bounds, and the hydrated
scene before publishing an article. Unknown IDs, changed hashes, missing
assets and malformed data stop publication.

The HTML compiler emits a reference placeholder, which becomes a static
poster and caption plus an ordered React figure boundary. Article HTML
remains complete without JavaScript. Each occurrence has its own controls;
repeating an ID does not share playback state. Each figure owns its runtime
and loaded resources; the browser can cache repeated requests for the same
asset bytes. The current controls expose time and playback speed.

Use the command outside theorem/proof environments, lists, tables and other
containers. Nested references are rejected instead of splitting those
structures. Keep the mathematical statement and explanation in the TeX
document: the figure complements the prose and does not replace a proof.
Arbitrary HTML, iframe or script embeds are not an authoring mechanism.

The PDF includes a boxed caption and web-edition link. If a sibling
`poster.pdf` accompanies the registered SVG poster, compilation copies that
optional static illustration into the PDF. Downloaded standalone `.tex`
still compiles without the optional illustration and retains the caption.
The note `content/notes/circle-and-sine.tex` contains a complete theorem,
proof and three independent occurrences.

## Supported scope

The current baseline uses the `article` class and the shared preamble. Support is grounded in the included notes and the complete example above. Packages whose drawings compile through this TeX/DVI/SVG path can often be captured without recreating their drawing rules in JavaScript. The correct capture boundary still matters: visual blocks keep their internal layout, while document structure needs HTML conversion. Unusual output routines, bibliographies, external graphics dependencies, or advanced page layouts may require converter configuration and output checks. Add a representative example when extending support. A package compiling to PDF does not by itself prove that this DVI/SVG and HTML output is correct.

PDF and HTML have different layout needs. A page break or margin choice that works in a PDF does not define a useful phone layout. Prefer logical structure in the source and leave web spacing and responsive layout to the site.
