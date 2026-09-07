import process from 'node:process';
import { BundledPatternCatalog } from '../patterns/BundledPatternCatalog.ts';
import { fileTextSource } from '../patterns/fileTextSource.ts';
import { main } from './cli.ts';

process.exitCode = await main(process.argv.slice(2), {
  patterns: new BundledPatternCatalog(fileTextSource),
  out: {
    write(text) {
      process.stdout.write(text);
    },
  },
  err: {
    write(text) {
      process.stderr.write(text);
    },
  },
});
