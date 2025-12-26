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
        path: 'content.opf',
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
        path: 'content.opf',
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
        path: 'content.opf',
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
        path: 'content.opf',
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
        path: context.filePath || 'nav.xhtml',
        oldContent: '<nav epub:type="toc">',
        content: `<nav epub:type="toc" aria-label="${tocLabel}">`,
        description: 'Add aria-label to table of contents nav',
      });
    }
    
    if (landmarksLabel) {
      changes.push({
        type: 'replace' as const,
        path: context.filePath || 'nav.xhtml',
        oldContent: '<nav epub:type="landmarks">',
        content: `<nav epub:type="landmarks" aria-label="${landmarksLabel}">`,
        description: 'Add aria-label to landmarks nav',
      });
    }
    
    if (pageListLabel) {
      changes.push({
        type: 'replace' as const,
        path: context.filePath || 'nav.xhtml',
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
};

const epubTypeRoleTemplate: QuickFixTemplate = {
  id: 'epub-type-role',
  title: 'Add ARIA Roles to epub:type Elements',
  description: 'Add matching ARIA roles to elements with epub:type for better accessibility',
  targetFile: 'content.xhtml',
  inputs: [
    {
      type: 'checkbox-group',
      id: 'epubTypes',
      label: 'Elements to Update',
      helpText: 'Select which epub:type elements should receive matching ARIA roles',
      options: [
        { value: 'chapter', label: 'chapter → doc-chapter', description: 'Main chapter content' },
        { value: 'part', label: 'part → doc-part', description: 'Major division of content' },
        { value: 'appendix', label: 'appendix → doc-appendix', description: 'Supplementary content' },
        { value: 'bibliography', label: 'bibliography → doc-bibliography', description: 'List of references' },
        { value: 'glossary', label: 'glossary → doc-glossary', description: 'Term definitions' },
        { value: 'index', label: 'index → doc-index', description: 'Alphabetical index' },
        { value: 'toc', label: 'toc → doc-toc', description: 'Table of contents' },
        { value: 'footnote', label: 'footnote → doc-footnote', description: 'Footnote content' },
        { value: 'endnote', label: 'endnote → doc-endnote', description: 'Endnote content' },
        { value: 'sidebar', label: 'sidebar → complementary', description: 'Sidebar content' },
      ],
      default: ['chapter', 'part', 'appendix', 'bibliography', 'glossary', 'index', 'toc'],
    },
  ],
  generateFix: (inputs, context): QuickFix => {
    const selectedTypes = (inputs.epubTypes as string[]) || [];
    
    const changes = selectedTypes.map(epubType => {
      const role = EPUB_TYPE_TO_ROLE[epubType] || `doc-${epubType}`;
      return {
        type: 'replace' as const,
        path: context.filePath || 'content.xhtml',
        oldContent: `epub:type="${epubType}"`,
        content: `epub:type="${epubType}" role="${role}"`,
        description: `Add role="${role}" to epub:type="${epubType}"`,
      };
    });
    
    return {
      issueId: context.issueId,
      targetFile: context.filePath || 'content.xhtml',
      changes,
      summary: `Added ARIA roles to ${changes.length} epub:type element(s)`,
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
          path: context.filePath || 'content.xhtml',
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

export const quickFixTemplates: Record<string, QuickFixTemplate> = {
  'metadata-accessmode': metadataAccessModeTemplate,
  'metadata-accessibilityfeature': metadataAccessibilityFeatureTemplate,
  'metadata-accessibilityhazard': metadataAccessibilityHazardTemplate,
  'metadata-accessibilitysummary': metadataAccessibilitySummaryTemplate,
  'landmark-unique': landmarkUniqueTemplate,
  'epub-type-role': epubTypeRoleTemplate,
  'heading-structure': headingStructureTemplate,
};

const issueCodeAliases: Record<string, string> = {
  'METADATA-ACCESSMODE': 'metadata-accessmode',
  'METADATA-ACCESSIBILITYFEATURE': 'metadata-accessibilityfeature',
  'METADATA-ACCESSIBILITYHAZARD': 'metadata-accessibilityhazard',
  'METADATA-ACCESSIBILITYSUMMARY': 'metadata-accessibilitysummary',
  'IMG-ALT-MISSING': 'img-alt-missing',
  'IMG-ALT-EMPTY': 'img-alt-empty',
  'HEADING-ORDER': 'heading-structure',
  'HEADING-SKIP': 'heading-structure',
  'HEADING-SKIPPED': 'heading-structure',
  'HEADING-EMPTY': 'heading-empty',
  'LINK-TEXT-EMPTY': 'link-text-empty',
  'LANG-MISSING': 'lang-missing',
  'TABLE-HEADER-MISSING': 'table-header-missing',
  'ARIA-LABEL-MISSING': 'aria-label-missing',
  'COLOR-CONTRAST': 'color-contrast',
  'EPUB-TYPE-MISSING': 'epub-type-missing',
  'EPUB-TYPE-HAS-MATCHING-ROLE': 'epub-type-role',
  'EPUB-TYPE-ROLE': 'epub-type-role',
  'EPUB-TYPE-NEEDS-ROLE': 'epub-type-role',
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
