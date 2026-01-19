import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wcag21Criteria = [
  // Perceivable - Principle 1
  { number: '1.1.1', name: 'Non-text Content', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.2', name: 'Captions (Prerecorded)', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.3', name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.4', name: 'Captions (Live)', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.5', name: 'Audio Description (Prerecorded)', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.6', name: 'Sign Language (Prerecorded)', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.7', name: 'Extended Audio Description (Prerecorded)', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.8', name: 'Media Alternative (Prerecorded)', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.2.9', name: 'Audio-only (Live)', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.3.1', name: 'Info and Relationships', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.3.2', name: 'Meaningful Sequence', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.3.3', name: 'Sensory Characteristics', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.3.4', name: 'Orientation', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.3.5', name: 'Identify Input Purpose', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.3.6', name: 'Identify Purpose', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.1', name: 'Use of Color', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.2', name: 'Audio Control', level: 'A', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.4', name: 'Resize Text', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.5', name: 'Images of Text', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.6', name: 'Contrast (Enhanced)', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.7', name: 'Low or No Background Audio', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.8', name: 'Visual Presentation', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.9', name: 'Images of Text (No Exception)', level: 'AAA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.10', name: 'Reflow', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.11', name: 'Non-text Contrast', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.12', name: 'Text Spacing', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },
  { number: '1.4.13', name: 'Content on Hover or Focus', level: 'AA', category: 'Perceivable', principle: 'Perceivable' },

  // Operable - Principle 2
  { number: '2.1.1', name: 'Keyboard', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.1.2', name: 'No Keyboard Trap', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.1.3', name: 'Keyboard (No Exception)', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.1.4', name: 'Character Key Shortcuts', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.2.1', name: 'Timing Adjustable', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.2.2', name: 'Pause, Stop, Hide', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.2.3', name: 'No Timing', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.2.4', name: 'Interruptions', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.2.5', name: 'Re-authenticating', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.2.6', name: 'Timeouts', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.3.1', name: 'Three Flashes or Below Threshold', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.3.2', name: 'Three Flashes', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.3.3', name: 'Animation from Interactions', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.4.1', name: 'Bypass Blocks', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.4.2', name: 'Page Titled', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.4.3', name: 'Focus Order', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.4.5', name: 'Multiple Ways', level: 'AA', category: 'Operable', principle: 'Operable' },
  { number: '2.4.6', name: 'Headings and Labels', level: 'AA', category: 'Operable', principle: 'Operable' },
  { number: '2.4.7', name: 'Focus Visible', level: 'AA', category: 'Operable', principle: 'Operable' },
  { number: '2.4.8', name: 'Location', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.4.9', name: 'Link Purpose (Link Only)', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.4.10', name: 'Section Headings', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.5.1', name: 'Pointer Gestures', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.5.2', name: 'Pointer Cancellation', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.5.3', name: 'Label in Name', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.5.4', name: 'Motion Actuation', level: 'A', category: 'Operable', principle: 'Operable' },
  { number: '2.5.5', name: 'Target Size', level: 'AAA', category: 'Operable', principle: 'Operable' },
  { number: '2.5.6', name: 'Concurrent Input Mechanisms', level: 'AAA', category: 'Operable', principle: 'Operable' },

  // Understandable - Principle 3
  { number: '3.1.1', name: 'Language of Page', level: 'A', category: 'Understandable', principle: 'Understandable' },
  { number: '3.1.2', name: 'Language of Parts', level: 'AA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.1.3', name: 'Unusual Words', level: 'AAA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.1.4', name: 'Abbreviations', level: 'AAA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.1.5', name: 'Reading Level', level: 'AAA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.1.6', name: 'Pronunciation', level: 'AAA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.2.1', name: 'On Focus', level: 'A', category: 'Understandable', principle: 'Understandable' },
  { number: '3.2.2', name: 'On Input', level: 'A', category: 'Understandable', principle: 'Understandable' },
  { number: '3.2.3', name: 'Consistent Navigation', level: 'AA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.2.4', name: 'Consistent Identification', level: 'AA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.2.5', name: 'Change on Request', level: 'AAA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.3.1', name: 'Error Identification', level: 'A', category: 'Understandable', principle: 'Understandable' },
  { number: '3.3.2', name: 'Labels or Instructions', level: 'A', category: 'Understandable', principle: 'Understandable' },
  { number: '3.3.3', name: 'Error Suggestion', level: 'AA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.3.5', name: 'Help', level: 'AAA', category: 'Understandable', principle: 'Understandable' },
  { number: '3.3.6', name: 'Error Prevention (All)', level: 'AAA', category: 'Understandable', principle: 'Understandable' },

  // Robust - Principle 4
  { number: '4.1.1', name: 'Parsing', level: 'A', category: 'Robust', principle: 'Robust' },
  { number: '4.1.2', name: 'Name, Role, Value', level: 'A', category: 'Robust', principle: 'Robust' },
  { number: '4.1.3', name: 'Status Messages', level: 'AA', category: 'Robust', principle: 'Robust' },
];

