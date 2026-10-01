import fs from 'node:fs';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { allMarks, mathMarks, getMarkColor } from '../src/lib/math-marks';
import type { MathMark } from '../src/lib/math-marks-types';

const target = path.resolve('public/assets/math');
const files: Record<string, Uint8Array> = {};
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const geometry = (mark: MathMark, transform = '', lineWeight = 1.7) => '<g' + (transform ? ' transform="' + transform + '"' : '') + ' fill="none" stroke="currentColor" stroke-width="' + lineWeight + '" stroke-linecap="round" stroke-linejoin="round">' + mark.body + '</g>';
const brand = '<path d="M23.8 24c-5.4-9.1-9.2-13-13.5-10.7C.7 18.4 12.1 39.6 22.5 25.8L30.7 14c9.2-10.6 17.3 7.3 9.4 12.1-5.5 3.4-9.9-4-16.3-2.1Z" stroke-width="2.3"/><path d="M15 37h19" stroke-width="1.3"/>';
const brandGroup = (transform: string) => '<g transform="' + transform + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + brand + '</g>';
const wrap = (width: number, height: number, title: string, body: string, ink = '#213f32') => '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" color="' + ink + '" role="img" aria-label="' + escape(title) + '"><title>' + escape(title) + '</title>' + body + '</svg>\n';

