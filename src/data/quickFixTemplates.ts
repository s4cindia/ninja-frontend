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

export const quickFixTemplates: Record<string, QuickFixTemplate> = {
  'metadata-accessmode': metadataAccessModeTemplate,
  'metadata-accessibilityfeature': metadataAccessibilityFeatureTemplate,
  'metadata-accessibilityhazard': metadataAccessibilityHazardTemplate,
  'metadata-accessibilitysummary': metadataAccessibilitySummaryTemplate,
};

const issueCodeAliases: Record<string, string> = {
  'METADATA-ACCESSMODE': 'metadata-accessmode',
  'METADATA-ACCESSIBILITYFEATURE': 'metadata-accessibilityfeature',
  'METADATA-ACCESSIBILITYHAZARD': 'metadata-accessibilityhazard',
  'METADATA-ACCESSIBILITYSUMMARY': 'metadata-accessibilitysummary',
  'IMG-ALT-MISSING': 'img-alt-missing',
  'IMG-ALT-EMPTY': 'img-alt-empty',
  'HEADING-ORDER': 'heading-order',
  'HEADING-EMPTY': 'heading-empty',
  'LINK-TEXT-EMPTY': 'link-text-empty',
  'LANG-MISSING': 'lang-missing',
  'TABLE-HEADER-MISSING': 'table-header-missing',
  'ARIA-LABEL-MISSING': 'aria-label-missing',
  'COLOR-CONTRAST': 'color-contrast',
  'EPUB-TYPE-MISSING': 'epub-type-missing',
  'PAGE-BREAK-MISSING': 'page-break-missing',
  'TOC-MISSING': 'toc-missing',
  'LANDMARKS-MISSING': 'landmarks-missing',
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
