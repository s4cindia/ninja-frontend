import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  History,
  Sparkles,
  FileText,
  Copy,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NASuggestionBanner } from './NASuggestionBanner';
import type {
  VerificationItem as VerificationItemType,
  VerificationStatus,
  VerificationMethod
} from '@/types/verification.types';

interface VerificationItemProps {
  item: VerificationItemType;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onSubmit: (itemId: string, status: VerificationStatus, method: VerificationMethod, notes: string) => void;
  isSubmitting: boolean;
  onViewGuidance?: (itemId: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
  serious: { label: 'Serious', className: 'bg-orange-100 text-orange-800' },
  moderate: { label: 'Moderate', className: 'bg-yellow-100 text-yellow-800' },
  minor: { label: 'Minor', className: 'bg-gray-100 text-gray-800' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, className: 'text-gray-500' },
  verified_pass: { label: 'Verified Pass', icon: CheckCircle, className: 'text-green-600' },
  verified_fail: { label: 'Verified Fail', icon: XCircle, className: 'text-red-600' },
  verified_partial: { label: 'Partial', icon: AlertTriangle, className: 'text-yellow-600' },
  deferred: { label: 'Deferred', icon: Clock, className: 'text-blue-500' },
};

const VERIFICATION_METHODS: VerificationMethod[] = [
  'NVDA 2024.1',
  'JAWS 2024',
  'VoiceOver',
  'Manual Review',
  'Keyboard Only',
  'Axe DevTools',
  'WAVE',
];

const VERIFICATION_STATUSES: { value: VerificationStatus; label: string }[] = [
  { value: 'verified_pass', label: 'Verified Pass' },
  { value: 'verified_fail', label: 'Verified Fail' },
  { value: 'verified_partial', label: 'Verified Partial' },
  { value: 'deferred', label: 'Deferred' },
];

// Enhanced explanations with testing guidance and examples
const MANUAL_REVIEW_REASONS: Record<string, string> = {
  '1.1.1': `**Why Manual Review is Required:**
Automated tools can detect missing alt text but cannot assess quality, accuracy, or equivalence.

**What to Check:**
• Alt text conveys the same information as the image
• Decorative images have empty alt="" attributes
• Complex images (charts, diagrams, infographics) have detailed descriptions
• Alt text doesn't repeat surrounding caption text

**Examples:**
1. A diagram in a textbook showing cell structure needs detailed alt text: "Diagram of animal cell showing nucleus at center, mitochondria scattered throughout cytoplasm, and cell membrane forming outer boundary"
2. A decorative chapter header image should have alt="" to avoid screen reader announcing irrelevant graphics`,
  '1.2.1': 'Automated tools cannot verify if audio-only content has an accurate text alternative. Manual review is required to compare the audio content with its text alternative and ensure they are equivalent.',
  '1.2.2': 'Automated tools cannot verify if captions for video are accurate, synchronized, or include all dialogue and important sounds. Manual review with playback is required.',
  '1.2.3': 'Automated tools cannot verify if audio descriptions or text alternatives for video are accurate and provide equivalent information. Manual review is required to ensure descriptions convey visual information not available from the audio track.',
  '1.2.4': 'Automated tools cannot verify if live captions are accurate, synchronized, or complete. Manual monitoring during live broadcasts is required.',
  '1.2.5': 'Automated tools cannot verify if audio descriptions are accurate, well-timed, or provide equivalent visual information. Manual review with playback is required.',
  '1.3.1': 'While automated tools can detect structural markup, they cannot verify if the semantic structure accurately represents the information relationships and meaning of the content. Manual review is required to ensure proper heading hierarchy, list usage, and table relationships.',
  '1.3.2': 'Automated tools can detect reading order issues in code but cannot verify if the visual presentation matches the meaningful sequence. Manual review with assistive technology is required to confirm proper reading order.',
  '1.3.3': 'Automated tools cannot verify if instructions rely solely on sensory characteristics (shape, size, location, sound, color). Human review is required to ensure instructions are perceivable without sensory abilities.',
  '1.3.4': 'Automated tools cannot reliably test orientation lock across all devices and scenarios. Manual testing on mobile devices in both portrait and landscape orientations is required.',
  '1.3.5': 'Automated tools can detect autocomplete attributes but cannot verify if the purpose of each input is correctly identified according to the WCAG list of input purposes. Manual review of form fields and their purposes is required.',
  '1.4.1': 'Automated tools can detect some color contrast issues but cannot determine if color alone is used to convey information. Manual inspection is required to ensure information conveyed with color is also available through text or other visual means.',
  '1.4.3': 'While automated tools can calculate contrast ratios, they may have limitations with gradients, images of text, disabled controls, and complex visual designs. Manual verification with contrast measurement tools is recommended.',
  '1.4.5': 'Automated tools cannot determine if images of text are essential or if text could achieve the same visual presentation. Manual judgment is required to verify the use of images of text is justified.',
  '1.4.10': 'Automated tools cannot fully assess reflow behavior across different viewport sizes and zoom levels. Manual testing at 400% zoom is required to ensure content reflows without horizontal scrolling or loss of information.',
  '1.4.11': 'Automated tools can measure contrast but cannot identify all user interface components and graphical objects that require contrast. Manual inspection is needed to verify 3:1 contrast for all meaningful non-text content.',
  '1.4.12': 'Automated tools cannot fully test text spacing adjustments across all scenarios. Manual testing by adjusting line height, paragraph spacing, letter spacing, and word spacing is required.',
  '1.4.13': 'Automated tools cannot test pointer hover and keyboard focus trigger scenarios. Manual interaction testing is required to verify content appearing on hover/focus is dismissible, hoverable, and persistent.',
  '2.1.1': `**Why Manual Review is Required:**
Automated tools can detect keyboard handlers but cannot verify actual keyboard operability of interactive elements.

**What to Check:**
• All links, buttons, and form controls are reachable via Tab/Shift+Tab
• Interactive footnotes/glossary terms can be activated with Enter/Space
• Embedded forms work with keyboard only
• Audio/video player controls are keyboard accessible

**Examples:**
1. Interactive quiz buttons in an educational EPUB should be selectable with Tab and activatable with Enter
2. Popup footnotes should open with Enter/Space and close with Escape key

**Note:** Most static EPUBs with only links and basic navigation will pass automatically. Manual review is mainly needed for interactive textbooks or multimedia EPUBs.`,
  '2.1.2': `**Why Manual Review is Required:**
Automated tools cannot detect keyboard traps where focus gets stuck.

**What to Check:**
• Tab or Shift+Tab moves focus away from all interactive elements
• Popup footnotes/annotations allow Escape key to exit
• Embedded form fields don't trap focus
• Interactive elements in EPUB don't create infinite tab loops

**Examples:**
1. A popup definition or footnote should close and release focus when user presses Escape
2. An embedded quiz form should allow tabbing through all fields and out of the form

**Note:** Rarely applicable to static EPUBs. Mainly relevant for interactive textbooks with custom JavaScript widgets or complex embedded forms.`,
  '2.1.4': 'Automated tools cannot verify if single character shortcuts can be remapped or turned off. Manual testing of keyboard shortcuts is required.',
  '2.2.1': `**Why Manual Review is Required:**
Automated tools cannot detect time limits or verify user control over timing.

**What to Check:**
• Interactive quizzes with timers allow users to turn off, adjust, or extend time limits
• Warnings appear before timeout occurs
• Users can extend timeout at least 10 times
• Auto-advancing content has user controls

**Examples:**
1. A timed quiz in an educational EPUB should warn "2 minutes remaining" with option to extend
2. Auto-advancing tutorial slides should have pause/play controls

**Note:** Rarely applicable to static EPUBs. Only relevant for interactive textbooks with timed assessments or auto-advancing content.`,

  '2.2.2': `**Why Manual Review is Required:**
Automated tools cannot detect all auto-updating or moving content.

**What to Check:**
• Animated diagrams or illustrations can be paused
• Auto-playing animations lasting >5 seconds have pause controls
• Scrolling text boxes have pause mechanism
• Users can control motion to avoid distraction

**Examples:**
1. An animated biological process diagram should have pause/play controls
2. A scrolling text box with quotes should pause when user focuses on it

**Note:** Rarely applicable to static EPUBs. Only relevant for multimedia EPUBs with animations, auto-playing media, or interactive diagrams.`,
  '2.3.1': 'Automated tools can detect flashing content but cannot accurately measure if it flashes more than three times per second or if it meets the general flash and red flash thresholds. Manual analysis with specialized tools may be required.',
  '2.4.1': `**Why Manual Review is Required:**
Automated tools cannot assess if bypass mechanisms are effective or appropriately placed.

**What to Check:**
• Skip links allow bypassing repeated navigation elements
• Landmarks (nav, main, aside) are properly labeled for screen readers
• Skip link targets point to correct content sections
• Chapter navigation can be bypassed to reach main text

**Examples:**
1. An EPUB with table of contents on every chapter should have "Skip to chapter content" link
2. Textbooks with repeated header navigation should provide skip links to main text

**Note:** Less relevant for simple linear narratives. More important for textbooks, reference books, or EPUBs with repeated navigation blocks.`,
  '2.4.2': `**Why Manual Review is Required:**
Automated tools can detect missing titles but cannot assess if they're descriptive and unique.

**What to Check:**
• Each EPUB chapter has a unique, descriptive <title> element
• Title describes the chapter topic or purpose
• Titles help distinguish chapters in table of contents
• Titles aren't generic like "Chapter" or "Section"

**Examples:**
1. Bad: "Chapter 1" → Good: "Chapter 1: Introduction to Cell Biology"
2. Bad: "Document" → Good: "Understanding WCAG 2.1 Success Criteria for EPUBs"`,

  '2.4.3': `**Why Manual Review is Required:**
Automated tools cannot assess if focus order is logical and preserves reading flow.

**What to Check:**
• Tab order follows reading order (left-to-right, top-to-bottom for LTR languages)
• Embedded forms tab through fields in logical sequence
• Footnote links come before footnote content
• Focus doesn't jump unexpectedly across chapters or sidebars

**Examples:**
1. A quiz form should tab: Question 1 → Answer → Question 2 → Answer → Submit (not Question 1 → Submit → Answer)
2. Chapter navigation should tab through links in order: Previous → TOC → Next (not random)`,

  '2.4.4': `**Why Manual Review is Required:**
Automated tools cannot determine if link text is meaningful without surrounding context.

**What to Check:**
• Link text describes the destination or action
• Avoid generic "click here", "read more", or "see appendix"
• Link purpose is clear when read out of context by screen readers
• Multiple footnote links have distinct text or numbering

**Examples:**
1. Bad: "Click here for definition" → Good: "See glossary definition of mitosis"
2. Bad: Multiple "See footnote" links → Good: "See footnote 1 about cell structure"`,
  '2.4.5': 'Automated tools cannot determine if there are multiple ways to locate content. Manual inspection of navigation mechanisms is required.',
  '2.4.6': `**Why Manual Review is Required:**
Automated tools can detect headings/labels but cannot assess if they're descriptive and meaningful.

**What to Check:**
• Chapter headings accurately describe the content that follows
• Section headings are unique and distinguish topics
• Form field labels clearly indicate expected input
• Labels provide sufficient context (not just "Name" or "Answer")

**Examples:**
1. Bad: "Section 5" → Good: "Section 5: The Water Cycle and Precipitation"
2. Bad: "Answer" (in quiz) → Good: "Your answer to Question 3 about photosynthesis"`,
  '2.4.7': `**Why Manual Review is Required:**
Automated tools cannot fully verify focus indicators are visible across all UI states and backgrounds.

**What to Check:**
• Focus indicator is clearly visible on all links and interactive elements
• Indicator has sufficient contrast (3:1 minimum) against background
• Indicator visible in both light and dark reading modes
• Custom focus styles provide adequate visual indication

**Examples:**
1. Footnote links should show outline or underline when keyboard-focused
2. Interactive quiz buttons should have visible border or background change when tabbed to

**Note:** Reading systems may apply their own focus styles, but EPUB content shouldn't remove default indicators.`,
  '2.5.1': 'Automated tools cannot test pointer gestures and path-based interactions. Manual testing with various input devices is required.',
  '2.5.2': 'Automated tools cannot verify pointer cancellation behavior. Manual testing of click, touch, and pointer interactions is required.',
  '2.5.3': 'Automated tools can detect missing labels but cannot verify if visible labels match accessible names. Manual comparison is required.',
  '2.5.4': 'Automated tools cannot test motion actuation functionality. Manual testing with device motion and orientation changes is required.',
  '3.1.1': 'While automated tools can detect missing language attributes, they cannot verify if the specified language is correct for the content. Manual review by someone familiar with the language is recommended.',
  '3.1.2': `**Why Manual Review is Required:**
Automated tools can detect lang attributes but cannot verify language accuracy or identify unmarked foreign passages.

**What to Check:**
• Foreign words/phrases have correct lang="xx" attribute
• Block quotes in other languages are properly marked
• Technical terms from other languages are identified
• Language code matches actual language used

**Examples:**
1. Latin term "in vivo" should be marked: <span lang="la">in vivo</span>
2. A French quote in an English textbook needs: <blockquote lang="fr">« La vie est belle »</blockquote>`,
  '3.2.1': `**Why Manual Review is Required:**
Automated tools cannot detect unexpected behavior when elements receive focus.

**What to Check:**
• Focusing on form fields doesn't auto-submit
• Tabbing to footnote links doesn't automatically open popups
• Focus doesn't trigger page navigation automatically
• No unexpected dialogs/overlays appear when tabbing through content

**Examples:**
1. Tabbing to a quiz submit button shouldn't trigger submission (requires Enter/Space activation)
2. Focusing on a glossary link shouldn't auto-open the definition popup

**Note:** Rarely applicable to static EPUBs. Only relevant for interactive content with custom JavaScript behaviors.`,

  '3.2.2': `**Why Manual Review is Required:**
Automated tools cannot detect unexpected behavior when form values change.

**What to Check:**
• Selecting a quiz answer radio button doesn't auto-submit
• Changing checkboxes doesn't navigate away from current chapter
• Typing in form fields doesn't trigger auto-submission
• Dropdown changes don't cause unexpected navigation

**Examples:**
1. Selecting an answer in a multiple-choice quiz shouldn't submit until user clicks "Submit"
2. Changing a unit selector (e.g., Celsius/Fahrenheit) should only update display, not reload content

**Note:** Only applicable to EPUBs with interactive forms or quizzes. Static EPUBs typically don't have input elements.`,
  '3.2.3': `**Why Manual Review is Required:**
Automated tools cannot verify consistent navigation placement and order across multiple chapters.

**What to Check:**
• Navigation elements appear in the same location across all chapters
• Chapter navigation links (Previous/Next/TOC) are in the same order throughout
• Navigation components have consistent styling across chapters
• Repeated elements don't move positions between chapters

**Examples:**
1. "Table of Contents" link should be in the same position in every chapter (e.g., always top-right)
2. If "Previous | TOC | Next" navigation appears at bottom of Chapter 1, it should be at bottom of all chapters

**Note:** Less relevant for single-file EPUBs. More important for multi-chapter textbooks or reference books.`,
  '3.2.4': `**Why Manual Review is Required:**
Automated tools cannot verify consistent identification of components across multiple chapters.

**What to Check:**
• Same icons represent the same functions throughout all chapters
• Repeated elements use consistent labels (not "Contents" in one chapter, "TOC" in another)
• Navigation elements maintain consistent naming across chapters
• Same functionality uses same wording throughout the document

**Examples:**
1. If navigation uses "Next Chapter" button, don't also use "Continue" or "Forward" elsewhere for the same action
2. If a magnifying glass icon means "View definition" in Chapter 1, it should mean the same in all chapters (not "Search" in Chapter 2)`,
  '3.3.1': `**Why Manual Review is Required:**
Automated tools cannot assess if error messages are clear, specific, and helpful.

**What to Check:**
• Quiz validation errors identify which question has the problem
• Error messages explain what went wrong
• Messages suggest how to correct the answer or input
• Errors are programmatically associated with form fields

**Examples:**
1. Bad: "Error in quiz" → Good: "Question 3 answer is incomplete. Please select at least one option."
2. Bad: "Invalid" → Good: "Date must be in format MM/DD/YYYY (e.g., 12/25/2024)"

**Note:** Only applicable to EPUBs with interactive forms or quizzes. Static EPUBs typically don't have error validation.`,

  '3.3.2': `**Why Manual Review is Required:**
Automated tools cannot determine if labels and instructions are clear and sufficient.

**What to Check:**
• All quiz and form fields have visible, descriptive labels
• Labels clearly describe what input is expected
• Required fields are marked (not just with color)
• Format requirements are explained (e.g., date format, numeric range)

**Examples:**
1. A quiz "Answer" field should specify: "Enter your answer in decimal form (e.g., 3.14)"
2. Required fields should show: "Student ID (required)" not just a red asterisk or color indicator

**Note:** Only applicable to EPUBs with interactive forms or quizzes. Static EPUBs typically don't have input fields.`,
  '3.3.3': 'Automated tools cannot determine if error suggestions are provided or if they are helpful. Manual testing with intentional errors is required.',
  '3.3.4': 'Automated tools cannot detect all submission scenarios that may cause legal commitments or financial transactions. Manual review of forms and submission processes is required.',
  '4.1.1': 'While automated tools can detect many parsing errors, they cannot verify all aspects of valid HTML/XML. Manual code review may be needed for complex scenarios.',
  '4.1.2': `**Why Manual Review is Required:**
Automated tools cannot verify if interactive elements work correctly with assistive technology.

**What to Check:**
• Custom interactive elements have appropriate ARIA roles and labels
• Expandable footnotes/glossaries announce state (expanded/collapsed)
• Interactive quiz buttons announce their purpose and state
• All interactive elements have accessible names for screen readers

**Examples:**
1. A popup footnote should announce "Footnote 1, button, collapsed" and when activated "Footnote 1, expanded"
2. Interactive quiz answer buttons should announce "Answer A, radio button, not checked" with clear labels

**Note:** Most applicable to interactive EPUBs with custom JavaScript widgets. Standard HTML links and semantic elements typically pass automatically.`,
  '4.1.3': 'Automated tools cannot detect all status messages or verify if they are properly announced. Manual testing with screen readers is required.',
  'EN-5.2': 'Automated tools cannot verify if accessibility features can be activated without relying on methods that require abilities the user may not possess. Manual testing is required to ensure all activation methods are accessible.',
  'EN-5.3': 'Automated tools cannot assess if biometric authentication provides alternative methods. Manual review is required to verify that users who cannot use biometric features have accessible alternatives.',
  'EN-5.4': 'Automated tools cannot verify if accessibility information is preserved during content transformations. Manual testing across different formats and platforms is required to ensure accessibility features remain intact.',
  'EN-6.1': 'Automated tools cannot fully assess closed functionality (hardware/software systems where assistive technology cannot be attached). Manual inspection is required to verify built-in accessibility features meet requirements.',
  'EN-7.1': 'Automated tools cannot verify if caption processing technology meets all display and timing requirements. Manual testing with captions enabled is required to ensure proper functionality.',
  'EN-7.2': 'Automated tools cannot verify if audio description technology meets all requirements for timing and playback. Manual testing with audio descriptions enabled is required.',
  'EN-7.3': 'Automated tools cannot verify if user controls for captions and audio description are accessible and properly labeled. Manual testing of all control mechanisms is required.',
};

// Get manual review reason for a criterion
function getManualReviewReason(criterionId: string): string | undefined {
  return MANUAL_REVIEW_REASONS[criterionId];
}

// Check if criterion has enhanced guidance (with What to Check and Examples)
function hasEnhancedGuidance(criterionId: string): boolean {
  const reason = MANUAL_REVIEW_REASONS[criterionId];
  return reason ? reason.includes('**Why Manual Review is Required:**') : false;
}

export function VerificationItem({ item, isSelected, onSelect, onSubmit, isSubmitting, onViewGuidance }: VerificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [showFixedIssues, setShowFixedIssues] = useState(false);
  const [showManualReason, setShowManualReason] = useState(false);
  
  const latestHistory = item.history.length > 0 ? item.history[item.history.length - 1] : null;
  const historyLength = item.history.length;

  // For N/A items, auto-set status and method from the start
  const hasNaSuggestion = !!item.naSuggestion;
  const defaultStatus = hasNaSuggestion ? 'verified_pass' : (latestHistory?.status ?? 'verified_pass');
  const defaultMethod = hasNaSuggestion ? 'Manual Review' : (latestHistory?.method ?? 'Manual Review');

  const [formStatus, setFormStatus] = useState<VerificationStatus>(defaultStatus);
  const [formMethod, setFormMethod] = useState<VerificationMethod>(defaultMethod);
  const [formNotes, setFormNotes] = useState(latestHistory?.notes ?? '');
  const [naAccepted, setNaAccepted] = useState(false);

  useEffect(() => {
    const latest = item.history.length > 0 ? item.history[item.history.length - 1] : null;
    if (latest) {
      setFormStatus(latest.status);
      setFormMethod(latest.method);
      setFormNotes(latest.notes);
      // Check if this was an AI-suggested N/A acceptance
      setNaAccepted(latest.notes?.includes('AI-suggested Not Applicable') ?? false);
      setSubmitSuccess(true);
      const timer = setTimeout(() => setSubmitSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [historyLength, item.history]);

  const severityConfig = SEVERITY_CONFIG[item.severity];
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  const requiresNotes = formStatus === 'verified_fail' || formStatus === 'verified_partial';
  const canSubmit = !requiresNotes || formNotes.trim().length > 0;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(item.id, formStatus, formMethod, formNotes);
    }
  };

  const handleAcceptNASuggestion = () => {
    // Accept the N/A suggestion by populating the notes field
    const naNote = `AI-suggested Not Applicable (${item.naSuggestion?.confidence}% confidence): ${item.naSuggestion?.rationale}`;
    setFormNotes(naNote);
    setNaAccepted(true);
    // Status and method are already set and disabled for N/A items
    // User must click Submit Verification to complete
  };

  const handleUndoNASuggestion = () => {
    // Reset the form to allow manual review
    setNaAccepted(false);
    setFormStatus('verified_pass');
    setFormMethod('Manual Review');
    setFormNotes('');
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden',
      isSelected && 'ring-2 ring-primary-500',
      item.status === 'pending' && 'border-orange-200 bg-orange-50/30'
    )}>
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${item.criterionId} ${item.criterionName} - Click to ${isExpanded ? 'collapse' : 'expand'} verification form`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          aria-label={`Select ${item.criterionId}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{item.criterionId}</span>
            <span className="text-sm text-gray-600 truncate">{item.criterionName}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              item.wcagLevel === 'A' && 'bg-blue-100 text-blue-700',
              item.wcagLevel === 'AA' && 'bg-purple-100 text-purple-700',
              item.wcagLevel === 'AAA' && 'bg-indigo-100 text-indigo-700'
            )}>
              {item.wcagLevel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="default" className={severityConfig.className}>
              {severityConfig.label}
            </Badge>
            <span className="text-xs text-gray-500">
              Confidence: {item.confidenceScore}%
            </span>
            <span className="text-xs text-gray-500">
              Auto: {item.automatedResult}
            </span>
            {(item.issues && item.issues.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {item.issues.length} issue{item.issues.length !== 1 ? 's' : ''}
              </span>
            )}
            {(item.fixedIssues && item.fixedIssues.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                {item.fixedIssues.length} fixed
              </span>
            )}
            {item.naSuggestion && (
              <span className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                item.naSuggestion.suggestedStatus === 'not_applicable' && item.naSuggestion.confidence >= 90
                  ? "bg-blue-100 text-blue-700"
                  : item.naSuggestion.suggestedStatus === 'not_applicable'
                  ? "bg-blue-50 text-blue-600"
                  : "bg-yellow-100 text-yellow-700"
              )}>
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {item.naSuggestion.suggestedStatus === 'not_applicable' ? 'AI: N/A' : 'AI: Review'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-1', statusConfig.className)}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>

          {item.history.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(!showHistory);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="View history"
            >
              <History className="h-4 w-4" />
            </button>
          )}

          <ChevronDown className={cn(
            'h-5 w-5 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </div>

      {showHistory && item.history.length > 0 && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mt-3 mb-2">Verification History</h4>
          <div className="space-y-2">
            {item.history.map((entry) => (
              <div key={entry.id} className="text-sm bg-white p-2 rounded border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{STATUS_CONFIG[entry.status].label}</span>
                  <span className="text-gray-500 text-xs">{entry.verifiedAt}</span>
                </div>
                <div className="text-gray-600 text-xs mt-1">
                  {entry.method} by {entry.verifiedBy}
                </div>
                {entry.notes && (
                  <p className="text-gray-600 mt-1">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="mt-4 space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Automated Finding</h4>
              <p className="text-sm text-gray-600">{item.automatedNotes}</p>
            </div>

            {/* N/A Suggestion Banner */}
            {item.naSuggestion && (
              <NASuggestionBanner
                suggestion={item.naSuggestion}
                onAccept={handleAcceptNASuggestion}
                isAccepting={isSubmitting}
              />
            )}

            {/* SECTION 1: Fixed Issues (Reference Only) */}
            {item.fixedIssues && item.fixedIssues.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowFixedIssues(!showFixedIssues)}
                  className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  <ChevronRight className={cn(
                    'h-4 w-4 transition-transform',
                    showFixedIssues && 'rotate-90'
                  )} />
                  {showFixedIssues ? 'Hide' : 'Show'} {item.fixedIssues.length} Fixed Issue{item.fixedIssues.length !== 1 ? 's' : ''} (Reference)
                </button>

                {showFixedIssues && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                      These issues were automatically fixed during remediation. Expand to verify fixes were applied correctly.
                    </p>

                    {item.fixedIssues.map((issue, idx) => {
                      const impactLabel = issue.impact || issue.severity || 'unknown';
                      
                      return (
                        <div key={issue.id || issue.issueId || idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                  FIXED - {String(impactLabel).toUpperCase()}
                                </span>
                                {issue.ruleId && (
                                  <span className="text-xs text-gray-600 font-mono">
                                    {issue.ruleId}
                                  </span>
                                )}
                                {issue.fixMethod && (
                                  <span className="text-xs text-green-600">
                                    ({issue.fixMethod === 'automated' ? 'Auto-fixed' : 'Manually fixed'})
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mt-2 font-medium">
                                {issue.message}
                              </p>
                            </div>
                          </div>

                          {issue.location && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Original Location:</p>
                              <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                                {issue.filePath && <span className="font-mono">{issue.filePath} - </span>}
                                {issue.location}
                              </p>
                            </div>
                          )}

                          {(issue.html || issue.htmlSnippet) && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Original HTML (Before Fix):</p>
                              <pre className="text-xs text-gray-800 bg-white p-2 rounded overflow-x-auto border">
                                <code>{issue.html || issue.htmlSnippet}</code>
                              </pre>
                            </div>
                          )}

                          {issue.suggestedFix && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Applied Fix:</p>
                              <pre className="text-xs text-green-800 bg-white p-2 rounded overflow-x-auto border border-green-200">
                                <code>{issue.suggestedFix}</code>
                              </pre>
                            </div>
                          )}

                          <div className="mt-3 text-xs text-green-700">
                            Verify this fix was applied correctly by checking the remediated EPUB at the location above.
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: Remaining Issues (Requires Attention) */}
            {item.issues && item.issues.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowIssues(!showIssues)}
                  className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  <ChevronRight className={cn(
                    'h-4 w-4 transition-transform',
                    showIssues && 'rotate-90'
                  )} />
                  {showIssues ? 'Hide' : 'Show'} {item.issues.length} Issue{item.issues.length !== 1 ? 's' : ''} Requiring Review
                </button>

                {showIssues && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded border border-orange-200">
                      These issues were NOT fixed during automated remediation and require manual attention.
                    </p>

                    {item.issues.map((issue, idx) => {
                      const impactLabel = issue.impact || issue.severity || 'unknown';
                      
                      return (
                        <div key={issue.id || issue.issueId || idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                                  {String(impactLabel).toUpperCase()}
                                </span>
                                {issue.ruleId && (
                                  <span className="text-xs text-gray-600 font-mono">
                                    {issue.ruleId}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mt-2 font-medium">
                                {issue.message}
                              </p>
                            </div>
                          </div>

                          {issue.location && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Location:</p>
                              <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                                {issue.filePath && <span className="font-mono">{issue.filePath} - </span>}
                                {issue.location}
                              </p>
                            </div>
                          )}

                          {(issue.html || issue.htmlSnippet) && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-gray-700">Current HTML:</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(issue.html || issue.htmlSnippet || '');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </button>
                              </div>
                              <pre className="text-xs text-gray-800 bg-white p-2 rounded overflow-x-auto border">
                                <code>{issue.html || issue.htmlSnippet}</code>
                              </pre>
                            </div>
                          )}

                          {issue.suggestedFix && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Suggested Fix:</p>
                              <pre className="text-xs text-green-800 bg-green-50 p-2 rounded overflow-x-auto border border-green-200">
                                <code>{issue.suggestedFix}</code>
                              </pre>
                            </div>
                          )}

                          {issue.filePath && !issue.location && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">File:</p>
                              <p className="text-xs text-gray-600 font-mono">
                                {issue.filePath}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Show message if no issues at all */}
            {(!item.issues || item.issues.length === 0) &&
             (!item.fixedIssues || item.fixedIssues.length === 0) && (
              <div className="mt-4">
                <div className="text-sm text-gray-500 italic">
                  No specific issues detected for this criterion. Manual verification still required.
                </div>

                {/* Only show manual review explanation if NOT an N/A suggestion */}
                {!item.naSuggestion && getManualReviewReason(item.criterionId) && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualReason(!showManualReason)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <ChevronRight className={cn(
                        'h-4 w-4 transition-transform',
                        showManualReason && 'rotate-90'
                      )} />
                      {showManualReason ? 'Hide' : 'Show'} why manual review is required
                      {hasEnhancedGuidance(item.criterionId) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                          <Lightbulb className="h-3 w-3" />
                          Enhanced Guidance
                        </span>
                      )}
                    </button>

                    {showManualReason && (
                      <div className="mt-2 text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-400 px-4 py-3 rounded">
                        <div className="space-y-3 whitespace-pre-wrap">
                          {getManualReviewReason(item.criterionId)?.split('\n\n').map((section, idx) => {
                            const lines = section.split('\n');
                            const header = lines[0];
                            const isHeader = header.startsWith('**') && header.endsWith('**');

                            if (isHeader) {
                              return (
                                <div key={idx}>
                                  <p className="font-semibold text-blue-900 mb-1">
                                    {header.replace(/\*\*/g, '')}
                                  </p>
                                  <div className="space-y-1">
                                    {lines.slice(1).map((line, lineIdx) => {
                                      if (line.startsWith('•')) {
                                        return (
                                          <p key={lineIdx} className="pl-3">
                                            {line}
                                          </p>
                                        );
                                      }
                                      if (line.match(/^\d+\./)) {
                                        return (
                                          <p key={lineIdx} className="pl-3 italic">
                                            {line}
                                          </p>
                                        );
                                      }
                                      return <p key={lineIdx}>{line}</p>;
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return <p key={idx}>{section}</p>;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* View Guidance Button */}
            {onViewGuidance && (
              <div className="mt-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewGuidance(item.id)}
                  className="w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Testing Guidance & Resources
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`status-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Status
                  {hasNaSuggestion && <span className="ml-2 text-xs text-blue-600">(Auto-set for N/A)</span>}
                </label>
                <select
                  id={`status-${item.id}`}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as VerificationStatus)}
                  disabled={hasNaSuggestion}
                  className={cn(
                    "w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm",
                    hasNaSuggestion && "bg-gray-100 cursor-not-allowed"
                  )}
                >
                  {VERIFICATION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`method-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Method
                  {hasNaSuggestion && <span className="ml-2 text-xs text-blue-600">(Auto-set for N/A)</span>}
                </label>
                <select
                  id={`method-${item.id}`}
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as VerificationMethod)}
                  disabled={hasNaSuggestion}
                  className={cn(
                    "w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm",
                    hasNaSuggestion && "bg-gray-100 cursor-not-allowed"
                  )}
                >
                  {VERIFICATION_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={`notes-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Notes {requiresNotes && <span className="text-red-500">*</span>}
                {hasNaSuggestion && naAccepted && <span className="ml-2 text-xs text-blue-600">(AI-generated)</span>}
              </label>
              <textarea
                id={`notes-${item.id}`}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                placeholder={
                  hasNaSuggestion && !naAccepted
                    ? 'Click "Quick Accept N/A" to auto-populate notes...'
                    : requiresNotes
                    ? 'Notes are required for fail/partial status'
                    : 'Optional notes...'
                }
                className={cn(
                  'w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm',
                  requiresNotes && !formNotes.trim() && 'border-red-300'
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              {submitSuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Saved!
                </span>
              )}
              {hasNaSuggestion && naAccepted && (
                <Button
                  variant="outline"
                  onClick={handleUndoNASuggestion}
                  disabled={isSubmitting}
                >
                  Undo N/A & Review Manually
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                isLoading={isSubmitting}
              >
                Submit Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
