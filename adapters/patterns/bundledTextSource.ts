import type { TextSource } from './BundledPatternCatalog.ts';

const shipped = import.meta.glob('../../patterns/*.cells', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const bundledTextSource: TextSource = (name) => {
  const text = shipped[`../../patterns/${name.value}.cells`];
  return text === undefined
    ? Promise.reject(new RangeError(`no pattern is published under the name ${name}`))
    : Promise.resolve(text);
};
