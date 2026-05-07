import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
  it('renders heading levels h1–h4', () => {
    const html = renderMarkdown(`# H1\n## H2\n### H3\n#### H4`);
    expect(html).toContain('<h1');
    expect(html).toContain('>H1</h1>');
    expect(html).toContain('<h2');
    expect(html).toContain('>H2</h2>');
    expect(html).toContain('<h3');
    expect(html).toContain('>H3</h3>');
    expect(html).toContain('<h4');
    expect(html).toContain('>H4</h4>');
  });

  it('wraps a GFM table with thead, tbody, and th headers', () => {
    const md = [
      '| Title | Pages | Zones |',
      '|-------|-------|-------|',
      '| Aulakh | 295 | 3045 |',
      '| Acharya | 144 | 3776 |',
    ].join('\n');
    const html = renderMarkdown(md);

    // Table wrapper present
    expect(html).toContain('<table');
    expect(html).toContain('</table>');
    // Header rendered as th, not td
    expect(html).toContain('<thead');
    expect(html).toContain('<th');
    expect(html).toContain('>Title</th>');
    expect(html).toContain('>Pages</th>');
    // Body rows rendered as td
    expect(html).toContain('<tbody>');
    expect(html).toContain('>Aulakh</td>');
    expect(html).toContain('>295</td>');
    // Alignment separator row is not rendered
    expect(html).not.toMatch(/-{3,}/);
  });

  it('skips alignment separators with colons (left/right align syntax)', () => {
    const md = [
      '| A | B |',
      '| :-- | --: |',
      '| 1 | 2 |',
    ].join('\n');
    const html = renderMarkdown(md);
    // The separator should not produce any table cells
    expect(html).not.toContain('>:--<');
    expect(html).not.toContain('>--:<');
  });

  it('wraps unordered list items in <ul>', () => {
    const md = `- first\n- second\n- third`;
    const html = renderMarkdown(md);
    expect(html).toContain('<ul');
    expect(html).toContain('</ul>');
    expect(html.match(/<li/g)?.length).toBe(3);
    expect(html).toContain('>first</li>');
  });

  it('wraps ordered list items in <ol>', () => {
    const md = `1. first\n2. second`;
    const html = renderMarkdown(md);
    expect(html).toContain('<ol');
    expect(html).toContain('</ol>');
    expect(html).toContain('list-decimal');
    expect(html).toContain('>first</li>');
    expect(html).toContain('>second</li>');
  });

  it('closes a table when a heading appears', () => {
    const md = [
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '## Next section',
    ].join('\n');
    const html = renderMarkdown(md);
    // The </table> must come before the next heading
    const tableClose = html.indexOf('</table>');
    const headingOpen = html.indexOf('<h2');
    expect(tableClose).toBeGreaterThan(-1);
    expect(headingOpen).toBeGreaterThan(tableClose);
  });

  it('closes a list when a non-list line appears', () => {
    const md = `- first\n- second\nA paragraph after the list.`;
    const html = renderMarkdown(md);
    const listClose = html.indexOf('</ul>');
    const paragraphOpen = html.indexOf('<p');
    expect(listClose).toBeGreaterThan(-1);
    expect(paragraphOpen).toBeGreaterThan(listClose);
  });

  it('renders inline bold and inline code', () => {
    const md = `Some **bold** and \`code\` text.`;
    const html = renderMarkdown(md);
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code');
    expect(html).toContain('>code</code>');
  });

  it('renders horizontal rules', () => {
    const md = `Above\n\n---\n\nBelow`;
    const html = renderMarkdown(md);
    expect(html).toContain('<hr');
  });

  it('does not emit empty <br> for blank lines (uses block boundaries instead)', () => {
    const md = `One paragraph.\n\nAnother paragraph.`;
    const html = renderMarkdown(md);
    expect(html).not.toContain('<br/>');
    expect(html).not.toContain('<br />');
    // Two paragraphs rendered
    expect(html.match(/<p\s/g)?.length).toBe(2);
  });

  it('preserves the last column when a table row has no trailing pipe', () => {
    const md = [
      '| Title | Pages | Zones',
      '|-------|-------|-------',
      '| Aulakh | 295 | 3045',
    ].join('\n');
    const html = renderMarkdown(md);
    // All three header columns render as <th>
    expect(html).toContain('>Title</th>');
    expect(html).toContain('>Pages</th>');
    expect(html).toContain('>Zones</th>');
    // All three body cells render too
    expect(html).toContain('>Aulakh</td>');
    expect(html).toContain('>295</td>');
    expect(html).toContain('>3045</td>');
  });

  it('closes the overflow wrapper div when ending a table block', () => {
    const md = [
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      'Paragraph after the table.',
    ].join('\n');
    const html = renderMarkdown(md);
    // Wrapper div opens before <table> and closes after </table>
    const wrapperOpen = html.indexOf('overflow-x-auto');
    const tableOpen = html.indexOf('<table');
    const tableClose = html.indexOf('</table>');
    const wrapperClose = html.indexOf('</div>');
    const paragraphOpen = html.indexOf('<p');
    expect(wrapperOpen).toBeGreaterThan(-1);
    expect(tableOpen).toBeGreaterThan(wrapperOpen);
    expect(tableClose).toBeGreaterThan(tableOpen);
    expect(wrapperClose).toBeGreaterThan(tableClose);
    expect(paragraphOpen).toBeGreaterThan(wrapperClose);
  });

  it('does not parse bold inside inline code spans', () => {
    const md = 'A literal `**not bold**` example.';
    const html = renderMarkdown(md);
    expect(html).toContain('<code');
    // The literal **not bold** stays inside the code span
    expect(html).toContain('>**not bold**</code>');
    // No <strong> emitted
    expect(html).not.toContain('<strong>');
  });

  it('handles headings, table, list, paragraphs in sequence cleanly', () => {
    const md = [
      '# Report',
      '',
      '## Cross-Title Comparison',
      '',
      '| Title | Pages |',
      '|-------|-------|',
      '| Aulakh | 295 |',
      '',
      '## Recommendations',
      '',
      '1. Implement throughput caps',
      '2. Mandatory re-review for Boyd-Hamill',
      '',
      'Final paragraph.',
    ].join('\n');

    const html = renderMarkdown(md);

    // Each block exists in order
    const indices = [
      html.indexOf('<h1'),
      html.indexOf('Cross-Title Comparison'),
      html.indexOf('<table'),
      html.indexOf('Recommendations'),
      html.indexOf('<ol'),
      html.indexOf('Final paragraph'),
    ];
    // None are -1 (all present)
    expect(indices.every((i) => i !== -1)).toBe(true);
    // They appear in source order
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });
});
