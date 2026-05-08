/**
 * Pure functions that build the HTML body for "Save As Word" export.
 *
 * Uses the HTML-to-Word trick: an HTML document with Word-specific XML namespaces
 * and `application/msword` MIME type. Word and Google Docs both open these
 * cleanly. The generated `.doc` file is self-contained — no external resource
 * fetches required after download.
 *
 * Convention follows the precedent in `src/pages/calibration/AnnotationAnalysisPage.tsx`
 * (the existing Annotation Analysis Report export).
 */

export interface CorpusSummaryWordDocInput {
  /** Already-sanitized HTML for the report body (output of DOMPurify on renderMarkdown) */
  sanitizedHtml: string;
  /** Pre-formatted generation timestamp string */
  generatedTs: string;
  /** AI model name used to generate the report */
  modelName: string;
  /** Base64 data URI for the S4Carlisle logo, or null to omit gracefully */
  s4LogoDataUri: string | null;
  /** Base64 data URI for the Ninja logo, or null to omit gracefully */
  ninjaLogoDataUri: string | null;
  /** Today's date as YYYY-MM-DD for the footer */
  today: string;
}

/**
 * Escape user-controlled strings before interpolating into the HTML template.
 * `sanitizedHtml` is exempt — it has already been through DOMPurify.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the full HTML body for a Corpus Summary Word export.
 *
 * The output is a `application/msword`-compatible HTML document with:
 *   - Word-specific XML namespaces in the html tag
 *   - Inline styles (Word ignores external stylesheets)
 *   - Branded header (S4Carlisle left, Ninja right) with a 2pt teal underline
 *   - Title block with date range and metadata
 *   - The sanitized report body
 *   - Word footer field codes for page numbers (rendered automatically on each page)
 *
 * The header uses a table for layout (Word's flexbox support is unreliable).
 * If a logo data URI is null (e.g. fetch failed), a text fallback is used so
 * the document still renders cleanly.
 */
export function buildCorpusSummaryWordDoc(input: CorpusSummaryWordDocInput): string {
  const {
    sanitizedHtml,
    generatedTs,
    modelName,
    s4LogoDataUri,
    ninjaLogoDataUri,
    today,
  } = input;

  const safeGeneratedTs = escapeHtml(generatedTs);
  const safeModelName = escapeHtml(modelName);
  const safeToday = escapeHtml(today);

  const s4HeaderCell = s4LogoDataUri
    ? `<img class="header-logo" src="${s4LogoDataUri}" alt="S4Carlisle" />`
    : `<span style="font-weight:bold;color:#1a1a1a;">S4Carlisle</span>`;

  const ninjaHeaderCell = ninjaLogoDataUri
    ? `<img class="header-logo" src="${ninjaLogoDataUri}" alt="Ninja" />`
    : `<span style="font-weight:bold;color:#006B6B;">Ninja</span>`;

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Corpus Summary Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; line-height: 1.6; margin: 1in; }
    h1 { font-size: 18pt; font-weight: bold; color: #1a1a1a; margin-top: 24pt; margin-bottom: 12pt; }
    h2 { font-size: 14pt; font-weight: bold; color: #1a1a1a; margin-top: 20pt; margin-bottom: 8pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; }
    h3 { font-size: 12pt; font-weight: 600; color: #1a1a1a; margin-top: 16pt; margin-bottom: 6pt; }
    h4 { font-size: 11pt; font-weight: 600; color: #1a1a1a; margin-top: 12pt; margin-bottom: 4pt; }
    p { font-size: 11pt; color: #374151; margin-bottom: 4pt; }
    table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
    th { border: 1px solid #d1d5db; padding: 6pt 10pt; text-align: left; font-weight: 600; background-color: #f9fafb; color: #374151; font-size: 10pt; }
    td { border: 1px solid #d1d5db; padding: 6pt 10pt; color: #4b5563; font-size: 10pt; }
    li { font-size: 11pt; color: #374151; margin-left: 16pt; margin-bottom: 2pt; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16pt 0; }
    table.header-row { width: 100%; margin: 0 0 24pt 0; padding-bottom: 12pt; border-bottom: 2px solid #006B6B; }
    table.header-row td { border: none; padding: 0; vertical-align: middle; }
    .header-logo { height: 50pt; }
    .title-block { margin-bottom: 24pt; }
    .title-block h1 { margin-top: 0; margin-bottom: 4pt; }
    .title-block .meta { color: #6b7280; font-size: 9pt; margin-bottom: 0; }
    @page Section1 { mso-footer: f1; size: 8.5in 11.0in; margin: 1in; }
    div.Section1 { page: Section1; }
  </style>
</head>
<body>
  <div class="Section1">
    <table class="header-row"><tr>
      <td style="text-align:left;">${s4HeaderCell}</td>
      <td style="text-align:right;">${ninjaHeaderCell}</td>
    </tr></table>
    <div class="title-block">
      <h1>Corpus Summary Report</h1>
      <p class="meta">Generated ${safeGeneratedTs} · Model: ${safeModelName}</p>
    </div>
    ${sanitizedHtml}
    <div style="mso-element: footer" id="f1">
      <p style="font-size:8pt;color:#9ca3af;text-align:center;">
        Ninja Accessibility Platform · Page <span style="mso-field-code: PAGE"></span> of <span style="mso-field-code: NUMPAGES"></span> · Generated ${safeToday}
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Fetch a static asset path and return a base64 data URI.
 *
 * Used to inline image assets into a Word export so the resulting `.doc` file
 * is self-contained (no external resource fetches required when opened on
 * another machine).
 *
 * Returns null if the fetch fails (e.g. the asset is missing in production)
 * — the caller is expected to gracefully fall back to a text-only header.
 */
export async function fetchAsDataUri(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
