# Lemniro

Mathematics, written carefully. Public lecture notes and a mathematical journal, authored in LaTeX and published as a React website.

**Site:** [ddomology.github.io/Lemniro](https://ddomology.github.io/Lemniro/)

## Write TeX. Push. Publish.

The `.tex` file is the source of the article. Definitions, theorems, proofs, examples, equations, and references are compiled from that source into both HTML and PDF. There is no parallel Markdown or JSX version of the lesson to maintain.

```text
content/notes/*.tex or content/journal/*.tex
              + tex/lemniro-preamble.tex
                           |
                 make4ht + pdfLaTeX
                           |
               HTML with MathML + PDF
                           |
                  React / Next.js
                           |
                 GitHub Pages export
```

1. Add or edit a `.tex` file in `content/notes/` or `content/journal/`.
2. Keep its short `% lemniro: {...}` metadata comment at the top.
3. Push to `main`.
4. GitHub Actions validates and compiles the content, exports the site, and deploys a successful build.

Every article offers its PDF and TeX source. Shared macros live in `tex/lemniro-preamble.tex` and apply to both output formats. Generated HTML, PDFs, and content indexes are build outputs, not hand-maintained source files.

See [Authoring notes](docs/authoring.md) for the supported lecture format and [Deployment](docs/deployment.md) for the workflow and site configuration.

## Local development

Requirements:

- Node.js 22 or newer and npm.
- TeX Live with `make4ht`, `pdflatex`, TeX4ht, Latin Modern, and the standard LaTeX/AMS packages used by the shared preamble.

Ubuntu 24.04 uses the same packages as CI:

```sh
sudo apt-get update
sudo apt-get install --no-install-recommends -y \
  texlive-latex-extra texlive-extra-utils texlive-plain-generic \
  texlive-fonts-recommended lmodern
npm ci
npm run dev
```

On Windows or macOS, install the equivalent TeX Live packages and ensure `make4ht` and `pdflatex` are on `PATH`. Run all project commands from the repository root.

```sh
npm run content  # compile TeX into HTML, PDF, and generated/content.json
npm run build    # compile content and export the complete site to out/
npm test         # validate the pipeline and the generated HTML/PDF
npm run check    # type-check after the generated content is available
npm run verify   # check exported pages, links, assets, sitemap, and RSS
npm run preview  # serve the static export locally
```

On a fresh checkout, run `npm run build` before `npm test`: the tests inspect the generated HTML/PDF as well as the source-validation logic. For a content-only change, `npm run content` supplies the rendered artifacts needed by the tests; a full build is still required before export verification and deployment.

`npm run dev` compiles content before starting Next.js. After editing TeX while the dev server is running, run `npm run content` again in another terminal; the browser can then pick up the regenerated article.

The `postbuild` step also works around [Next.js's Windows static-export segment filename bug](https://github.com/vercel/next.js/issues/92339). It adds the flat RSC filenames that client navigation requests, preserves the original files, and refuses conflicting copies. Linux exports already use the correct names, so this step leaves them unchanged.

## What this foundation includes

- Notes and journal articles generated from real LaTeX compilation.
- HTML text and MathML formulas, plus a PDF from the same source.
- A shared lecture-note preamble for definitions, theorems, proofs, examples, exercises, and references.
- A static React site with individual article URLs and discovery metadata.
- CI checks on pull requests and automatic GitHub Pages deployment from `main`.
- Optional YouTube video metadata for attaching a published lecture to its article.
- A [visual asset library](https://ddomology.github.io/Lemniro/assets/) with subject tags, SVG badges, course covers, and a downloadable pack. See [asset authoring](docs/design-assets.md).

No YouTube channel or videos are invented by the scaffold. Video production and Chalkspace integration are future work. The website can publish written material independently.

This is a tested authoring convention for lecture notes, not a promise that every document class or LaTeX package can be rendered faithfully as HTML. Start with the examples and add new TeX features alongside HTML/PDF verification. Search metadata and readable static pages make the material discoverable; they do not guarantee indexing, ranking, or traffic.
