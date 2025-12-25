export interface GuidanceItem {
  title: string;
  steps: string[];
  resources?: string[];
}

export const remediationGuidance: Record<string, GuidanceItem> = {
  'COLOR-CONTRAST': {
    title: 'Fix Color Contrast',
    steps: [
      'Identify the text element with insufficient contrast',
      'Change the foreground (text) color to be darker, OR',
      'Change the background color to be lighter',
      'Ensure contrast ratio is at least 4.5:1 for normal text, 3:1 for large text',
      'Use a contrast checker tool to verify the new colors meet WCAG requirements'
    ],
    resources: ['https://webaim.org/resources/contrastchecker/']
  },
  'IMAGE-ALT': {
    title: 'Add Alternative Text',
    steps: [
      'Locate the image element in your EPUB source',
      'Add a descriptive alt attribute that conveys the image content',
      'For decorative images, use alt="" (empty)',
      'Keep alt text concise but meaningful (typically under 125 characters)'
    ]
  },
  'LINK-IN-TEXT-BLOCK': {
    title: 'Distinguish Links from Text',
    steps: [
      'Add underline styling to links within text blocks',
      'Ensure link color has 3:1 contrast with surrounding text',
      'Consider adding other visual indicators (bold, icon)'
    ]
  },
  'EPUB-PAGEBREAK-LABEL': {
    title: 'Add Page Break Labels',
    steps: [
      'Locate page break elements in your EPUB',
      'Add aria-label attribute with page number',
      'Example: <span epub:type="pagebreak" aria-label="Page 42"/>'
    ]
  },
  'EPUB-LANG': {
    title: 'Add Language Declaration',
    steps: [
      'Open your EPUB content file (usually .xhtml)',
      'Add lang attribute to the html element',
      'Example: <html lang="en" xml:lang="en">'
    ]
  },
  'HEADING-ORDER': {
    title: 'Fix Heading Order',
    steps: [
      'Review the heading hierarchy in your document',
      'Ensure headings follow a logical order (h1 → h2 → h3)',
      'Do not skip heading levels (e.g., h1 directly to h3)',
      'Use CSS to style smaller headings if needed, not lower heading levels'
    ]
  },
  'TABLE-HEADER': {
    title: 'Add Table Headers',
    steps: [
      'Identify data tables in your EPUB content',
      'Add <th> elements for header cells instead of <td>',
      'Add scope="col" for column headers or scope="row" for row headers',
      'For complex tables, use id/headers attributes to associate cells'
    ]
  },
  'ARIA-LABEL': {
    title: 'Add ARIA Labels',
    steps: [
      'Identify interactive elements missing accessible names',
      'Add aria-label attribute with descriptive text',
      'Alternatively, use aria-labelledby to reference visible text',
      'Ensure labels are concise but descriptive'
    ]
  },
  'EPUB-TYPE': {
    title: 'Add EPUB Semantic Types',
    steps: [
      'Identify structural elements (chapters, footnotes, glossary)',
      'Add epub:type attribute with appropriate value',
      'Example: <section epub:type="chapter">',
      'Reference EPUB 3 Structural Semantics vocabulary'
    ],
    resources: ['https://www.w3.org/TR/epub-ssv/']
  },
  'METADATA': {
    title: 'Add Required Metadata',
    steps: [
      'Open your EPUB package document (content.opf)',
      'Ensure required metadata elements are present',
      'Add accessibility metadata (accessMode, accessibilityFeature, etc.)',
      'Validate with EPUBCheck after changes'
    ]
  },
  'NAVIGATION': {
    title: 'Fix Navigation Document',
    steps: [
      'Open your EPUB navigation document (nav.xhtml)',
      'Ensure TOC includes all major sections',
      'Add page-list nav element if print page numbers exist',
      'Verify navigation links work correctly'
    ]
  }
};

export function getGuidance(issueCode: string): GuidanceItem | null {
  if (remediationGuidance[issueCode]) {
    return remediationGuidance[issueCode];
  }
  
  const codeUpper = issueCode.toUpperCase();
  for (const key of Object.keys(remediationGuidance)) {
    if (codeUpper.includes(key) || key.includes(codeUpper)) {
      return remediationGuidance[key];
    }
  }
  
  return null;
}
