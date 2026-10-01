# Mathematical marks

The visual library at `/assets/` contains original vector motifs for 24 mathematical subjects and eight lecture-note roles. Each subject has a transparent icon, a square badge, and a wide cover. Lecture tools have icons and badges. The ZIP also includes the original Lemniro mark in dark and light versions, a contact sheet, and a manifest.

## Authoring and regeneration

- `src/lib/math-marks-foundations.ts`: foundations, algebra, and analysis.
- `src/lib/math-marks-spaces.ts`: geometry, topology, discrete mathematics, and applied mathematics.
- `src/lib/math-marks.ts`: lecture tools, palettes, and topic lookup.
- `scripts/build-math-assets.ts`: standalone SVG exports and ZIP assembly.

Run `npm run assets` after changing the artwork. The normal development and production build commands also run it. Generated files under `public/assets/math/` and the ZIP are ignored by Git and recreated in CI.

All marks use a 64 × 64 grid, currentColor strokes, and rounded joins. Small icons use a slightly stronger line weight for legibility; covers use a lighter line at their larger scale. Subject geometry uses only vector shapes; it has no font or external-image dependency. Cover headings use Georgia/serif and Arial/sans-serif fallbacks, so lettering can vary by installed font.

## Use with lecture notes

The article's existing `topic` metadata selects its mark. For example, `"topic":"Topology"` or `"topic":"Complex analysis"` automatically adds the appropriate icon to cards, article metadata, and the notes library. Unknown topics keep their text label. Additional lookup aliases live in `getMarkByTopic`.

In React, use `<SubjectTag topic="Topology" />`. Use `compact` when only the icon and label are needed without a badge background.

For external use, download individual SVGs or the complete ZIP from the visual library. Transparent icons have a default dark green `color` attribute: change that attribute to recolor a standalone file, or override `color` with CSS when embedding the SVG inline. An SVG loaded through an `<img>` does not inherit the containing page's color.

The motifs identify fields and roles. They are not substitutes for labeled mathematical diagrams in a proof.
