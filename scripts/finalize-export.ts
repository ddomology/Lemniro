import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type FinalizeResult = { copied: number; unchanged: number };

/**
 * Next 16.3.8's Windows exporter keeps backslashes in segment filenames,
 * producing directories where the browser expects dots. Preserve the output
 * and add the flat RSC filenames; Linux exports are already correct.
 * https://github.com/vercel/next.js/issues/92339
 */
export async function finalizeExport(exportDirectory: string): Promise<FinalizeResult> {
  const result = { copied: 0, unchanged: 0 };

  async function copySegments(directory: string, routeDirectory: string, segments: string[]): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await copySegments(source, routeDirectory, [...segments, entry.name]);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        const destination = path.join(routeDirectory, [...segments, entry.name].join('.'));
        const bytes = await readFile(source);
        try {
          await writeFile(destination, bytes, { flag: 'wx' });
          result.copied += 1;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          if (!(await readFile(destination)).equals(bytes)) {
            throw new Error(`Static export segment collision: ${destination}`);
          }
          result.unchanged += 1;
        }
      }
    }
  }

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(directory, entry.name);
      if (entry.name.startsWith('__next.')) {
        await copySegments(child, directory, [entry.name]);
      } else {
        await visit(child);
      }
    }
  }

  await visit(path.resolve(exportDirectory));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await finalizeExport(path.resolve('out'));
  console.log(`Static export finalized: ${result.copied} RSC compatibility files copied, ${result.unchanged} already present.`);
}
