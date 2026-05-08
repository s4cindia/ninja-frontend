import { describe, it, expect } from 'vitest';
import { buildCorpusSummaryWordDoc } from '../word-export';

describe('buildCorpusSummaryWordDoc', () => {
  const baseInput = {
    sanitizedHtml: '<h1>Body</h1><p>Hello</p>',
    dateRangeLabel: 'April 7 – May 7, 2026',
    generatedTs: '5/8/2026, 12:00:00 PM',
    modelName: 'claude-opus-4-7',
    s4LogoDataUri: 'data:image/jpeg;base64,AAA',
    ninjaLogoDataUri: 'data:image/jpeg;base64,BBB',
    today: '2026-05-08',
  };

  it('emits Word-namespaced HTML with the expected MIME-friendly structure', () => {
    const out = buildCorpusSummaryWordDoc(baseInput);
    expect(out).toContain('xmlns:o="urn:schemas-microsoft-com:office:office"');
    expect(out).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
    expect(out).toContain('<title>Corpus Summary Report</title>');
    expect(out).toContain('<h1>Corpus Summary Report</h1>');
  });

  it('embeds the sanitized body, date range, generated timestamp, and model', () => {
    const out = buildCorpusSummaryWordDoc(baseInput);
    expect(out).toContain('<h1>Body</h1><p>Hello</p>');
    expect(out).toContain('April 7 – May 7, 2026');
    expect(out).toContain('Generated 5/8/2026, 12:00:00 PM');
    expect(out).toContain('Model: claude-opus-4-7');
  });

  it('embeds both logo data URIs when provided', () => {
    const out = buildCorpusSummaryWordDoc(baseInput);
    expect(out).toContain('src="data:image/jpeg;base64,AAA"');
    expect(out).toContain('src="data:image/jpeg;base64,BBB"');
    expect(out).toContain('alt="S4Carlisle"');
    expect(out).toContain('alt="Ninja"');
  });

  it('falls back to text labels when a logo data URI is null', () => {
    const out = buildCorpusSummaryWordDoc({
      ...baseInput,
      s4LogoDataUri: null,
      ninjaLogoDataUri: null,
    });
    expect(out).not.toContain('<img class="header-logo"');
    expect(out).toContain('>S4Carlisle<');
    expect(out).toContain('>Ninja<');
  });

  it('declares a Word footer section with PAGE / NUMPAGES field codes', () => {
    const out = buildCorpusSummaryWordDoc(baseInput);
    expect(out).toContain('mso-element: footer');
    expect(out).toContain('mso-field-code: PAGE');
    expect(out).toContain('mso-field-code: NUMPAGES');
    expect(out).toContain('Generated 2026-05-08');
  });

  it('uses a teal divider on the branded header row', () => {
    const out = buildCorpusSummaryWordDoc(baseInput);
    expect(out).toContain('border-bottom: 2px solid #006B6B');
  });
});
