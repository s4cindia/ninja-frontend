import type { QuickFixTemplate, QuickFix } from '@/types/quickfix.types';

const metadataAccessModeTemplate: QuickFixTemplate = {
  id: 'metadata-accessmode',
  title: 'Add Access Mode Metadata',
  description: 'Define how users can perceive the content (textual, visual, auditory, tactile)',
  targetFile: 'content.opf',
  inputs: [
    {
      type: 'checkbox-group',
      id: 'accessModes',
      label: 'Access Modes',
      helpText: 'Select all modes through which content can be accessed',
      options: [
        { value: 'textual', label: 'Textual', description: 'Content can be read as text' },
        { value: 'visual', label: 'Visual', description: 'Content requires vision (images, charts)' },
        { value: 'auditory', label: 'Auditory', description: 'Content includes audio' },
        { value: 'tactile', label: 'Tactile', description: 'Content requires touch interaction' },
      ],
      default: ['textual', 'visual'],
    },
    {
      type: 'radio-group',
      id: 'sufficientMode',
      label: 'Sufficient Access Mode',
      helpText: 'The minimum mode(s) required to fully access all content',
      options: [
        { value: 'textual', label: 'Textual Only', description: 'All content accessible via text' },
        { value: 'visual', label: 'Visual Only', description: 'Requires visual access' },
        { value: 'textual,visual', label: 'Textual and Visual', description: 'Both modes needed for full access' },
      ],
      default: 'textual',
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const accessModes = (inputs.accessModes as string[]) || ['textual'];
    const sufficientMode = (inputs.sufficientMode as string) || 'textual';
    
    const modeElements = accessModes
      .map(mode => `<meta property="schema:accessMode">${mode}</meta>`)
      .join('\n    ');
    
    const sufficientElement = `<meta property="schema:accessModeSufficient">${sufficientMode}</meta>`;
    
    const content = `    ${modeElements}\n    ${sufficientElement}`;
    
    return {
      issueId: context.issueId,
      targetFile: 'content.opf',
      changes: [{
        type: 'insert',
        filePath: 'content.opf',
        content,
        description: 'Add accessMode and accessModeSufficient metadata',
      }],
      summary: `Added ${accessModes.length} access mode(s) and sufficient mode: ${sufficientMode}`,
    };
  },
};

const metadataAccessibilityFeatureTemplate: QuickFixTemplate = {
  id: 'metadata-accessibilityfeature',
  title: 'Add Accessibility Features Metadata',
  description: 'Declare the accessibility features present in this publication',
  targetFile: 'content.opf',
  inputs: [
    {
      type: 'checkbox-group',
      id: 'navigationFeatures',
      label: 'Navigation Features',
      helpText: 'Features that help users navigate the content',
      options: [
        { value: 'tableOfContents', label: 'Table of Contents', description: 'Navigable TOC included' },
        { value: 'structuralNavigation', label: 'Structural Navigation', description: 'Proper heading hierarchy' },
        { value: 'readingOrder', label: 'Reading Order', description: 'Logical reading sequence defined' },
        { value: 'index', label: 'Index', description: 'Searchable index available' },
      ],
      default: ['tableOfContents', 'structuralNavigation', 'readingOrder'],
    },
    {
      type: 'checkbox-group',
      id: 'contentFeatures',
      label: 'Content Features',
      helpText: 'Features that make content accessible',
      options: [
        { value: 'alternativeText', label: 'Alternative Text', description: 'Alt text for images' },
        { value: 'longDescription', label: 'Long Descriptions', description: 'Extended descriptions for complex images' },
        { value: 'captions', label: 'Captions', description: 'Captions for audio/video' },
        { value: 'transcript', label: 'Transcripts', description: 'Text transcripts for media' },
      ],
      default: ['alternativeText'],
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const navigationFeatures = (inputs.navigationFeatures as string[]) || [];
    const contentFeatures = (inputs.contentFeatures as string[]) || [];
    const allFeatures = [...navigationFeatures, ...contentFeatures];
    
    const featureElements = allFeatures
      .map(feature => `<meta property="schema:accessibilityFeature">${feature}</meta>`)
      .join('\n    ');
    
    const content = `    ${featureElements}`;
    
    return {
      issueId: context.issueId,
      targetFile: 'content.opf',
      changes: [{
        type: 'insert',
        filePath: 'content.opf',
        content,
        description: 'Add accessibilityFeature metadata elements',
      }],
      summary: `Added ${allFeatures.length} accessibility feature(s)`,
    };
  },
};

const metadataAccessibilityHazardTemplate: QuickFixTemplate = {
  id: 'metadata-accessibilityhazard',
  title: 'Add Accessibility Hazard Metadata',
  description: 'Declare any accessibility hazards present in this publication',
  targetFile: 'content.opf',
  inputs: [
    {
      type: 'radio-group',
      id: 'hazardType',
      label: 'Hazard Declaration',
      helpText: 'Does this publication contain any accessibility hazards?',
      options: [
        { value: 'none', label: 'No Hazards', description: 'Publication contains no known hazards' },
        { value: 'unknown', label: 'Unknown', description: 'Hazard status has not been assessed' },
        { value: 'specific', label: 'Specific Hazards', description: 'Select specific hazards below' },
      ],
      default: 'none',
    },
    {
      type: 'checkbox-group',
      id: 'hazards',
      label: 'Specific Hazards',
      helpText: 'Select all hazards present (only applies if "Specific Hazards" selected above)',
      options: [
        { value: 'flashing', label: 'Flashing', description: 'Content contains flashing elements (photosensitive risk)' },
        { value: 'motionSimulation', label: 'Motion Simulation', description: 'Content may cause motion sickness' },
        { value: 'sound', label: 'Sound', description: 'Contains unexpected or loud sounds' },
      ],
      default: [],
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const hazardType = (inputs.hazardType as string) || 'none';
    const specificHazards = (inputs.hazards as string[]) || [];
    
    let hazardElements: string;
    
    if (hazardType === 'none') {
      hazardElements = `<meta property="schema:accessibilityHazard">none</meta>`;
    } else if (hazardType === 'unknown') {
      hazardElements = `<meta property="schema:accessibilityHazard">unknown</meta>`;
    } else {
      if (specificHazards.length === 0) {
        hazardElements = `<meta property="schema:accessibilityHazard">none</meta>`;
      } else {
        hazardElements = specificHazards
          .map(hazard => `<meta property="schema:accessibilityHazard">${hazard}</meta>`)
          .join('\n    ');
      }
    }
    
    const content = `    ${hazardElements}`;
    
    return {
      issueId: context.issueId,
      targetFile: 'content.opf',
      changes: [{
        type: 'insert',
        filePath: 'content.opf',
        content,
        description: 'Add accessibilityHazard metadata',
      }],
      summary: hazardType === 'none' 
        ? 'Declared no accessibility hazards' 
        : hazardType === 'unknown'
          ? 'Declared hazard status as unknown'
          : `Declared ${specificHazards.length} hazard(s)`,
    };
  },
};

const SUMMARY_TEMPLATES = {
  basic: `This publication meets basic accessibility requirements. All images have alternative text descriptions. The content follows a logical reading order with proper heading structure for navigation.`,
  detailed: `This publication has been designed with accessibility in mind. Key features include:
- Alternative text for all images and graphics
- Logical reading order and navigation
- Structured headings for easy navigation
- Table of contents for quick access
- No accessibility hazards (no flashing content, motion simulation, or unexpected sounds)
The publication is primarily textual and can be accessed through screen readers and other assistive technologies.`,
  wcagAA: `This EPUB publication conforms to WCAG 2.1 Level AA accessibility guidelines. Accessibility features include:
- Complete alternative text for all non-decorative images
- Structured semantic markup with proper heading hierarchy (H1-H6)
- Navigable table of contents linked to content
- Logical reading order maintained throughout
- Sufficient color contrast ratios (minimum 4.5:1 for normal text)
- No content that flashes more than three times per second
- All functionality available via keyboard navigation
The publication has been tested with assistive technologies including screen readers.`,
};

const metadataAccessibilitySummaryTemplate: QuickFixTemplate = {
  id: 'metadata-accessibilitysummary',
  title: 'Add Accessibility Summary',
  description: 'Provide a human-readable summary of accessibility features',
  targetFile: 'content.opf',
  inputs: [
    {
      type: 'radio-group',
      id: 'template',
      label: 'Start from Template',
      helpText: 'Choose a template to start with, then customize below',
      options: [
        { value: 'basic', label: 'Basic', description: 'Simple accessibility statement' },
        { value: 'detailed', label: 'Detailed', description: 'Comprehensive feature list' },
        { value: 'wcagAA', label: 'WCAG AA', description: 'WCAG 2.1 AA conformance statement' },
        { value: 'custom', label: 'Custom', description: 'Write your own summary' },
      ],
      default: 'basic',
    },
    {
      type: 'textarea',
      id: 'summary',
      label: 'Accessibility Summary',
      helpText: 'Describe the accessibility features of this publication',
      placeholder: 'Enter your accessibility summary here...',
      required: true,
      default: SUMMARY_TEMPLATES.basic,
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const templateKey = inputs.template as string;
    let summary = inputs.summary as string;
    
    if (templateKey && templateKey !== 'custom') {
      const templateText = SUMMARY_TEMPLATES[templateKey as keyof typeof SUMMARY_TEMPLATES];
      if (templateText && (!summary || summary === SUMMARY_TEMPLATES.basic)) {
        summary = templateText;
      }
    }
    
    const escapedSummary = summary
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    const content = `    <meta property="schema:accessibilitySummary">${escapedSummary}</meta>`;
    
    return {
      issueId: context.issueId,
      targetFile: 'content.opf',
      changes: [{
        type: 'insert',
        filePath: 'content.opf',
        content,
        description: 'Add accessibilitySummary metadata',
      }],
      summary: `Added accessibility summary (${summary.length} characters)`,
    };
  },
};

const landmarkUniqueTemplate: QuickFixTemplate = {
  id: 'landmark-unique',
  title: 'Add Unique Landmark Labels',
  description: 'Add aria-label attributes to make navigation landmarks distinguishable',
  targetFile: 'nav.xhtml',
  inputs: [
    {
      type: 'text',
      id: 'tocLabel',
      label: 'Table of Contents Label',
      helpText: 'Accessible name for the table of contents navigation',
      placeholder: 'Table of Contents',
      default: 'Table of Contents',
    },
    {
      type: 'text',
      id: 'landmarksLabel',
      label: 'Landmarks Label',
      helpText: 'Accessible name for the landmarks navigation',
      placeholder: 'Landmarks',
      default: 'Landmarks',
    },
    {
      type: 'text',
      id: 'pageListLabel',
      label: 'Page List Label',
      helpText: 'Accessible name for the page list navigation',
      placeholder: 'Page List',
      default: 'Page List',
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const tocLabel = (inputs.tocLabel as string) || 'Table of Contents';
    const landmarksLabel = (inputs.landmarksLabel as string) || 'Landmarks';
    const pageListLabel = (inputs.pageListLabel as string) || 'Page List';
    
    const changes = [];
    
    if (tocLabel) {
      changes.push({
        type: 'replace' as const,
        filePath: context.filePath || 'nav.xhtml',
        oldContent: '<nav epub:type="toc">',
        content: `<nav epub:type="toc" aria-label="${tocLabel}">`,
        description: 'Add aria-label to table of contents nav',
      });
    }
    
    if (landmarksLabel) {
      changes.push({
        type: 'replace' as const,
        filePath: context.filePath || 'nav.xhtml',
        oldContent: '<nav epub:type="landmarks">',
        content: `<nav epub:type="landmarks" aria-label="${landmarksLabel}">`,
        description: 'Add aria-label to landmarks nav',
      });
    }
    
    if (pageListLabel) {
      changes.push({
        type: 'replace' as const,
        filePath: context.filePath || 'nav.xhtml',
        oldContent: '<nav epub:type="page-list">',
        content: `<nav epub:type="page-list" aria-label="${pageListLabel}">`,
        description: 'Add aria-label to page list nav',
      });
    }
    
    return {
      issueId: context.issueId,
      targetFile: context.filePath || 'nav.xhtml',
      changes,
      summary: `Added unique labels to ${changes.length} navigation landmark(s)`,
    };
  },
};

const EPUB_TYPE_TO_ROLE: Record<string, string> = {
  'chapter': 'doc-chapter',
  'part': 'doc-part',
  'appendix': 'doc-appendix',
  'bibliography': 'doc-bibliography',
  'colophon': 'doc-colophon',
  'conclusion': 'doc-conclusion',
  'cover': 'doc-cover',
  'dedication': 'doc-dedication',
  'endnotes': 'doc-endnotes',
  'epilogue': 'doc-epilogue',
  'errata': 'doc-errata',
  'footnote': 'doc-footnote',
  'foreword': 'doc-foreword',
  'glossary': 'doc-glossary',
  'index': 'doc-index',
  'introduction': 'doc-introduction',
  'noteref': 'doc-noteref',
  'notice': 'doc-notice',
  'pagebreak': 'doc-pagebreak',
  'pagelist': 'doc-pagelist',
  'preface': 'doc-preface',
  'prologue': 'doc-prologue',
  'pullquote': 'doc-pullquote',
  'qna': 'doc-qna',
  'sidebar': 'complementary',
  'tip': 'doc-tip',
  'toc': 'doc-toc',
  'abstract': 'doc-abstract',
  'acknowledgments': 'doc-acknowledgments',
  'afterword': 'doc-afterword',
  'credits': 'doc-credits',
  'endnote': 'doc-endnote',
  'subtitle': 'doc-subtitle',
  'frontmatter': 'doc-frontmatter',
  'bodymatter': 'doc-bodymatter',
  'backmatter': 'doc-backmatter',
  'titlepage': 'doc-titlepage',
  'epigraph': 'doc-epigraph',
  'footnotes': 'doc-footnotes',
  'rearnote': 'doc-endnote',
  'rearnotes': 'doc-endnotes',
  'landmarks': 'navigation',
  'loi': 'doc-loi',
  'lot': 'doc-lot',
  'nav': 'navigation',
};

function getEpubTypeDescription(epubType: string): string {
  const descriptions: Record<string, string> = {
    'chapter': 'Main chapter content',
    'part': 'Major division of content',
    'toc': 'Table of contents',
    'frontmatter': 'Front matter section',
    'bodymatter': 'Main body content',
    'backmatter': 'Back matter section',
    'dedication': 'Dedication page',
    'epigraph': 'Quotation at start',
    'titlepage': 'Title page',
    'landmarks': 'Navigation landmarks',
    'noteref': 'Note reference',
    'rearnote': 'End/rear note',
    'rearnotes': 'End/rear notes section',
    'footnote': 'Footnote content',
    'footnotes': 'Footnotes section',
    'endnote': 'Endnote content',
    'endnotes': 'Endnotes section',
    'appendix': 'Supplementary content',
    'bibliography': 'List of references',
    'glossary': 'Term definitions',
    'index': 'Alphabetical index',
    'foreword': 'Foreword section',
    'preface': 'Preface section',
    'introduction': 'Introduction section',
    'epilogue': 'Epilogue section',
    'afterword': 'Afterword section',
    'conclusion': 'Conclusion section',
    'sidebar': 'Sidebar content',
    'cover': 'Cover page',
    'colophon': 'Colophon page',
    'acknowledgments': 'Acknowledgments section',
  };
  return descriptions[epubType] || `${epubType} content`;
}

function detectEpubTypesFromContext(context: { currentContent?: string; issueMessage?: string }): string[] {
  let detectedTypes: string[] = [];

  if (context.issueMessage) {
    const match = context.issueMessage.match(/epub:type[=:]\s*["']?(\w+)["']?/i);
    if (match) {
      detectedTypes.push(match[1]);
    }
  }

  if (context.currentContent) {
    const matches = context.currentContent.match(/epub:type\s*=\s*["']([^"']+)["']/g) || [];
    const extracted = matches.map(m => {
      const val = m.match(/["']([^"']+)["']/);
      return val ? val[1] : '';
    }).filter(Boolean);
    detectedTypes = [...new Set([...detectedTypes, ...extracted])];
  }

  return detectedTypes;
}

const epubTypeRoleTemplate: QuickFixTemplate = {
  id: 'epub-type-role',
  title: 'Add ARIA Roles to epub:type Elements',
  description: 'Add matching ARIA roles to elements with epub:type for better accessibility',
  targetFile: 'content.xhtml',
  
  requiresAsyncData: true,
  
  loadAsyncData: async (context) => {
    try {
      const { scanEpubTypes } = await import('@/services/quickfix.service');
      const result = await scanEpubTypes(context.jobId || '');
      return {
        detectedEpubTypes: result.epubTypes,
        scannedFiles: result.files,
      };
    } catch (error) {
      console.error('Failed to scan epub:types:', error);
      return { detectedEpubTypes: [], scannedFiles: [], error: 'Failed to scan EPUB' };
    }
  },
  
  inputs: [
    {
      type: 'checkbox-group',
      id: 'selectedEpubTypes',
      label: 'Elements to Update',
      helpText: 'Select which epub:type elements should receive matching ARIA roles',
      options: [],
    },
  ],
  
  getInputFields: (context) => {
    const detectedTypes = context.detectedEpubTypes || [];
    
    if (detectedTypes.length === 0) {
      const fallbackTypes = detectEpubTypesFromContext(context);
      
      if (fallbackTypes.length === 0) {
        return [
          {
            type: 'text' as const,
            id: 'noTypesFound',
            label: 'No epub:type elements found',
            helpText: 'No epub:type attributes were found in this file. This issue may have already been resolved or the file structure is different than expected.',
          },
        ];
      }
      
      return [
        {
          type: 'checkbox-group' as const,
          id: 'selectedEpubTypes',
          label: 'Elements to Update',
          helpText: `Found ${fallbackTypes.length} epub:type value(s). Select which should receive ARIA roles:`,
          options: fallbackTypes.map(epubType => ({
            value: epubType,
            label: `${epubType} → ${EPUB_TYPE_TO_ROLE[epubType] || 'doc-' + epubType}`,
            description: getEpubTypeDescription(epubType),
          })),
          default: fallbackTypes,
        },
      ];
    }
    
    return [
      {
        type: 'checkbox-group' as const,
        id: 'selectedEpubTypes',
        label: 'Elements to Update',
        helpText: `Found ${detectedTypes.length} unique epub:type value(s) in the file. Select which should receive ARIA roles:`,
        options: detectedTypes.map(item => ({
          value: item.value,
          label: `${item.value} → ${item.suggestedRole || EPUB_TYPE_TO_ROLE[item.value] || 'doc-' + item.value}`,
          description: `${getEpubTypeDescription(item.value)} (${item.count} occurrence${item.count > 1 ? 's' : ''})`,
        })),
        default: detectedTypes.map(item => item.value),
      },
    ];
  },
  
  validateInput: (inputs) => {
    const selectedTypes = inputs.selectedEpubTypes as string[];
    return selectedTypes && selectedTypes.length > 0;
  },
  
  generateFix: (inputs, context) => {
    const selectedTypes = (inputs.selectedEpubTypes as string[]) || [];
    
    if (selectedTypes.length === 0) {
      return {
        isValid: false,
        error: 'Please select at least one epub:type element to update',
        changes: [],
      };
    }
    
    const changes = selectedTypes.map(epubType => {
      const role = EPUB_TYPE_TO_ROLE[epubType] || `doc-${epubType}`;
      return {
        type: 'replace' as const,
        filePath: context.filePath || 'content.xhtml',
        oldContent: `epub:type="${epubType}"`,
        content: `epub:type="${epubType}" role="${role}"`,
        description: `Add role="${role}" to epub:type="${epubType}"`,
      };
    });
    
    return {
      isValid: true,
      issueId: context.issueId,
      targetFile: context.filePath || 'content.xhtml',
      changes,
      summary: `Add ARIA roles to ${selectedTypes.length} epub:type element(s): ${selectedTypes.join(', ')}`,
    };
  },
};

const headingStructureTemplate: QuickFixTemplate = {
  id: 'heading-structure',
  title: 'Fix Heading Structure',
  description: 'Correct heading hierarchy to follow proper nesting order (h1 → h2 → h3, etc.)',
  targetFile: 'content.xhtml',
  inputs: [
    {
      type: 'radio-group',
      id: 'fixMethod',
      label: 'Fix Method',
      helpText: 'Choose how to correct the heading structure',
      options: [
        { 
          value: 'adjust-down', 
          label: 'Adjust Levels Down', 
          description: 'Increase heading levels to fix skips (e.g., h1→h3 becomes h1→h2→h3)' 
        },
        { 
          value: 'adjust-up', 
          label: 'Adjust Levels Up', 
          description: 'Decrease heading levels where over-nested (e.g., h4 after h1 becomes h2)' 
        },
        { 
          value: 'normalize', 
          label: 'Normalize All', 
          description: 'Restructure all headings to follow sequential order' 
        },
        { 
          value: 'keep', 
          label: 'Keep Current', 
          description: 'Do not modify heading levels' 
        },
      ],
      default: 'adjust-up',
    },
    {
      type: 'checkbox-group',
      id: 'options',
      label: 'Additional Options',
      options: [
        { 
          value: 'preserveH1', 
          label: 'Preserve H1', 
          description: 'Keep the first h1 unchanged as document title' 
        },
        { 
          value: 'addAriaLevel', 
          label: 'Add aria-level', 
          description: 'Add aria-level attribute for complex cases' 
        },
      ],
      default: ['preserveH1'],
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const fixMethod = (inputs.fixMethod as string) || 'adjust-up';
    const options = (inputs.options as string[]) || [];
    const preserveH1 = options.includes('preserveH1');
    const addAriaLevel = options.includes('addAriaLevel');
    
    if (fixMethod === 'keep') {
      return {
        issueId: context.issueId,
        targetFile: context.filePath || 'content.xhtml',
        changes: [],
        summary: 'No changes made - heading structure preserved',
      };
    }
    
    const changes = [];
    const currentContent = context.currentContent || '';
    const headingRegex = /<h([1-6])([^>]*)>(.*?)<\/h\1>/gi;
    let match;
    let lastLevel = 0;
    let lineNum = 1;
    
    while ((match = headingRegex.exec(currentContent)) !== null) {
      const level = parseInt(match[1], 10);
      const attrs = match[2];
      const content = match[3];
      const fullMatch = match[0];
      
      lineNum = currentContent.substring(0, match.index).split('\n').length;
      
      if (preserveH1 && level === 1 && lastLevel === 0) {
        lastLevel = 1;
        continue;
      }
      
      let newLevel = level;
      
      if (fixMethod === 'adjust-up' && level > lastLevel + 1 && lastLevel > 0) {
        newLevel = lastLevel + 1;
      } else if (fixMethod === 'adjust-down' && level < lastLevel) {
        newLevel = lastLevel;
      } else if (fixMethod === 'normalize') {
        newLevel = Math.min(level, lastLevel + 1);
        if (lastLevel === 0) newLevel = 1;
      }
      
      if (newLevel !== level) {
        let newAttrs = attrs;
        if (addAriaLevel) {
          newAttrs = ` aria-level="${newLevel}"${attrs}`;
        }
        
        changes.push({
          type: 'replace' as const,
          filePath: context.filePath || 'content.xhtml',
          oldContent: fullMatch,
          content: `<h${newLevel}${newAttrs}>${content}</h${newLevel}>`,
          lineNumber: lineNum,
          description: `Change h${level} to h${newLevel}`,
        });
      }
      
      lastLevel = newLevel;
    }
    
    return {
      issueId: context.issueId,
      targetFile: context.filePath || 'content.xhtml',
      changes,
      summary: changes.length > 0 
        ? `Fixed ${changes.length} heading level issue(s)` 
        : 'No heading issues found to fix',
    };
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return null;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return null;
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function suggestCompliantColor(foreground: string, background: string, targetRatio = 4.5): string {
  const bgRgb = hexToRgb(background);
  const fgRgb = hexToRgb(foreground);
  if (!bgRgb || !fgRgb) return foreground;
  
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const fgLuminance = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  
  const needsDarker = fgLuminance > bgLuminance;
  
  let bestColor = foreground;
  let bestRatio = calculateContrastRatio(foreground, background) || 0;
  
  for (let step = 0; step <= 100; step++) {
    const factor = step / 100;
    let r: number, g: number, b: number;
    
    if (needsDarker) {
      r = Math.round(fgRgb.r * (1 - factor));
      g = Math.round(fgRgb.g * (1 - factor));
      b = Math.round(fgRgb.b * (1 - factor));
    } else {
      r = Math.round(fgRgb.r + (255 - fgRgb.r) * factor);
      g = Math.round(fgRgb.g + (255 - fgRgb.g) * factor);
      b = Math.round(fgRgb.b + (255 - fgRgb.b) * factor);
    }
    
    const testColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const ratio = calculateContrastRatio(testColor, background);
    
    if (ratio && ratio >= targetRatio) {
      return testColor;
    }
    
    if (ratio && ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = testColor;
    }
  }
  
  return bestColor;
}

const colorContrastTemplate: QuickFixTemplate = {
  id: 'color-contrast',
  title: 'Fix Color Contrast',
  description: 'Adjust colors to meet WCAG contrast requirements (4.5:1 for normal text)',
  targetFile: 'styles.css',
  inputs: [
    {
      type: 'color-picker',
      id: 'foregroundColor',
      label: 'Foreground (Text) Color',
      helpText: 'The color of the text',
      default: '#767676',
    },
    {
      type: 'color-picker',
      id: 'backgroundColor',
      label: 'Background Color',
      helpText: 'The background color behind the text',
      default: '#ffffff',
    },
    {
      type: 'radio-group',
      id: 'targetLevel',
      label: 'Target Compliance Level',
      helpText: 'Choose the WCAG compliance level to meet',
      options: [
        { value: 'aa-normal', label: 'AA Normal Text (4.5:1)', description: 'Standard requirement for body text' },
        { value: 'aa-large', label: 'AA Large Text (3:1)', description: 'For text 18pt+ or 14pt+ bold' },
        { value: 'aaa-normal', label: 'AAA Normal Text (7:1)', description: 'Enhanced contrast for body text' },
        { value: 'aaa-large', label: 'AAA Large Text (4.5:1)', description: 'Enhanced contrast for large text' },
      ],
      default: 'aa-normal',
    },
    {
      type: 'radio-group',
      id: 'fixMethod',
      label: 'Fix Method',
      options: [
        { value: 'adjust-foreground', label: 'Adjust Foreground', description: 'Modify text color to meet contrast' },
        { value: 'adjust-background', label: 'Adjust Background', description: 'Modify background color to meet contrast' },
        { value: 'use-suggested', label: 'Use Suggested Colors', description: 'Apply automatically suggested compliant colors' },
      ],
      default: 'use-suggested',
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    let foreground = (inputs.foregroundColor as string) || '#767676';
    const background = (inputs.backgroundColor as string) || '#ffffff';
    const targetLevel = (inputs.targetLevel as string) || 'aa-normal';
    const fixMethod = (inputs.fixMethod as string) || 'use-suggested';
    
    const targetRatios: Record<string, number> = {
      'aa-normal': 4.5,
      'aa-large': 3,
      'aaa-normal': 7,
      'aaa-large': 4.5,
    };
    const targetRatio = targetRatios[targetLevel] || 4.5;
    
    let newForeground = foreground;
    let newBackground = background;
    
    if (fixMethod === 'use-suggested' || fixMethod === 'adjust-foreground') {
      newForeground = suggestCompliantColor(foreground, background, targetRatio);
    } else if (fixMethod === 'adjust-background') {
      newBackground = suggestCompliantColor(background, foreground, targetRatio);
    }
    
    const currentRatio = calculateContrastRatio(foreground, background);
    const newRatio = calculateContrastRatio(newForeground, newBackground);
    
    const cssSelector = context.elementContext || '.text-element';
    const cssRule = `${cssSelector} {\n  color: ${newForeground};\n  background-color: ${newBackground};\n}`;
    
    return {
      issueId: context.issueId,
      targetFile: context.filePath || 'styles.css',
      changes: [{
        type: 'insert',
        filePath: context.filePath || 'styles.css',
        content: cssRule,
        description: `Add CSS rule with compliant colors (${newRatio?.toFixed(2)}:1 contrast)`,
      }],
      summary: `Improved contrast from ${currentRatio?.toFixed(2)}:1 to ${newRatio?.toFixed(2)}:1`,
    };
  },
};

const imageAltTemplate: QuickFixTemplate = {
  id: 'image-alt',
  title: 'Add Image Alternative Text',
  description: 'Add descriptive alt text to images for screen reader users',
  targetFile: 'content.xhtml',
  inputs: [
    {
      type: 'radio-group',
      id: 'imageType',
      label: 'Image Type',
      helpText: 'Is this image decorative or does it convey information?',
      options: [
        { 
          value: 'decorative', 
          label: 'Decorative Image', 
          description: 'Image is purely visual decoration (will use empty alt="")' 
        },
        { 
          value: 'informative', 
          label: 'Informative Image', 
          description: 'Image conveys information that should be described' 
        },
        { 
          value: 'complex', 
          label: 'Complex Image', 
          description: 'Chart, graph, or diagram requiring extended description' 
        },
      ],
      default: 'informative',
    },
    {
      type: 'textarea',
      id: 'altText',
      label: 'Alternative Text',
      helpText: 'Describe what the image shows. Be concise but complete.',
      placeholder: 'e.g., "Bar chart showing sales growth from 2020 to 2024"',
    },
    {
      type: 'textarea',
      id: 'longDescription',
      label: 'Long Description (for complex images)',
      helpText: 'Provide detailed description for charts, graphs, or complex diagrams',
      placeholder: 'e.g., "The bar chart displays quarterly sales figures..."',
    },
    {
      type: 'radio-group',
      id: 'descriptionMethod',
      label: 'Long Description Method',
      helpText: 'How to include the extended description',
      options: [
        { value: 'aria-describedby', label: 'aria-describedby', description: 'Reference a hidden description element' },
        { value: 'figcaption', label: 'figcaption', description: 'Add visible caption below image' },
        { value: 'details', label: 'details/summary', description: 'Collapsible description block' },
      ],
      default: 'aria-describedby',
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const imageType = (inputs.imageType as string) || 'informative';
    const altText = (inputs.altText as string) || '';
    const longDescription = (inputs.longDescription as string) || '';
    const descriptionMethod = (inputs.descriptionMethod as string) || 'aria-describedby';
    
    const changes = [];
    const currentElement = context.currentContent || '<img src="image.jpg">';
    
    const escapedAlt = altText
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    if (imageType === 'decorative') {
      const newElement = currentElement.includes('alt=')
        ? currentElement.replace(/alt="[^"]*"/, 'alt="" role="presentation"')
        : currentElement.replace(/<img/, '<img alt="" role="presentation"');
      
      changes.push({
        type: 'replace' as const,
        filePath: context.filePath || 'content.xhtml',
        oldContent: currentElement,
        content: newElement,
        description: 'Mark image as decorative with empty alt and presentation role',
      });
    } else if (imageType === 'informative') {
      const newElement = currentElement.includes('alt=')
        ? currentElement.replace(/alt="[^"]*"/, `alt="${escapedAlt}"`)
        : currentElement.replace(/<img/, `<img alt="${escapedAlt}"`);
      
      changes.push({
        type: 'replace' as const,
        filePath: context.filePath || 'content.xhtml',
        oldContent: currentElement,
        content: newElement,
        description: 'Add descriptive alt text to image',
      });
    } else if (imageType === 'complex' && longDescription) {
      const descId = `desc-${context.issueId.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const escapedLongDesc = longDescription
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      let newElement: string;
      let descriptionElement: string;
      
      if (descriptionMethod === 'aria-describedby') {
        newElement = currentElement.includes('alt=')
          ? currentElement.replace(/alt="[^"]*"/, `alt="${escapedAlt}" aria-describedby="${descId}"`)
          : currentElement.replace(/<img/, `<img alt="${escapedAlt}" aria-describedby="${descId}"`);
        descriptionElement = `<div id="${descId}" class="visually-hidden">${escapedLongDesc}</div>`;
      } else if (descriptionMethod === 'figcaption') {
        newElement = `<figure>\n  ${currentElement.includes('alt=') 
          ? currentElement.replace(/alt="[^"]*"/, `alt="${escapedAlt}"`)
          : currentElement.replace(/<img/, `<img alt="${escapedAlt}"`)}\n  <figcaption>${escapedLongDesc}</figcaption>\n</figure>`;
        descriptionElement = '';
      } else {
        newElement = currentElement.includes('alt=')
          ? currentElement.replace(/alt="[^"]*"/, `alt="${escapedAlt}"`)
          : currentElement.replace(/<img/, `<img alt="${escapedAlt}"`);
        descriptionElement = `<details>\n  <summary>Image description</summary>\n  <p>${escapedLongDesc}</p>\n</details>`;
      }
      
      changes.push({
        type: 'replace' as const,
        filePath: context.filePath || 'content.xhtml',
        oldContent: currentElement,
        content: descriptionElement ? `${newElement}\n${descriptionElement}` : newElement,
        description: 'Add alt text and long description for complex image',
      });
    }
    
    return {
      issueId: context.issueId,
      targetFile: context.filePath || 'content.xhtml',
      changes,
      summary: imageType === 'decorative' 
        ? 'Marked image as decorative' 
        : `Added alt text (${altText.length} chars)${longDescription ? ' with extended description' : ''}`,
    };
  },
};

export const quickFixTemplates: Record<string, QuickFixTemplate> = {
  'metadata-accessmode': metadataAccessModeTemplate,
  'metadata-accessibilityfeature': metadataAccessibilityFeatureTemplate,
  'metadata-accessibilityhazard': metadataAccessibilityHazardTemplate,
  'metadata-accessibilitysummary': metadataAccessibilitySummaryTemplate,
  'landmark-unique': landmarkUniqueTemplate,
  'epub-type-role': epubTypeRoleTemplate,
  'heading-structure': headingStructureTemplate,
  'color-contrast': colorContrastTemplate,
  'image-alt': imageAltTemplate,
};

const issueCodeAliases: Record<string, string> = {
  'METADATA-ACCESSMODE': 'metadata-accessmode',
  'METADATA-ACCESSMODESUFFICIENT': 'metadata-accessmode',
  'METADATA-ACCESSIBILITYFEATURE': 'metadata-accessibilityfeature',
  'METADATA-ACCESSIBILITYHAZARD': 'metadata-accessibilityhazard',
  'METADATA-ACCESSIBILITYSUMMARY': 'metadata-accessibilitysummary',
  'EPUB-META-001': 'metadata-accessmode',
  'EPUB-META-002': 'metadata-accessibilityfeature',
  'EPUB-META-003': 'metadata-accessibilitysummary',
  'EPUB-META-004': 'metadata-accessibilityhazard',
  'IMG-ALT-MISSING': 'image-alt',
  'IMG-ALT-EMPTY': 'image-alt',
  'IMG-ALT': 'image-alt',
  'IMG-001': 'image-alt',
  'IMAGE-ALT': 'image-alt',
  'IMAGE-ALT-MISSING': 'image-alt',
  'EPUB-IMG-001': 'image-alt',
  'EPUB-IMG-ALT': 'image-alt',
  'ACE-IMG-001': 'image-alt',
  'HEADING-ORDER': 'heading-structure',
  'HEADING-SKIP': 'heading-structure',
  'HEADING-SKIPPED': 'heading-structure',
  'HEADING-EMPTY': 'heading-empty',
  'LINK-TEXT-EMPTY': 'link-text-empty',
  'LANG-MISSING': 'lang-missing',
  'TABLE-HEADER-MISSING': 'table-header-missing',
  'ARIA-LABEL-MISSING': 'aria-label-missing',
  'COLOR-CONTRAST': 'color-contrast',
  'CONTRAST': 'color-contrast',
  'COLOR-CONTRAST-ENHANCED': 'color-contrast',
  'WCAG-1-4-3': 'color-contrast',
  'WCAG-1-4-6': 'color-contrast',
  'EPUB-TYPE-MISSING': 'epub-type-missing',
  'EPUB-TYPE-HAS-MATCHING-ROLE': 'epub-type-role',
  'EPUB-TYPE-ROLE': 'epub-type-role',
  'EPUB-TYPE-NEEDS-ROLE': 'epub-type-role',
  'EPUB-SEM-003': 'epub-type-role',
  'PAGE-BREAK-MISSING': 'page-break-missing',
  'TOC-MISSING': 'toc-missing',
  'LANDMARKS-MISSING': 'landmarks-missing',
  'LANDMARK-UNIQUE': 'landmark-unique',
  'LANDMARK-NO-DUPLICATE-CONTENTINFO': 'landmark-unique',
  'LANDMARK-NO-DUPLICATE-BANNER': 'landmark-unique',
  'NAV-LABEL-UNIQUE': 'landmark-unique',
};

function normalizeIssueCode(issueCode: string): string {
  const upperCode = issueCode.toUpperCase();
  if (issueCodeAliases[upperCode]) {
    return issueCodeAliases[upperCode];
  }
  return issueCode.toLowerCase().replace(/_/g, '-');
}

export function getQuickFixTemplate(issueCode: string): QuickFixTemplate | undefined {
  const normalizedCode = normalizeIssueCode(issueCode);
  return quickFixTemplates[normalizedCode];
}

export function hasQuickFixTemplate(issueCode: string): boolean {
  return getQuickFixTemplate(issueCode) !== undefined;
}

export function registerQuickFixTemplate(template: QuickFixTemplate): void {
  quickFixTemplates[template.id] = template;
}

export function getAvailableTemplateIds(): string[] {
  return Object.keys(quickFixTemplates);
}
