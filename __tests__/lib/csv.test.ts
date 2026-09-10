import { toCsv } from '@/lib/csv';

describe('toCsv', () => {
  it('emits a UTF-8 BOM and CRLF line endings', () => {
    const csv = toCsv(['a', 'b'], [['1', '2']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('a,b\r\n1,2');
  });

  it('quotes fields containing commas, quotes and newlines', () => {
    const csv = toCsv(['x'], [['he said "hi", twice'], ['line1\nline2']]);
    expect(csv).toContain('"he said ""hi"", twice"');
    expect(csv).toContain('"line1\nline2"');
  });

  it('renders null/undefined as empty', () => {
    const csv = toCsv(['a', 'b', 'c'], [[null, undefined, 'x']]);
    expect(csv).toContain('\r\n,,x');
  });

  it('passes numbers through', () => {
    expect(toCsv(['n'], [[42]])).toContain('42');
  });
});
