import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { unzipSync } from 'fflate';
import { load } from 'cheerio';
import { allMarks } from '../src/lib/math-marks';

test('every mathematical mark has standalone downloads matching the ZIP and manifest', () => {
  const directory = path.resolve('public/assets/math');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  const archive = unzipSync(fs.readFileSync('public/assets/lemniro-math-assets.zip'));
  assert.equal(new Set(allMarks.map(mark => mark.slug)).size, allMarks.length);
  assert.deepEqual(manifest.marks.map((mark: { slug: string }) => mark.slug), allMarks.map(mark => mark.slug));
  for (const mark of allMarks) {
    const forms = mark.family === 'Lecture tools' ? ['icons', 'badges'] : ['icons', 'badges', 'covers'];
    for (const form of forms) {
      const filename = form + '/' + mark.slug + '.svg';
      const bytes = fs.readFileSync(path.join(directory, filename));
      assert.deepEqual(Buffer.from(archive['lemniro-math-assets/' + filename]), bytes, filename);
      const $ = load(bytes.toString(), { xmlMode: true });
      assert.equal($('svg').length, 1, filename);
      assert.ok($('title').text().includes(mark.label), filename);
      assert.equal($('script,image,foreignObject').length, 0, filename);
      assert.ok(bytes.toString().includes(mark.body), 'The original geometry must survive every format.');
      if (form === 'icons') {
        assert.equal($('text').length, 0, 'Small icons must not depend on installed fonts.');
        assert.equal($('svg').attr('viewBox'), '0 0 64 64');
      }
    }
  }
});
