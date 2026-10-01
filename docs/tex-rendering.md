# TeX rendering contract

Lemniro separates document structure, compiled visual geometry, and reader design.
The input remains an ordinary `.tex` lecture note. TeX4ht converts paragraphs,
headings, statements, lists, and references to HTML; TeX and dvisvgm draw formulas
and figures as SVG. React publishes the normalized result without a browser math
typesetting pass.

## Ownership

| Component | Responsibility |
| --- | --- |
| `tex/lemniro-preamble.tex` | Shared notation, theorem definitions, and TeX font/package choices for web and PDF |
| `tex/lemniro-html.cfg` | HTML environment hooks, visual capture boundaries, inline measurements, and baseline-origin markers |
| `tex/lemniro-compat.tex` | Narrow, regression-tested compatibility fixes for older TeX4ht releases |
| `tex/lemniro.mk4` | dvisvgm conversion settings: unscaled coordinates, glyph paths, embedded bitmaps, and inherited black ink |
| `scripts/tex-pipeline.ts` | Metadata, source flattening, clean compiler runs, log validation, and publication staging |
| `scripts/tex-document.ts` | Article title/outline, semantic classes, scoped converter CSS, normalized display containers, and reference validation |
| `scripts/tex-visuals.ts` | SVG loading, geometry normalization, per-instance ID namespaces, alternatives, and visual records |
| `src/lib/tex-visual-types.ts` | `TexVisual`, the compiler/renderer data boundary |
| `src/app/tex-fonts.css` | Self-hosted font-face declarations |
| `src/app/tex-reader.css` | Reading typography, colors, statements, spacing, responsive displays, and SVG presentation |

Generated content belongs in `generated/`, `public/tex/`, and the static export.
Make changes in the source or the responsible adapter, then rebuild.

## Geometry and output

Inline math retains TeX's logical width, height above the baseline, and depth
below it. A small dvisvgm marker records the logical origin. The visual adapter
uses these to establish the SVG viewport and the wrapper's baseline position.
It does not stretch tightly cropped ink to fill the logical box.

TeX dimensions use 72.27 points per inch; dvisvgm coordinates use 72 points per
inch. The adapter converts between them explicitly. SVG overflow remains visible
because accents, cancellation strokes, and italic glyphs can extend beyond the
logical box.

Zero-size logical boxes used by `\smash`, `\mathrlap`, and struts are retained.
Only a degenerate SVG viewport axis is padded so overflowing ink can paint;
the HTML advance, height, and baseline stay unchanged. Inkless phantom/spacing
fragments remain silent in copied text and accessibility labels.

Ordinary display equations normalize to a visual with an optional HTML number.
`align`, `gather`, `multline`, and their starred variants are captured as complete
visuals. Their internal equation numbers and intertext are drawn by TeX; named
reference anchors remain HTML. Capturing the whole environment preserves internal
alignment, and means CSS cannot independently restyle its individual rows or numbers.

Each article publishes `visuals.json` alongside the original SVG assets, PDF,
standalone TeX download, and `provenance.json`. Each visual record contains:

- Kind: `inline-math`, `display-math`, or `diagram`.
- A per-article instance ID, source asset path, and SHA-256 of the original SVG.
- TeX font size, document base font size, and logical geometry in TeX points.
- Original SVG ink bounds, the normalized layout viewBox, and an alternative text string with its origin.

The article HTML embeds normalized SVGs directly. Glyph IDs and all internal
references are prefixed per instance, so repeated formulas do not collide.
The retained asset is the original compiler output; its hash does not describe
the rewritten inline SVG.

## CSS boundary

The site owns the outer `.tex-content` reader. Converter CSS is scoped beneath
that class. Reader rules use `.article-body .tex-content` to control presentation
while preserving the compiler's structure and font runs.