interface Criterion {
  number: string;
  name: string;
  level: string;
  category: string;
  principle: string;
}

const generateCriterionDoc = (criterion: Criterion) => {
  return {
    criterionId: criterion.number,
    number: criterion.number,
    name: criterion.name,
    level: criterion.level,
    category: criterion.category,
    principle: criterion.principle,
    wcagUrl: `https://www.w3.org/WAI/WCAG21/Understanding/${criterion.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}.html`,
    shortDescription: `WCAG ${criterion.number} ${criterion.name} - Level ${criterion.level}`,
    intent: `The intent of this Success Criterion is to ensure ${criterion.name.toLowerCase()} for accessibility compliance.`,
    benefits: [
      `Users with disabilities can access content that meets ${criterion.name} requirements`,
      `Screen reader users benefit from proper ${criterion.name.toLowerCase()} implementation`,
      `Content is more accessible across different assistive technologies`
    ],
    howToMeet: {
      url: `https://www.w3.org/WAI/WCAG21/quickref/#${criterion.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}`,
      techniques: [],
      epubSpecific: [
        `Ensure EPUB content meets ${criterion.name} requirements`,
        `Test with EPUB reading systems and assistive technologies`,
        `Follow EPUB Accessibility 1.1 specifications`
      ]
    },
    understanding: {
      url: `https://www.w3.org/WAI/WCAG21/Understanding/${criterion.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}.html`,
      examples: [],
      resources: []
    },
    testingProcedure: {
      automated: [
        'Run ACE by DAISY to check for automated violations',
        'Use epubcheck to validate EPUB structure'
      ],
      manual: [
        'Open EPUB in a reading system with assistive technology',
        `Verify ${criterion.name} requirements are met`,
        'Test across multiple reading systems'
      ],
      tools: ['ACE by DAISY', 'epubcheck', 'NVDA', 'JAWS', 'VoiceOver']
    },
    remediationGuidance: {
      before: '<!-- Example showing non-compliant markup -->',
      after: '<!-- Example showing compliant markup -->',
      explanation: `Update content to meet ${criterion.name} requirements according to WCAG ${criterion.number} Level ${criterion.level}.`
    },
    applicableToEpub: true,
    applicableToPdf: true,
    commonIssues: [
      `${criterion.name} not properly implemented`,
      `Missing ${criterion.name.toLowerCase()} in content`,
      `Incorrect ${criterion.name.toLowerCase()} implementation`
    ]
  };
};

const generateFullDocumentation = () => {
  const criteriaDocumentation = wcag21Criteria.map(generateCriterionDoc);

  const fullDoc = {
    version: '2.1',
    lastUpdated: new Date().toISOString(),
    totalCriteria: criteriaDocumentation.length,
    criteriaDocumentation
  };

  return fullDoc;
};

console.log('Generating WCAG 2.1 documentation...');
const documentation = generateFullDocumentation();

const outputPath = path.join(__dirname, '..', 'src', 'data', 'wcag-documentation.json');
fs.writeFileSync(outputPath, JSON.stringify(documentation, null, 2), 'utf-8');

console.log(`Generated ${documentation.totalCriteria} WCAG 2.1 criteria`);
console.log(`Saved to: ${outputPath}`);
console.log('\nBreakdown:');
console.log(`  Level A: ${documentation.criteriaDocumentation.filter(c => c.level === 'A').length}`);
console.log(`  Level AA: ${documentation.criteriaDocumentation.filter(c => c.level === 'AA').length}`);
console.log(`  Level AAA: ${documentation.criteriaDocumentation.filter(c => c.level === 'AAA').length}`);
