# Latin Modern web fonts

Original fonts: [Latin Modern](https://www.gust.org.pl/projects/e-foundry/latin-modern)
and [Latin Modern Math](https://www.gust.org.pl/projects/e-foundry/lm-math),
by Bogusław Jackowski, Janusz M. Nowacki, and the contributors credited in
the upstream READMEs. Distributed under the GUST Font License; see the
included license and LPPL text.

These are full WOFF2 conversions of the TeX Live OpenType files listed in
`manifest.json`. No glyphs were removed or outlines changed. Conversion used
fontTools (`TTFont`, `font.flavor = 'woff2'`) with Brotli. The character maps
and compiled MATH table were checked against the originals after conversion.
The CSS aliases “Lemniro Roman” and “Lemniro Math” are local font-family names,
not claims of authorship or modifications to the font designs.

The fonts are committed so website builds need neither Python nor a font CDN.
Use all four text faces rather than synthesized bold or italic. Do not apply
a Latin-only Unicode range to the math font: mathematical alphabets are outside
that range and would silently fall back to a visitor's system fonts.
