import { describe, it, expect } from 'vitest';
import { buildCsv } from '../csv-export';

describe('buildCsv', () => {
  it('emits a header row followed by data rows', () => {
    const csv = buildCsv({
      columns: [
        { label: 'Title', value: (r: { title: string; pages: number }) => r.title },
        { label: 'Pages', value: (r: { title: string; pages: number }) => r.pages },
      ],
      rows: [
        { title: 'Aulakh', pages: 295 },
        { title: 'Acharya', pages: 144 },
      ],
    });
    expect(csv).toBe('Title,Pages\r\nAulakh,295\r\nAcharya,144\r\n');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = buildCsv({
      columns: [
        { label: 'A', value: (r: { a: string }) => r.a },
      ],
      rows: [
        { a: 'simple' },
        { a: 'has, comma' },
        { a: 'has "quote"' },
        { a: 'has\nnewline' },
      ],
    });
    expect(csv).toContain('simple');
    expect(csv).toContain('"has, comma"');
    expect(csv).toContain('"has ""quote"""');
    expect(csv).toContain('"has\nnewline"');
  });

  it('renders null/undefined as empty cells', () => {
    const csv = buildCsv({
      columns: [
        { label: 'A', value: (r: { a: string | null | undefined }) => r.a },
        { label: 'B', value: () => 'fixed' },
      ],
      rows: [
        { a: null },
        { a: undefined },
      ],
    });
    expect(csv).toBe('A,B\r\n,fixed\r\n,fixed\r\n');
  });

  it('handles boolean and number cell values', () => {
    const csv = buildCsv({
      columns: [
        { label: 'Done', value: (r: { done: boolean }) => r.done },
        { label: 'Pages', value: (r: { pages: number }) => r.pages },
      ],
      rows: [{ done: true, pages: 42 }],
    });
    expect(csv).toBe('Done,Pages\r\ntrue,42\r\n');
  });

  it('handles an empty rows array (header only)', () => {
    const csv = buildCsv({
      columns: [{ label: 'A', value: () => '' }],
      rows: [],
    });
    expect(csv).toBe('A\r\n');
  });

  it('neutralizes formula-trigger characters to prevent CSV injection', () => {
    const csv = buildCsv({
      columns: [
        { label: 'A', value: (r: { a: string }) => r.a },
      ],
      rows: [
        { a: '=1+1' },           // = formula
        { a: '+lookup()' },       // + formula
        { a: '-cmd|/c calc' },    // - formula (the classic CSV injection)
        { a: '@SUM(A1:A10)' },    // @ formula
        { a: 'safe value' },      // benign — should not be prefixed
      ],
    });
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+lookup()");
    // The '-cmd|/c calc' value is escaped — needs quoting for the | being safe but the string still gets the single-quote prefix
    expect(csv).toContain("'-cmd|/c calc");
    expect(csv).toContain("'@SUM(A1:A10)");
    // Benign value stays unmodified
    expect(csv).toContain('safe value');
    expect(csv).not.toContain("'safe value");
  });
});
