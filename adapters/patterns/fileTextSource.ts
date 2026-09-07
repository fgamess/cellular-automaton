import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { TextSource } from './BundledPatternCatalog.ts';

const SHIPPED_PATTERNS = resolve(import.meta.dirname, '../../patterns');
const NO_SUCH_FILE = 'ENOENT';

const isMissingFile = (cause: unknown): boolean =>
  cause instanceof Error && (cause as { code?: unknown }).code === NO_SUCH_FILE;

export const fileTextSource: TextSource = async (name) => {
  const file = resolve(SHIPPED_PATTERNS, `${name.value}.cells`);
  if (!file.startsWith(`${SHIPPED_PATTERNS}${sep}`)) {
    throw new RangeError(`"${name.value}" leaves the patterns this repository ships`);
  }
  try {
    return await readFile(file, 'utf8');
  } catch (cause) {
    if (isMissingFile(cause)) {
      throw new RangeError(`no pattern is published under the name ${name}`, { cause });
    }
    throw cause;
  }
};
