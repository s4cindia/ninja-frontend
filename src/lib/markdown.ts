/**
 * Minimal markdown-to-HTML renderer for AI-generated corpus reports.
 *
 * Supports:
 * - Headings (h1–h4)
 * - GFM-style pipe tables with header row + alignment separator (wrapped in
 *   <table><thead>/<tbody>; first non-separator row becomes <th>)
 * - Unordered (- / *) and ordered (1.) lists, wrapped in <ul>/<ol>
 * - Inline bold (**text**) and inline code (`text`)
 * - Horizontal rules (--- or ***)
 * - Paragraphs and blank-line separation
 *
 * Returns HTML as a string. Caller is responsible for sanitizing with
 * DOMPurify before injecting via dangerouslySetInnerHTML.
 *
 * Not supported (intentionally — AI reports don't use these today):
 * - Nested lists
 * - Fenced code blocks (```)
 * - Block quotes
 * - Links / images
 *
 * If the AI reports start using any of these, extend this function rather
 * than adding a markdown library — the report shape is well-controlled.
 */

const ALIGN_SEPARATOR = /^:?-+:?$/;

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-[0.85em] px-1 py-0.5 rounded font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];

  let inTable = false;
  let tableHeaderEmitted = false;
  let listKind: 'ul' | 'ol' | null = null;

  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
      tableHeaderEmitted = false;
    }
  };

  const closeList = () => {
    if (listKind) {
      out.push(`</${listKind}>`);
      listKind = null;
    }
  };

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    // Headings — close any open blocks first.
    if (line.startsWith('#### ')) {
      closeTable();
      closeList();
      out.push(`<h4 class="text-sm font-semibold mt-4 mb-1 text-gray-800">${inline(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      closeTable();
      closeList();
      out.push(`<h3 class="text-base font-semibold mt-5 mb-2 text-gray-900">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeTable();
      closeList();
      out.push(`<h2 class="text-lg font-bold mt-6 mb-2 text-gray-900">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeTable();
      closeList();
      out.push(`<h1 class="text-xl font-bold mt-6 mb-3 text-gray-900">${inline(line.slice(2))}</h1>`);
      continue;
    }

    // Horizontal rule.
    if (trimmed === '---' || trimmed === '***') {
      closeTable();
      closeList();
      out.push('<hr class="my-4 border-gray-200" />');
      continue;
    }

    // Table row (any line starting with `|`).
    if (line.startsWith('|')) {
      closeList();
      // Strip leading and trailing empty cells from `|a|b|c|`.split('|') → ['', 'a', 'b', 'c', '']
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length === 0) continue;
      // Alignment separator row (e.g. |---|---|) — closes the header.
      if (cells.every((c) => ALIGN_SEPARATOR.test(c))) continue;

      if (!inTable) {
        out.push('<div class="overflow-x-auto my-3"><table class="border-collapse border border-gray-200 w-full text-sm">');
        inTable = true;
        tableHeaderEmitted = false;
      }

      if (!tableHeaderEmitted) {
        out.push('<thead class="bg-gray-50">');
        out.push(
          `<tr>${cells
            .map(
              (c) =>
                `<th class="border border-gray-200 px-2 py-1.5 text-left text-xs font-semibold text-gray-700">${inline(c)}</th>`,
            )
            .join('')}</tr>`,
        );
        out.push('</thead><tbody>');
        tableHeaderEmitted = true;
      } else {
        out.push(
          `<tr>${cells
            .map(
              (c) =>
                `<td class="border border-gray-200 px-2 py-1 text-sm text-gray-700 align-top">${inline(c)}</td>`,
            )
            .join('')}</tr>`,
        );
      }
      continue;
    }

    // Unordered list item.
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      closeTable();
      if (listKind && listKind !== 'ul') closeList();
      if (!listKind) {
        out.push('<ul class="list-disc pl-6 my-2 space-y-0.5">');
        listKind = 'ul';
      }
      out.push(`<li class="text-sm text-gray-700">${inline(trimmed.slice(2))}</li>`);
      continue;
    }

    // Ordered list item (1. text).
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (orderedMatch) {
      closeTable();
      if (listKind && listKind !== 'ol') closeList();
      if (!listKind) {
        out.push('<ol class="list-decimal pl-6 my-2 space-y-0.5">');
        listKind = 'ol';
      }
      out.push(`<li class="text-sm text-gray-700">${inline(orderedMatch[1])}</li>`);
      continue;
    }

    // Blank line — closes lists/tables; no <br>.
    if (trimmed === '') {
      closeTable();
      closeList();
      continue;
    }

    // Default: paragraph.
    closeTable();
    closeList();
    out.push(`<p class="text-sm text-gray-700 mb-2 leading-relaxed">${inline(line)}</p>`);
  }

  closeTable();
  closeList();

  return out.join('\n');
}