| Selector | Purpose |
| --- | --- |
| `.tex-paragraph` | A selectable HTML paragraph |
| `.tex-statement[data-environment="theorem"]` | A statement; custom `\newtheorem` names are retained |
| `.tex-proof` | A proof and its compiled proof/QED labels |
| `.tex-math[data-tex-kind="inline-math"]` | A measured inline formula |
| `.tex-display-scroll` / `.tex-display` | Responsive display container and placement |
| `.tex-equation-number` | An HTML number for a single equation |
| `.tex-diagram` | A figure visual |
| `[data-tex-svg]` | The embedded SVG drawing |
| `.tex-visual-text` | Visually hidden text alternative used by text extraction |

For example, a reader theme can change colors and statement surfaces:

```css
.article-body .tex-content {
  --reader-ink: #242a30;
  --reader-accent: #355b70;
  --tex-base-size: 20px;
}

.article-body .tex-content div.newtheorem[data-environment='theorem'] {
  --block-paper: #f0f4f7;
  --block-line: #cad6de;
  --block-ink: #355b70;
}
```

`currentColor` makes black formula/diagram ink follow the surrounding CSS color.
Explicit nonblack colors remain part of the authored drawing. Change the base
reader size through `--tex-base-size`; the presentation layer coordinates it
with visual font ratios. Heading and caption formulas follow their local size.

Keep compiler-written `width`, `height`, and `vertical-align` values intact, and
keep inline SVG overflow visible. Applying a general `max-width: 100%` shrink
rule to inline mathematics can break its measured relationship to the text.
Use display scrolling for long formulas. Changing CSS `font-family` affects
HTML text, but does not redraw SVG glyphs; mathematical font changes belong
in TeX and require recompilation.

## Extending support

1. Add a representative TeX example for the package or environment, including
   neighboring prose and any labels, captions, or references.
2. Check whether existing capture already includes it. A macro used inside a
   formula normally follows the enclosing formula's TeX rendering.
3. For a standalone visual environment, register an appropriate block boundary
   with `\LemniroSvgEnvironment{environment}` in `tex/lemniro-html.cfg`. This
   helper is currently used for the multiline AMS environments; other packages
   may need their own hooks. Preserve semantic containers and reference anchors.
4. Verify the generated HTML/SVG and PDF, including narrow screens, colored
   drawings, repeated assets, and text alternatives where applicable.

Keep package-specific compilation details in the TeX adapter, geometry work in
the visual adapter, and visual styling in CSS. Add an integration fixture for
new behavior. The internal `\pic:math` hook used for baseline markers is an
explicit TeX4ht compatibility point; rerun the integration examples when
upgrading TeX Live.

The compatibility file trims stray trailing spaces in four TeX4ht script-toggle
macros on TeX Live 2023. Those spaces otherwise inflate every measured inline
formula. It preserves the installed macro bodies and is harmless on corrected
releases. The zero-box integration test injects the historical condition, so a
newer local TeX installation still exercises the fix used by Ubuntu CI.

Compilations start in a clean per-document directory. dvisvgm's hashed-image
reuse therefore cannot keep old drawings across changed font or converter
settings. Publishing happens only after all documents compile and their related
article links validate.

## Text alternatives and current limits

Each visual wrapper has an image role and an accessible label. TeX4ht's compiled
text is used when available; a diagram's caption or a generic label is used as
fallback. `alternativeKind` records `compiled-text`, `caption`, `generic`, or
`silent` for inkless spacing that should not be announced.

Compiled text can flatten subscripts, fractions, and spatial relationships. It is
not semantic MathML, a full spoken-math representation, or recoverable original
TeX. Source and PDF downloads remain available. A future semantic alternative
can be added to the visual protocol without replacing its drawing geometry.

The supported baseline is the `article` class, shared preamble, and integration
examples. Responsive HTML paragraphs intentionally do not use TeX's page widths,
page breaks, or paragraph line-breaking algorithm. SVG blocks keep their internal
layout. Packages requiring a different engine, output driver, external tools,
or unsupported document structures need separate verification and adaptation.
