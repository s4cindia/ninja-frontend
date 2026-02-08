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
  '1.2.1': `**Why Manual Review is Required:**
Automated tools cannot verify if audio-only or video-only content has accurate text alternatives that convey equivalent information.

**What to Check:**
• Audio-only files (podcasts, audio lectures) have complete text transcripts
• Video-only content (silent animations, demonstrations) has text descriptions or transcripts
• Transcripts include all spoken content, speaker identification, and important sounds
• Text alternatives convey same information as the audio/video

**Examples:**
1. Educational EPUB with embedded audio lecture should include: full transcript with timestamps, speaker names, and descriptions of relevant sounds
2. Math textbook with video-only geometric proof should provide: step-by-step text description of the visual demonstration
3. Language learning EPUB with pronunciation audio clips should have: phonetic transcriptions alongside audio files

**Note:** Rarely applicable to static EPUBs. Most common in multimedia textbooks or educational content with embedded audio/video.`,
  '1.2.2': `**Why Manual Review is Required:**
Automated tools can detect caption files but cannot verify accuracy, synchronization, or completeness of captions.

**What to Check:**
• Captions include all dialogue word-for-word
• Speaker identification provided when multiple speakers present
• Important non-speech sounds described [applause], [door closes]
• Captions synchronized with audio (appear at correct time)
• Music and sound effects captioned when relevant to content

**Examples:**
1. Science textbook with experiment video should caption: all instructor dialogue, [beaker bubbling], [timer beeping]
2. History EPUB with documentary footage should identify: [Narrator], [Interviewee], background music descriptions
3. Interactive textbook video quiz should caption: question audio, answer options, [correct answer sound]

**Note:** Only applicable to EPUBs with embedded video content. Most static EPUBs don't include video.`,
  '1.2.3': `**Why Manual Review is Required:**
Automated tools cannot assess if audio descriptions or text alternatives convey all important visual information from video content.

**What to Check:**
• Visual information not in dialogue is described (actions, settings, expressions, text on screen)
• Audio description track available OR comprehensive text alternative provided
• Descriptions don't overlap important dialogue
• Text alternatives for video include both visual and auditory information

**Examples:**
1. Biology textbook video of cell division should describe: visual changes in cell structure, colors indicating different phases, on-screen labels
2. Art history EPUB video should describe: painting details, brushstroke techniques, color palettes shown
3. Engineering textbook with assembly video should describe: each step visually shown, tool positions, component orientations

**Note:** Only applicable to EPUBs with video content. Static EPUBs typically don't require audio descriptions.`,
  '1.2.4': `**Why Manual Review is Required:**
Automated tools cannot verify the quality, accuracy, or synchronization of live captions during real-time broadcasts.

**What to Check:**
• Live streaming content has real-time captioning service
• Captions appear with minimal delay (< 3 seconds)
• Caption accuracy maintained during live presentation
• All dialogue and relevant sounds captioned in real-time

**Examples:**
1. EPUB with embedded live webinar stream should provide: real-time CART (Communication Access Realtime Translation) services
2. Educational platform with live lecture integration should ensure: instructor speech captioned as it occurs
3. Interactive textbook with live video discussions should have: automatic speech recognition backup with human correction

**Note:** Very rarely applicable to EPUBs. Only relevant for enhanced EPUBs with live streaming integration or real-time video content.`,
  '1.2.5': `**Why Manual Review is Required:**
Automated tools cannot assess the quality, accuracy, or timing of audio description tracks for prerecorded video.

**What to Check:**
• Audio description track describes all important visual information
• Descriptions fit in natural pauses without overlapping dialogue
• Visual actions, settings, expressions, and on-screen text described
• Description timing synchronized with video content

**Examples:**
1. Chemistry EPUB video experiment should describe: color changes in solutions, equipment setup, measurement readings on displays
2. Geography textbook map animation should describe: regions highlighted, data overlays shown, legend information
3. Literature EPUB with film adaptation excerpts should describe: character expressions, setting details, visual symbolism

**Note:** Only applicable to EPUBs with prerecorded video content. Most static EPUBs don't include video requiring audio descriptions.`,
  '1.3.1': `**Why Manual Review is Required:**
Automated tools can detect HTML tags but cannot verify if semantic structure accurately conveys information relationships and meaning.

**What to Check:**
• Heading hierarchy is logical (h1 → h2 → h3, no skipped levels)
• Lists use proper markup (<ul>, <ol>, <dl>) not just indentation
• Tables have proper headers (<th>), captions, and scope attributes
• Related content grouped with appropriate semantic elements (<section>, <article>, <aside>)
• Form fields have associated labels programmatically linked

**Examples:**
1. Textbook chapter structure: Chapter title (h1) → Section headings (h2) → Subsections (h3) → No jumping from h1 to h3
2. Glossary should use definition list: <dl><dt>Term</dt><dd>Definition</dd></dl>, not regular paragraphs
3. Data tables should have: <caption>, <th scope="col"> for column headers, <th scope="row"> for row headers
4. Sidebar content should use: <aside> element, not just visually positioned <div>

**Note:** Critical for all EPUBs. Proper semantic structure enables navigation, comprehension, and assistive technology functionality.`,
  '1.3.2': `**Why Manual Review is Required:**
Automated tools cannot verify if the DOM order matches the meaningful reading sequence when content is repositioned visually with CSS.

**What to Check:**
• Content reads in logical order when CSS disabled or with screen reader
• Sidebars, footnotes, and callout boxes positioned correctly in reading flow
• Multi-column layouts maintain proper sequence
• Floated images don't disrupt reading order
• Navigation elements appear in logical sequence

**Examples:**
1. Textbook with sidebar: HTML order should be main content → sidebar, even if CSS positions sidebar to the left
2. Chapter with footnotes: Footnote reference should appear before footnote content in DOM, even if footnotes displayed at bottom
3. Two-column layout: Left column content should come before right column in HTML source
4. Image with caption: Image and caption should be adjacent in DOM, not separated by unrelated content

**Note:** Important for EPUBs with complex layouts, sidebars, or CSS positioning. Test by disabling CSS or using screen reader.`,
  '1.3.3': `**Why Manual Review is Required:**
Automated tools cannot identify instructions that rely solely on sensory characteristics, which may not be perceivable to all users.

**What to Check:**
• Instructions don't rely only on shape ("click the round button")
• Directions don't depend only on location ("see the box on the right")
• References don't depend only on size ("use the large text box")
• Instructions don't depend only on sound ("when you hear the beep")
• Information conveyed by color also has text or icon

**Examples:**
1. Bad: "Answer the questions in the blue boxes" → Good: "Answer the questions labeled 'Practice Exercise'"
2. Bad: "Click the button on the right to continue" → Good: "Click the 'Next Chapter' button to continue"
3. Bad: "Required fields are marked in red" → Good: "Required fields are marked with an asterisk (*) and the word 'required'"
4. Bad: "Listen for the completion sound" → Good: "A message will appear saying 'Quiz Complete' when you finish"

**Note:** Important for all EPUBs, especially interactive textbooks and educational content with exercises or activities.`,
  '1.3.4': `**Why Manual Review is Required:**
Automated tools cannot test actual device behavior to verify content works in both portrait and landscape orientations.

**What to Check:**
• EPUB doesn't lock orientation using CSS or viewport meta tags
• Content reflows properly in both portrait and landscape
• Fixed layouts work in both orientations (if fixed layout EPUB)
• No content restricted to single orientation unless essential
• Reading experience functional when device rotated

**Examples:**
1. Reflowable EPUB should: adapt to any screen orientation, reflow text naturally, maintain readability in both portrait and landscape
2. Fixed-layout EPUB (children's picture book) may: use dual-page spreads in landscape, show single pages in portrait
3. Interactive textbook should: allow exercises to be completed in either orientation, no "rotate your device" messages unless absolutely necessary
4. Math or music notation EPUB: orientation lock acceptable only if notation fundamentally requires landscape display

**Note:** More relevant for EPUB3 with responsive layouts. Test on actual devices (phones, tablets) in both orientations.`,
  '1.3.5': `**Why Manual Review is Required:**
Automated tools can detect autocomplete attributes but cannot verify if the correct purpose is assigned to each input field.

**What to Check:**
• Personal information fields have appropriate autocomplete values
• Name fields use: autocomplete="name", "given-name", "family-name"
• Email fields use: autocomplete="email"
• Address fields use: autocomplete="street-address", "address-line1", etc.
• Phone fields use: autocomplete="tel"
• Autocomplete values match WCAG 2.1 specification list

**Examples:**
1. Student registration form should use: <input type="text" autocomplete="given-name"> for first name, <input type="email" autocomplete="email"> for email address
2. Quiz login form should use: <input type="text" autocomplete="username"> for username, <input type="password" autocomplete="current-password"> for password
3. Survey with demographic info should use: <input type="tel" autocomplete="tel"> for phone, <input autocomplete="bday"> for birthdate
4. Library card application should use: autocomplete="postal-code" for ZIP code, autocomplete="country" for country field

**Note:** Only applicable to EPUBs with interactive forms. Static EPUBs typically don't have input fields requiring autocomplete.`,
  '1.4.1': `**Why Manual Review is Required:**
Automated tools cannot identify all instances where color alone conveys meaning without additional visual or text indicators.

**What to Check:**
• Links distinguishable from surrounding text by more than just color (underline, bold, icon)
• Required form fields marked with more than just color (asterisk, "required" label)
• Chart/graph data series distinguished by patterns or labels, not just color
• Status indicators use icons or text, not just color coding
• Color-coded information has text equivalents

**Examples:**
1. Bad: Hyperlinks only in blue with no underline → Good: Links in blue AND underlined
2. Bad: Required fields with red border only → Good: Required fields have red border AND asterisk AND "required" label
3. Bad: Pie chart with color-coded sections only → Good: Pie chart sections have both colors AND text labels AND patterns/textures
4. Bad: "Items in red are on sale" → Good: "Items marked 'SALE' with red text are on sale"

**Note:** Important for all EPUBs, especially educational content with charts, graphs, diagrams, or color-coded information.`,
  '1.4.3': `**Why Manual Review is Required:**
Automated tools may miss contrast issues in gradients, images of text, complex backgrounds, and edge cases requiring human judgment.

**What to Check:**
• Body text has 4.5:1 contrast ratio against background
• Large text (18pt+ or 14pt+ bold) has 3:1 contrast ratio
• Text over images has sufficient contrast (may need semi-transparent overlay)
• Links have sufficient contrast in all states (normal, hover, visited, focus)
• Disabled elements don't need to meet contrast (but active elements do)

**Examples:**
1. Standard body text: Black (#000000) on white (#FFFFFF) = 21:1 ✓ Dark gray (#767676) on white = 4.5:1 ✓
2. Chapter headings (24pt): Medium gray (#959595) on white = 3:1 ✓
3. Text over photo: Use semi-transparent black overlay behind white text to ensure 4.5:1 contrast
4. Link colors: Blue links (#0000EE) on white background = 8.2:1 ✓

**Note:** Critical for all EPUBs. Use contrast checking tools (WebAIM Contrast Checker, WCAG Color Contrast Checker) to verify ratios.`,
  '1.4.5': `**Why Manual Review is Required:**
Automated tools cannot assess whether images of text are essential or could be replaced with actual styled text.

**What to Check:**
• Decorative fonts or logos are the only images of text (essential exception)
• Body content uses real text, not images of text
• Mathematical equations use MathML or real text when possible (images acceptable if complex)
• Historical documents or specific visual presentations justified as essential
• All images of text have accurate alt text as fallback

**Examples:**
1. ✓ Acceptable: Book cover logo as image, author's signature as image, historical manuscript photo with transcription
2. ✗ Not acceptable: Chapter headings as PNG images when CSS fonts would work, body paragraphs as screenshots
3. ✓ Acceptable: Complex chemical structure diagram as image (with alt text description)
4. ✗ Not acceptable: Styled quote as image when blockquote with CSS would achieve same effect

**Note:** Important for all EPUBs. Prefer real text over images whenever possible to support customization, translation, and accessibility.`,
  '1.4.10': `**Why Manual Review is Required:**
Automated tools cannot test actual reflow behavior at different zoom levels and viewport sizes on real reading systems.

**What to Check:**
• Content reflows at 320px viewport width without horizontal scrolling
• Text can be zoomed to 200% without loss of content or functionality
• No content clipped or hidden when zoomed
• Reading systems allow text resizing and reflow (for reflowable EPUBs)
• Fixed-width containers don't prevent reflow

**Examples:**
1. Reflowable EPUB (preferred): Text reflows naturally when reader changes font size or screen width, no horizontal scrolling needed
2. Tables: Use responsive table design or provide alternative views for narrow screens
3. Images: Scale proportionally or allow horizontal scrolling for images only (not text)
4. Fixed-layout EPUB: Acceptable for specific content like children's books, comics, but may not support reflow

**Note:** Critical for reflowable EPUBs. Test on multiple reading systems (Apple Books, Google Play Books, Kindle) at various sizes.`,
  '1.4.11': `**Why Manual Review is Required:**
Automated tools cannot identify all meaningful UI components and graphical objects that require contrast checking.

**What to Check:**
• Interactive element boundaries have 3:1 contrast (button borders, input fields)
• Focus indicators visible with 3:1 contrast against background
• Icons and graphical controls distinguishable with 3:1 contrast
• Chart/graph elements (bars, lines, data points) have 3:1 contrast
• State indicators (selected, active) visually distinguishable with 3:1 contrast

**Examples:**
1. Form inputs: Text input border (#767676) against white background = 3:1 ✓
2. Buttons: Button outline (#595959) against page background = 3:1 ✓
3. Interactive elements: Clickable icon (#707070) against white = 3.1:1 ✓
4. Graph elements: Bar chart bars or line graph lines have 3:1 contrast against background

**Note:** Applicable to EPUBs with interactive elements, forms, charts, or diagrams. Most static text-only EPUBs don't have many UI components.`,
  '1.4.12': `**Why Manual Review is Required:**
Automated tools cannot test whether content remains readable when users override text spacing with assistive technology.

**What to Check:**
• Content readable when line height increased to 1.5x font size
• Content readable when paragraph spacing increased to 2x font size
• Content readable when letter spacing increased to 0.12x font size
• Content readable when word spacing increased to 0.16x font size
• No text clipping, overlapping, or content loss with spacing overrides

**Examples:**
1. Test with browser extension (e.g., "Text Spacing Editor") or custom CSS applying WCAG spacing values
2. Verify: Headings don't overlap with content below, table cells expand to fit text, button labels remain visible
3. Check: Sidebar content doesn't get clipped, footer text remains readable, navigation menus still functional
4. Ensure: No fixed-height containers that clip text, no absolute positioning causing overlaps

**Note:** Important for all EPUBs. Users with dyslexia or low vision may need custom text spacing. Test by applying CSS overrides.`,
  '1.4.13': `**Why Manual Review is Required:**
Automated tools cannot test interactive behavior of tooltips, popovers, and hover-triggered content across input methods.

**What to Check:**
• Hover-triggered content (tooltips, footnotes) can be dismissed without moving pointer (usually via Esc key)
• Users can move pointer over triggered content without it disappearing (hoverable)
• Content remains visible until user dismisses or moves focus away (persistent)
• Keyboard users can trigger and dismiss content without mouse
• Content doesn't obscure other important information

**Examples:**
1. Footnote popups: User hovers on footnote reference → popup appears → user can move mouse over popup to read/select text → user presses Esc or moves away to dismiss
2. Glossary term definitions: Keyboard focus on term → definition tooltip appears → remains visible until user moves focus away or presses Esc
3. Image captions: Hover on image → caption appears → stays visible while mouse over image or caption → disappears when mouse leaves
4. Interactive diagrams: Hover on diagram element → detail popup appears → user can interact with popup content → closes on Esc or click outside

**Note:** Applicable to EPUBs with interactive tooltips, popovers, or hover-triggered content. Static EPUBs typically don't have hover behaviors.`,
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
  '2.1.4': `**Why Manual Review is Required:**
Automated tools cannot test if single-character keyboard shortcuts can be remapped, disabled, or only active when component has focus.

**What to Check:**
• Single-character shortcuts (no modifier key) can be turned off in settings
• Single-character shortcuts can be remapped to different keys
• Single-character shortcuts only active when specific component has focus
• Documentation provided for all keyboard shortcuts
• No conflicts with assistive technology keyboard commands

**Examples:**
1. Interactive textbook with 'n' key for next page should: allow disabling in preferences, OR allow remapping to 'Ctrl+n', OR only work when navigation menu focused
2. Quiz interface with 'a','b','c','d' for answers should: only respond when quiz has focus, not when typing in text field
3. EPUB reader with single-key navigation should: provide shortcut customization panel, allow toggling shortcuts on/off
4. Math exercise with 'x' key for multiply should: only work when calculator widget focused, not during text input

**Note:** Only applicable to EPUBs with custom JavaScript keyboard shortcuts. Static EPUBs typically don't implement keyboard shortcuts.`,
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
  '2.3.1': `**Why Manual Review is Required:**
Automated tools can detect flashing content but cannot accurately measure flash frequency or assess general/red flash thresholds.

**What to Check:**
• Content doesn't flash more than 3 times per second
• If flashing occurs, it's below general flash threshold (area and luminance limits)
• No red flashes meeting the red flash threshold criteria
• Animated GIFs, videos, or JavaScript animations reviewed for flash rates
• Users can pause or stop any flashing content

**Examples:**
1. Educational animations: Lightning effect in science animation should flash ≤ 3 times per second OR be below threshold size
2. Video content: Strobe effects or rapid scene changes reviewed for flash rate compliance
3. Interactive diagrams: Blinking indicators should flash slowly (< 3 Hz) or use fade effects instead
4. Attention indicators: Use fading or pulsing effects instead of hard flashing

**Note:** Rarely an issue in static EPUBs. More relevant for EPUBs with embedded video, animated GIFs, or JavaScript animations. Use tools like PEAT (Photosensitive Epilepsy Analysis Tool) for detailed analysis.`,
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
  '2.4.5': `**Why Manual Review is Required:**
Automated tools cannot assess whether multiple navigation methods exist for locating content within an EPUB.

**What to Check:**
• At least two ways to navigate to any chapter or section
• Navigation methods include: table of contents, index, search, chapter links, page list
• Landmark navigation available (nav element, EPUB landmarks)
• Related content linked bidirectionally (footnotes link back to reference)
• Reading system search functionality works with content

**Examples:**
1. Textbook should provide: Table of Contents AND Index AND internal cross-references
2. Reference book should offer: TOC AND Index AND glossary with links back to usage
3. Fiction novel can use: TOC for chapters AND page list for page numbers
4. Technical manual should have: TOC AND searchable terms AND cross-reference links

**Note:** Important for all multi-chapter EPUBs. Single-chapter documents or short stories may have exceptions. Most EPUB reading systems provide TOC and search by default.`,
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
  '2.5.1': `**Why Manual Review is Required:**
Automated tools cannot test multipoint or path-based gestures to verify single-pointer alternatives exist.

**What to Check:**
• Pinch-to-zoom has single-pointer alternative (zoom buttons)
• Multi-finger swipe gestures have single-pointer equivalents (navigation buttons)
• Drawing or path-based input has alternative methods (text input, selection)
• Drag operations can be performed with single taps/clicks
• All functionality accessible without complex gestures

**Examples:**
1. Interactive diagram with pinch-zoom should provide: zoom in/out buttons as alternative
2. Swipe-to-turn-page should also support: tap/click on next/previous buttons or arrow keys
3. Drawing exercise should offer: pre-drawn options to select, or text-based answer input
4. Drag-to-reorder list should allow: up/down buttons or keyboard shortcuts

**Note:** Only applicable to EPUBs with touch-based interactive elements. Most static EPUBs don't require gesture input. Test on touch devices (tablets, phones).`,
  '2.5.2': `**Why Manual Review is Required:**
Automated tools cannot test whether pointer operations can be cancelled before completion to prevent accidental activation.

**What to Check:**
• Down-event (mousedown, touchstart) doesn't trigger actions
• Actions trigger on up-event (mouseup, touchend) allowing cancellation
• Users can move pointer away before releasing to cancel action
• Or mechanism provided to undo completed action
• Essential exceptions: drag operations, drawing interfaces

**Examples:**
1. Quiz submit button: Action occurs on button release (up-event), not when pressed down, allowing user to slide finger/mouse away to cancel
2. Chapter navigation links: Activate on click release, user can press down then drag away to avoid navigation
3. Interactive elements: Hover + click pattern allows review before commit
4. Undo available: If down-event must be used, provide clear undo mechanism

**Note:** Only applicable to EPUBs with interactive buttons, links, or touch interfaces. Test by pressing/touching element and dragging away before release.`,
  '2.5.3': `**Why Manual Review is Required:**
Automated tools cannot verify that the visible text label is included in the accessible name announced by assistive technology.

**What to Check:**
• Visible button text matches or is contained in accessible name (aria-label, aria-labelledby)
• Icon buttons with visible labels include label text in accessible name
• Form field visible labels match accessible name
• Link text matches accessible name
• If aria-label used, it includes visible text

**Examples:**
1. ✓ Button shows "Submit Quiz" and accessible name is "Submit Quiz" or "Submit Quiz Answers"
2. ✗ Button shows "Next" but aria-label="Navigate to next chapter" (doesn't include visible "Next" text)
3. ✓ Search button with magnifying glass icon and "Search" label has aria-label="Search textbook"
4. ✗ Link text "Chapter 3" but aria-label="Jump to third chapter" (should include "Chapter 3")

**Note:** Applicable to EPUBs with interactive elements, buttons, forms, or custom controls. Important for voice control users who speak visible labels.`,
  '2.5.4': `**Why Manual Review is Required:**
Automated tools cannot test whether functionality triggered by device motion has alternative input methods and can be disabled.

**What to Check:**
• Shake-to-undo has alternative (undo button)
• Tilt-to-scroll has alternative (scroll buttons or touch)
• Motion-activated features can be disabled in settings
• Device orientation changes don't unintentionally trigger actions
• Motion actuation only used when essential

**Examples:**
1. Shake-to-shuffle quiz questions should provide: shuffle button as alternative AND option to disable shake detection
2. Tilt-based 3D model viewer should offer: on-screen rotation controls AND disable motion toggle
3. Motion-based games/exercises should include: button-based controls AND settings to turn off motion input
4. Auto-rotate for orientation is acceptable: standard system behavior for viewing content

**Note:** Very rarely applicable to standard EPUBs. Only relevant for enhanced EPUBs with motion-activated features or interactive exercises using device sensors.`,
  '3.1.1': `**Why Manual Review is Required:**
Automated tools can detect missing language attributes but cannot verify if the specified language is correct for the content.

**What to Check:**
• Each chapter/section has lang attribute matching its primary language
• Book metadata specifies correct primary language
• Language codes are valid (e.g., "en" for English, "es" for Spanish, "fr" for French)
• Mixed-language content has appropriate lang attributes on containing elements

**Examples:**
1. English EPUB should have: <html lang="en"> or epub:type with language declaration
2. Spanish textbook should declare: <html lang="es"> in each XHTML file
3. Bilingual dictionary with English and Spanish should mark sections: <section lang="en"> and <section lang="es">
4. Foreign language textbook teaching French should use lang="fr" for example sentences`,
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
  '3.3.3': `**Why Manual Review is Required:**
Automated tools cannot assess whether error messages provide helpful suggestions for correction or if suggestions are appropriate.

**What to Check:**
• Input errors provide specific correction suggestions
• Suggestions are relevant and helpful
• Multiple correction options offered when applicable
• Format examples provided for common input patterns
• Suggestions don't compromise security (e.g., password hints)

**Examples:**
1. Date format error: "Please enter date as MM/DD/YYYY (example: 12/25/2024)" instead of just "Invalid date"
2. Quiz answer: "Incorrect. The answer is related to photosynthesis. Try focusing on how plants convert light energy." instead of just "Wrong"
3. Email validation: "Email must include @ symbol (example: student@school.edu)" instead of "Invalid email"
4. Numeric range: "Please enter a number between 1 and 100" instead of "Out of range"

**Note:** Only applicable to EPUBs with interactive forms, quizzes, or input validation. Static EPUBs typically don't have error handling.`,
  '3.3.4': `**Why Manual Review is Required:**
Automated tools cannot identify legal, financial, or data-modifying submissions that require error prevention mechanisms.

**What to Check:**
• Submissions can be reversed, verified, or confirmed before final commit
• Legal agreements have review step before acceptance
• Financial transactions have confirmation page
• User data modifications can be reviewed before saving
• Test submissions clearly marked and separated from real submissions

**Examples:**
1. Purchase/registration forms: "Review Order" page before final "Confirm Purchase" button
2. License agreements: Checkbox "I have read and agree" + separate "Accept" button (two-step process)
3. Quiz submissions: "Review Answers" page before final "Submit for Grading"
4. Profile updates: "Preview Changes" before "Save Profile" with ability to edit

**Note:** Rarely applicable to standard EPUBs. Only relevant for enhanced EPUBs with e-commerce, registration forms, or high-stakes assessments.`,
  '4.1.1': `**Why Manual Review is Required:**
Automated tools detect common parsing errors but cannot verify all aspects of valid XHTML/XML markup in complex EPUBs.

**What to Check:**
• All XHTML files are well-formed XML (properly closed tags, nested correctly)
• No duplicate IDs within each file
• Attribute values properly quoted
• Special characters properly escaped (&lt; &gt; &amp; &quot; &apos;)
• Namespace declarations correct for EPUB3

**Examples:**
1. ✓ Well-formed: <p>Text <strong>bold</strong> text</p>
2. ✗ Malformed: <p>Text <strong>bold</p></strong> (incorrect nesting)
3. ✓ Proper IDs: <div id="chapter1">...<section id="section1-1">
4. ✗ Duplicate IDs: <div id="intro">...<section id="intro"> (same ID twice)
5. ✓ Escaped entities: <p>Use &lt;b&gt; tag for bold</p>

**Note:** Most EPUB creation tools generate valid markup. Manual review mainly needed for hand-coded EPUBs or complex custom elements. Use EPUBCheck for validation.`,
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
  '4.1.3': `**Why Manual Review is Required:**
Automated tools cannot verify if status messages are properly announced by assistive technology without interrupting user's current task.

**What to Check:**
• Status messages use appropriate ARIA live regions (role="status", aria-live="polite")
• Success/error messages announced without moving focus
• Loading indicators communicate state changes
• Quiz feedback announced when answers checked
• Progress updates communicated to screen reader users

**Examples:**
1. Quiz submission: "Your answer has been saved" message uses <div role="status">Saved</div> (announced without moving focus)
2. Form validation: Error messages use aria-live="assertive" for immediate announcement
3. Progress indicator: "Loading chapter 5 of 10" announced as content loads
4. Search results: "15 results found" announced when search completes

**Note:** Only applicable to EPUBs with dynamic content updates, interactive forms, or JavaScript-driven status changes. Static EPUBs don't have status messages.`,
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
  const [showManualReason, setShowManualReason] = useState(true); // Expanded by default so users see guidance
  
  const latestHistory = item.history.length > 0 ? item.history[item.history.length - 1] : null;
  const historyLength = item.history.length;

  // Smart defaults based on confidence (80% threshold - Option C)
  // Only treat as N/A suggestion if suggestedStatus is 'not_applicable', not 'uncertain'
  const hasNaSuggestion = !!item.naSuggestion && item.naSuggestion.suggestedStatus === 'not_applicable';
  const isHighConfidence = item.confidenceScore >= 0.8; // 80% threshold
  const hasHistory = !!latestHistory?.status;

  // Determine default status
  let defaultStatus: VerificationStatus | '' = '';
  if (hasHistory) {
    // If already verified, use history status
    defaultStatus = latestHistory.status;
  } else if (hasNaSuggestion) {
    // N/A suggestions (not uncertain) have high confidence, auto-fill
    defaultStatus = 'verified_pass';
  } else if (isHighConfidence) {
    // High confidence (>=80%): pre-fill based on automated result
    if (item.automatedResult === 'pass') {
      defaultStatus = 'verified_pass';
    } else if (item.automatedResult === 'fail') {
      defaultStatus = 'verified_fail';
    } else {
      // warning or not_tested: leave blank (requires explicit selection)
      defaultStatus = '';
    }
  } else {
    // Low confidence (<80%): leave blank (requires explicit selection)
    defaultStatus = '';
  }

  const defaultMethod = hasHistory ? latestHistory.method : 'Manual Review';

  const [formStatus, setFormStatus] = useState<VerificationStatus | ''>(defaultStatus);
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
  const hasSelectedStatus = formStatus !== ''; // Require status selection for low confidence items
  const canSubmit = hasSelectedStatus && (!requiresNotes || formNotes.trim().length > 0);

  const handleSubmit = () => {
    if (canSubmit && formStatus !== '') {
      onSubmit(item.id, formStatus as VerificationStatus, formMethod, formNotes);
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
                  {!isHighConfidence && !hasNaSuggestion && !hasHistory && (
                    <span className="ml-2 text-xs text-orange-600">(Selection required)</span>
                  )}
                </label>
                <select
                  id={`status-${item.id}`}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as VerificationStatus | '')}
                  disabled={hasNaSuggestion}
                  className={cn(
                    "w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm",
                    hasNaSuggestion && "bg-gray-100 cursor-not-allowed",
                    formStatus === '' && "text-gray-500"
                  )}
                >
                  {formStatus === '' && (
                    <option value="" disabled>Select verification status...</option>
                  )}
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