function save(name: string, content: string) {
  const destination = path.join(target, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  files['lemniro-math-assets/' + name] = strToU8(content);
}

function lines(text: string, limit: number): string[] {
  const result: string[] = [];
  for (const word of text.split(' ')) {
    if (!result.length || (result.at(-1)!.length + word.length + 1 > limit)) result.push(word);
    else result[result.length - 1] += ' ' + word;
  }
  return result;
}

function textLines(text: string, x: number, y: number, limit: number, leading: number): string {
  return lines(text, limit).map((line, index) => '<tspan x="' + x + '" y="' + (y + index * leading) + '">' + escape(line) + '</tspan>').join('');
}

for (const mark of allMarks) {
  const palette = getMarkColor(mark.family);
  save('icons/' + mark.slug + '.svg', wrap(64, 64, mark.label, geometry(mark, '', 2.4)));
  save('badges/' + mark.slug + '.svg', wrap(256, 256, mark.label,
    '<rect x="1" y="1" width="254" height="254" rx="28" fill="' + palette.background + '" stroke="' + palette.border + '"/>'
    + geometry(mark, 'translate(52 48) scale(2.375)')
    + '<path d="M110 224h36" stroke="currentColor" stroke-width="1.5" opacity=".45"/>', palette.ink));
  if (mark.family !== 'Lecture tools') {
    const title = lines(mark.label, 16);
    const titleY = title.length > 2 ? 205 : 235;
    let dots = '';
    for (let x = 548; x <= 876; x += 24) for (let y = 132; y <= 444; y += 24) dots += '<circle cx="' + x + '" cy="' + y + '" r="1" fill="currentColor" opacity=".14"/>';
    save('covers/' + mark.slug + '.svg', wrap(960, 600, mark.label + ' — Lemniro',
      '<rect width="960" height="600" fill="#f6f4ef"/>'
      + '<rect x="500" y="106" width="404" height="380" rx="4" fill="' + palette.background + '" stroke="' + palette.border + '"/>'
      + dots + geometry(mark, 'translate(558 148) scale(4.5)', 1.1)
      + brandGroup('translate(54 38) scale(.85)')
      + '<text x="101" y="66" font-family="Georgia,serif" font-size="29" fill="#213f32">Lemniro.</text>'
      + '<text x="56" y="139" font-family="Arial,sans-serif" font-size="12" letter-spacing="2" fill="' + palette.ink + '">' + escape(mark.family.toUpperCase()) + '</text>'
      + '<text font-family="Georgia,serif" font-size="54" letter-spacing="-1" fill="#213f32">' + textLines(mark.label, 54, titleY, 16, 64) + '</text>'
      + '<text font-family="Arial,sans-serif" font-size="15" fill="#626b5f">' + textLines(mark.description, 57, Math.max(380, titleY + title.length * 64 + 20), 47, 24) + '</text>'
      + '<path d="M56 533h848" stroke="#d4d9cd"/>'
      + '<text x="56" y="563" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.2" fill="#6c7666">OPEN NOTES · CAREFUL PROOFS</text>'
      + '<rect x="891" y="550" width="10" height="10" fill="currentColor"/>', palette.ink));
  }
}

save('brand/lemniro-mark.svg', wrap(48, 48, 'Lemniro', brandGroup('translate(0 0)')));
save('brand/lemniro-mark-light.svg', wrap(48, 48, 'Lemniro', brandGroup('translate(0 0)'), '#f6f4ef'));

const rows = Math.ceil(allMarks.length / 4);
let sheet = '<rect width="1280" height="' + (rows * 155 + 190) + '" fill="#f6f4ef"/>'
  + brandGroup('translate(44 35)')
  + '<text x="107" y="70" fill="#213f32" font-family="Georgia,serif" font-size="34">Lemniro — A language of mathematical marks</text>'
  + '<text x="47" y="112" fill="#6c7666" font-family="Arial,sans-serif" font-size="15">24 subjects · 8 lecture tools · Original vector artwork</text>';
allMarks.forEach((mark, index) => {
  const x = 40 + (index % 4) * 300;
  const y = 153 + Math.floor(index / 4) * 155;
  const palette = getMarkColor(mark.family);
  sheet += '<g color="' + palette.ink + '"><rect x="' + x + '" y="' + y + '" width="282" height="137" rx="4" fill="' + palette.background + '" stroke="' + palette.border + '"/>'
    + geometry(mark, 'translate(' + (x + 112) + ' ' + (y + 10) + ')')
    + '<text x="' + (x + 141) + '" y="' + (y + 97) + '" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#213f32">' + escape(mark.label) + '</text>'
    + '<text x="' + (x + 141) + '" y="' + (y + 119) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#6c7666">' + escape(mark.family) + '</text></g>';
});
save('contact-sheet.svg', wrap(1280, rows * 155 + 190, 'Lemniro mathematics asset collection', sheet));

save('manifest.json', JSON.stringify({ version: 1, viewBox: '0 0 64 64', subjects: mathMarks.length, lectureTools: allMarks.length - mathMarks.length,
  marks: allMarks.map(({ body: _body, ...mark }) => ({ ...mark, palette: getMarkColor(mark.family), icon: 'icons/' + mark.slug + '.svg', badge: 'badges/' + mark.slug + '.svg', ...(mark.family !== 'Lecture tools' ? { cover: 'covers/' + mark.slug + '.svg' } : {}) })) }, null, 2) + '\n');
save('README.txt', 'LEMNIRO MATHEMATICS ASSETS\n'
  + '\n24 mathematical subjects and 8 lecture tools. Original vector drawings for Lemniro.\n'
  + '\nicons/: 64 x 64 transparent SVGs. Geometry uses currentColor; edit the root color attribute or inline the SVG to recolor.\n'
  + 'badges/: 256 x 256 square SVGs with the subject-family palette.\n'
  + 'covers/: 960 x 600 subject covers for cards and lecture title screens. Cover labels use Georgia/serif and Arial/sans-serif fallbacks; geometry itself needs no fonts.\n'
  + 'brand/: the existing Lemniro mark in dark and light versions.\n'
  + 'contact-sheet.svg: all 32 motifs on one sheet.\n'
  + 'manifest.json: names, associations, palettes and paths.\n'
  + '\nCanonical source: src/lib/math-marks*.ts in https://github.com/ddomology/Lemniro\n'
  + 'Regenerate with npm run assets. The website selects a matching icon from a TeX article\'s topic field. Unknown topics retain their plain-text label.\n'
  + '\nThe motifs identify subjects; they are illustrations rather than complete mathematical diagrams.\n');
fs.mkdirSync(path.resolve('public/assets'), { recursive: true });
fs.writeFileSync(path.resolve('public/assets/lemniro-math-assets.zip'), zipSync(files, { level: 9, mtime: new Date(2026, 9, 1) }));
console.log('Generated ' + allMarks.length + ' mathematical motifs, ' + Object.keys(files).filter(name => name.endsWith('.svg')).length + ' SVG files, and a downloadable ZIP.');
