import { describe, it, expect } from 'vitest';
import { readCatalogPages } from './catalog-pages';
describe('complete catalog reads', () => {
  it('includes all 1108 products beyond the 1000 response cap', async () => {
    const source = Array.from({ length: 1108 }, (_, id) => ({ id }));
    const rows = await readCatalogPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
    expect(rows).toEqual(source);
    expect(rows[1107]).toEqual({ id: 1107 });
  });
  it('does not return a partial catalog after an error', async () => {
    await expect(readCatalogPages(async () => ({ data: null, error: new Error('read failed') }))).rejects.toThrow('read failed');
  });
});
