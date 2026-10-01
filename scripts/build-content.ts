import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent } from './tex-pipeline';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  buildContent(root);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
