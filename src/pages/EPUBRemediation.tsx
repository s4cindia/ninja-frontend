import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ArrowLeft, Eye, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  RemediationPlanView,
  RemediationPlan as PlanViewPlan,
} from "@/components/epub/RemediationPlanView";
import {
  RemediationTask,
  TaskStatus,
} from "@/components/epub/RemediationTaskCard";
import { FixResult } from "@/components/epub/RemediationProgress";
import { EPUBExportOptions } from "@/components/epub/EPUBExportOptions";
import {
  ReAuditSection,
  ReauditResult,
} from "@/components/epub/ReAuditSection";
import { TransferToAcrButton } from "@/components/epub/TransferToAcrButton";
import { QuickRating } from "@/components/feedback";
import { api } from "@/services/api";
import { IssueTallyTracker, TallyData, CompletionStats } from "@/components/remediation/IssueTallyTracker";
import { BatchQuickFixPanel } from "@/components/remediation/BatchQuickFixPanel";
import { hasQuickFixTemplate } from "@/data/quickFixTemplates";

type PageState = "loading" | "ready" | "running" | "complete" | "error";

interface LocationState {
  auditResult?: {
    jobId: string;
    fileName?: string;
    issues: Array<{
      id: string;
      code: string;
      severity: "critical" | "serious" | "moderate" | "minor";
      message: string;
      location?: string;
      suggestion?: string;
    }>;
  };
  autoFixableIssues?: Array<{
    id: string;
    code: string;
    severity: "critical" | "serious" | "moderate" | "minor";
    message: string;
    location?: string;
    suggestion?: string;
    isAutoFixable: boolean;
    status: "pending";
  }>;
  isDemo?: boolean;
  fileName?: string;
}

interface ComparisonSummary {
  fixedCount: number;
  failedCount: number;
  skippedCount: number;
  beforeScore: number;
  afterScore: number;
}

interface RawAceAssertion {
  "@type"?: string;
  id?: string;
  code?: string;
  issueCode?: string;
  ruleId?: string;
  rule?: { id?: string; code?: string };
  test?: { id?: string; code?: string; title?: string };
  severity?: string;
  impact?: string;
  message?: string;
  issueMessage?: string;
  description?: string;
  location?: string;
  pointer?: string;
  suggestion?: string;
  help?: string;
  isAutoFixable?: boolean;
  type?: string;
  status?: string;
  filePath?: string;
  selector?: string;
  wcagCriteria?: string[];
  source?: string;
  html?: string;
  element?: string;
  context?: string;
  snippet?: string;
  remediation?:
    | string
    | {
        title: string;
        steps: string[];
        codeExample?: { before: string; after: string };
        resources?: { label: string; url: string }[];
      };
}

const wcagMappings: Record<string, string[]> = {
  metadata: ["1.3.1"],
  accessmode: ["1.1.1"],
  accessibilityfeature: ["1.3.1", "4.1.2"],
  accessibilityhazard: ["2.3.1"],
  accessibilitysummary: ["1.1.1"],
  accessmodesufficient: ["1.1.1"],
  conformsto: ["1.1.1"],
  alt: ["1.1.1"],
  img: ["1.1.1"],
  image: ["1.1.1"],
  nav: ["2.4.1", "2.4.5"],
  landmark: ["2.4.1", "1.3.6"],
  heading: ["1.3.1", "2.4.6"],
  table: ["1.3.1"],
  lang: ["3.1.1", "3.1.2"],
  language: ["3.1.1", "3.1.2"],
  link: ["2.4.4"],
  label: ["1.3.1", "4.1.2"],
  aria: ["4.1.2"],
  contrast: ["1.4.3"],
  color: ["1.4.1"],
  focus: ["2.4.7"],
  keyboard: ["2.1.1"],
  title: ["2.4.2"],
  pagebreak: ["2.4.1"],
  toc: ["2.4.5"],
  reading: ["1.3.2"],
  order: ["1.3.2"],
};

const remediationTemplates: Record<
  string,
  {
    title: string;
    steps: string[];
    codeExample?: { before: string; after: string };
    resources?: { label: string; url: string }[];
  }
> = {
  metadata: {
    title: "Add Required Metadata",
    steps: [
      "Open your EPUB package document (content.opf)",
      "Ensure required metadata elements are present",
      "Add accessibility metadata (accessMode, accessibilityFeature, etc.)",
      "Validate with EPUBCheck after changes",
    ],
    resources: [
      {
        label: "A11y Metadata Guide",
        url: "https://www.w3.org/2021/a11y-discov-vocab/latest/",
      },
      {
        label: "EPUB Accessibility",
        url: "https://www.w3.org/TR/epub-a11y-11/",
      },
    ],
  },
  accessmode: {
    title: "Add schema:accessMode Metadata",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the OPF file:** In Book Browser, double-click `content.opf` (under Text or at root)",
      "**Switch to Code View:** Press `F9` if needed",
      "**Locate the `<metadata>` section** and add the accessMode property",
      "**Save:** `Ctrl+S` and validate with Tools → Validate EPUB",
    ],
    codeExample: {
      before: `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>My Book</dc:title>
  <!-- Missing accessMode -->
</metadata>`,
      after: `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>My Book</dc:title>
  <meta property="schema:accessMode">textual</meta>
  <meta property="schema:accessMode">visual</meta>
</metadata>`,
    },
    resources: [
      {
        label: "accessMode Documentation",
        url: "https://www.w3.org/2021/a11y-discov-vocab/latest/#accessMode",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  accessibilityfeature: {
    title: "Add schema:accessibilityFeature Metadata",
    steps: [
      "Open your EPUB package document (content.opf)",
      "Locate the <metadata> section",
      'Add <meta property="schema:accessibilityFeature">structuralNavigation</meta>',
      "Add other features: alternativeText, readingOrder, tableOfContents, etc.",
      "Validate with EPUBCheck after changes",
    ],
    resources: [
      {
        label: "accessibilityFeature Guide",
        url: "https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilityFeature",
      },
    ],
  },
  accessibilityhazard: {
    title: "Add schema:accessibilityHazard Metadata",
    steps: [
      "Open your EPUB package document (content.opf)",
      "Locate the <metadata> section",
      'Add <meta property="schema:accessibilityHazard">none</meta> if no hazards',
      "Or specify hazards: flashing, motionSimulation, sound as applicable",
      "Validate with EPUBCheck after changes",
    ],
    resources: [
      {
        label: "accessibilityHazard Guide",
        url: "https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilityHazard",
      },
    ],
  },
  accessibilitysummary: {
    title: "Add schema:accessibilitySummary Metadata",
    steps: [
      "Open your EPUB package document (content.opf)",
      "Locate the <metadata> section",
      'Add <meta property="schema:accessibilitySummary">Human-readable summary</meta>',
      "Describe accessibility features in plain language for end users",
      "Validate with EPUBCheck after changes",
    ],
    resources: [
      {
        label: "accessibilitySummary Guide",
        url: "https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilitySummary",
      },
    ],
  },
  alt: {
    title: "Add Meaningful Alt Text",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      '**Find the file:** In Book Browser, expand "Text" and open the file from the issue location',
      "**Switch to Code View:** Press `F9`",
      "**Find the image:** Search (`Ctrl+F`) for `<img` or the image filename",
      "**Add alt attribute** with descriptive text (see example below)",
      "**Save:** `Ctrl+S`",
    ],
    codeExample: {
      before: `<img src="images/figure1.jpg" />`,
      after: `<img src="images/figure1.jpg" alt="Bar chart showing sales growth from 2020 to 2024, with 15% year-over-year increase" />`,
    },
    resources: [
      {
        label: "Alt Text Decision Tree",
        url: "https://www.w3.org/WAI/tutorials/images/decision-tree/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  img: {
    title: "Fix Image Accessibility",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      '**Find the file:** In Book Browser, expand "Text" and open the file from the issue location',
      "**Switch to Code View:** Press `F9`",
      "**Locate the `<img>` element** mentioned in the issue",
      "**Add descriptive alt text** that conveys the image meaning",
      '**For decorative images:** Use `alt=""`',
      "**Save:** `Ctrl+S`",
    ],
    codeExample: {
      before: `<img src="decorative-divider.png" />
<img src="diagram.png" />`,
      after: `<img src="decorative-divider.png" alt="" />
<img src="diagram.png" alt="Workflow diagram showing 3 steps: Upload, Process, Download" />`,
    },
    resources: [
      {
        label: "Image Tutorial",
        url: "https://www.w3.org/WAI/tutorials/images/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  contrast: {
    title: "Fix Color Contrast",
    steps: [
      "Identify the text and background color combination",
      "Use a contrast checker tool to verify the ratio",
      "Normal text requires 4.5:1 contrast ratio minimum",
      "Large text (18pt+) requires 3:1 contrast ratio minimum",
      "Adjust colors in your CSS to meet requirements",
    ],
    resources: [
      {
        label: "Contrast Checker",
        url: "https://webaim.org/resources/contrastchecker/",
      },
      {
        label: "WCAG 1.4.3",
        url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum",
      },
    ],
  },
  heading: {
    title: "Fix Heading Structure",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the file:** Open the file from the issue location in Book Browser",
      "**Switch to Code View:** Press `F9`",
      "**Find headings:** Search (`Ctrl+F`) for `<h1`, `<h2`, `<h3`, etc.",
      "**Ensure logical order:** h1 → h2 → h3 (no skipping levels)",
      "**Each chapter:** Should have exactly one `<h1>`",
      "**Save:** `Ctrl+S`",
    ],
    codeExample: {
      before: `<h1>Chapter Title</h1>
<h3>Subsection</h3>  <!-- ERROR: Skipped h2 -->
<h4>Details</h4>`,
      after: `<h1>Chapter Title</h1>
<h2>Subsection</h2>  <!-- Fixed: h2 follows h1 -->
<h3>Details</h3>`,
    },
    resources: [
      {
        label: "Heading Structure Guide",
        url: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  table: {
    title: "Fix Table Accessibility",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the file:** Open the file from the issue location",
      "**Switch to Code View:** Press `F9`",
      "**Find the table:** Search (`Ctrl+F`) for `<table`",
      "**Add `<caption>`** to describe the table purpose",
      '**Use `<th>` for headers** with `scope="col"` or `scope="row"`',
      "**Save:** `Ctrl+S`",
    ],
    codeExample: {
      before: `<table>
  <tr>
    <td>Name</td><td>Price</td>
  </tr>
  <tr>
    <td>Widget</td><td>$10</td>
  </tr>
</table>`,
      after: `<table>
  <caption>Product Price List</caption>
  <tr>
    <th scope="col">Name</th><th scope="col">Price</th>
  </tr>
  <tr>
    <td>Widget</td><td>$10</td>
  </tr>
</table>`,
    },
    resources: [
      {
        label: "Table Accessibility Tutorial",
        url: "https://www.w3.org/WAI/tutorials/tables/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  lang: {
    title: "How to set language attributes",
    steps: [
      "Add xml:lang attribute to the root html element",
      'Use correct BCP 47 language codes (e.g., "en", "fr", "es")',
      "Mark language changes within content with lang attributes",
    ],
    resources: [
      {
        label: "Language Guide",
        url: "https://www.w3.org/International/questions/qa-html-language-declarations",
      },
    ],
  },
  nav: {
    title: "How to fix navigation",
    steps: [
      "Open the navigation document (nav.xhtml)",
      "Add epub:type attributes to navigation elements",
      "Include landmarks: toc, bodymatter, backmatter",
      "Ensure the table of contents is complete",
    ],
    resources: [
      {
        label: "EPUB Navigation",
        url: "https://www.w3.org/TR/epub-33/#sec-nav",
      },
    ],
  },
  aria: {
    title: "How to add ARIA attributes",
    steps: [
      "Identify the element that needs ARIA enhancement",
      "Add appropriate role, aria-label, or aria-describedby",
      "Test with a screen reader to verify",
      "Ensure native HTML semantics are used first",
    ],
    resources: [
      { label: "ARIA Practices", url: "https://www.w3.org/WAI/ARIA/apg/" },
    ],
  },
  landmark: {
    title: "Fix Duplicate Landmarks",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      '**Find the file:** In Book Browser (left panel), expand "Text" and open the file from the issue location',
      "**Switch to Code View:** Press `F9` or View → Code View",
      '**Find duplicate landmarks:** Search (`Ctrl+F`) for `role="navigation"` or `<nav`',
      "**Add unique aria-label to each landmark** (see example below)",
      "**Save:** `Ctrl+S`",
    ],
    codeExample: {
      before: `<nav epub:type="toc" role="navigation">
  <!-- Table of Contents -->
</nav>
<nav epub:type="landmarks" role="navigation">
  <!-- Landmarks -->
</nav>`,
      after: `<nav epub:type="toc" role="navigation" aria-label="Table of Contents">
  <!-- Table of Contents -->
</nav>
<nav epub:type="landmarks" role="navigation" aria-label="Landmarks">
  <!-- Landmarks -->
</nav>`,
    },
    resources: [
      {
        label: "ARIA Landmarks Guide",
        url: "https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  link: {
    title: "Fix Link Purpose",
    steps: [
      'Identify links with vague text like "click here", "read more", "link"',
      "Replace with descriptive text that explains the destination",
      'Bad: <a href="...">Click here</a>',
      'Good: <a href="...">Download the accessibility report (PDF)</a>',
      "If using images as links, add descriptive alt text",
    ],
    resources: [
      {
        label: "Link Purpose",
        url: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
      },
    ],
  },
  pagebreak: {
    title: "Fix Page Break Labels",
    steps: [
      'Locate page break elements (epub:type="pagebreak")',
      "Add aria-label with the page number",
      'Example: <span epub:type="pagebreak" role="doc-pagebreak" aria-label="Page 42" id="page42"/>',
      "Ensure id attribute matches the page reference",
      "Update the page-list nav to reference these IDs",
    ],
    resources: [
      {
        label: "EPUB Page Navigation",
        url: "https://www.w3.org/publishing/epub32/epub-packages.html#sec-package-nav-def-pagelist",
      },
    ],
  },
  conformsto: {
    title: "Add Conformance Metadata",
    steps: [
      "Open the OPF file (content.opf or package.opf)",
      "Add dcterms:conformsTo in the metadata section",
      'For EPUB Accessibility 1.0: <meta property="dcterms:conformsTo">EPUB Accessibility 1.0</meta>',
      'For WCAG 2.0 AA: <meta property="dcterms:conformsTo">WCAG 2.0 Level AA</meta>',
      "Only claim conformance levels you actually meet",
    ],
    resources: [
      {
        label: "EPUB Accessibility",
        url: "https://www.w3.org/publishing/epub-a11y/",
      },
    ],
  },
  accessmodesufficient: {
    title: "Add Access Mode Sufficient Metadata",
    steps: [
      "Open the OPF file",
      "Add schema:accessModeSufficient metadata",
      "Indicates which access modes are sufficient to consume the content",
      'Example: <meta property="schema:accessModeSufficient">textual</meta>',
      "For visual content with descriptions: textual,visual",
      "For audio with transcripts: textual,auditory",
    ],
    resources: [
      {
        label: "Access Mode Sufficient",
        url: "https://www.w3.org/wiki/WebSchemas/Accessibility#accessModeSufficient",
      },
    ],
  },
  reading: {
    title: "Fix Reading Order",
    steps: [
      "Verify content in the document source matches logical reading order",
      "Reading order should follow visual layout when linearized",
      "Sidebars and asides should be positioned appropriately in source",
      "Use CSS for visual positioning, not source reordering",
      "Test with a screen reader to verify order makes sense",
    ],
    resources: [
      {
        label: "Reading Order",
        url: "https://www.w3.org/WAI/WCAG21/Understanding/meaningful-sequence.html",
      },
    ],
  },
  language: {
    title: "Add Language Declaration",
    steps: [
      "Add lang attribute to the root html element",
      'Example: <html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">',
      "Use correct BCP 47 language codes (en, fr, de, es, etc.)",
      "For multilingual content, add lang to specific elements",
      'Example: <p lang="fr">Bonjour le monde</p>',
    ],
    resources: [
      {
        label: "Language Tags",
        url: "https://www.w3.org/International/questions/qa-html-language-declarations",
      },
    ],
  },
  "epub-type-role": {
    title: "Add ARIA Role to Match epub:type",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the file:** Open the file from the issue location",
      "**Switch to Code View:** Press F9",
      "**Find elements with `epub:type`** that are missing role attributes",
      "**Add the matching ARIA role** using the mapping table below",
      "**Save:** Ctrl+S",
    ],
    codeExample: {
      before: `<!-- Missing role attribute -->
<section epub:type="chapter">
  <h1>Chapter 1</h1>
</section>

<aside epub:type="sidebar">
  <p>Side content</p>
</aside>`,
      after: `<!-- Added matching ARIA roles -->
<section epub:type="chapter" role="doc-chapter">
  <h1>Chapter 1</h1>
</section>

<aside epub:type="sidebar" role="doc-sidebar">
  <p>Side content</p>
</aside>`,
    },
    resources: [
      {
        label: "EPUB Type to ARIA Role Mapping",
        url: "https://www.w3.org/TR/epub-aria-authoring/",
      },
      { label: "DPUB-ARIA Roles", url: "https://www.w3.org/TR/dpub-aria-1.0/" },
    ],
  },
  opf: {
    title: "Fix OPF Package Document Issue",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the OPF file:** In Book Browser, double-click `content.opf`",
      "**Switch to Code View:** Press `F9` if needed",
      "**Locate the issue** based on the error message",
      "**Make the required correction** (see suggestion below)",
      "**Save:** `Ctrl+S` and validate with Tools → Validate EPUB",
    ],
    resources: [
      {
        label: "EPUB Packages Specification",
        url: "https://www.w3.org/TR/epub-33/#sec-package-doc",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  html: {
    title: "Fix HTML/XHTML Issue",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the file:** In Book Browser, expand \"Text\" and open the file from the issue location",
      "**Switch to Code View:** Press `F9`",
      "**Locate the issue** based on the error message and line number",
      "**Make the required correction** (see suggestion below)",
      "**Save:** `Ctrl+S`",
    ],
    resources: [
      {
        label: "HTML Validator",
        url: "https://validator.w3.org/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
  css: {
    title: "Fix CSS Styling Issue",
    steps: [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Find the CSS file:** In Book Browser, expand \"Styles\" and open the relevant stylesheet",
      "**Switch to Code View:** Press `F9` if needed",
      "**Locate the issue** based on the error message",
      "**Make the required correction** (see suggestion below)",
      "**Save:** `Ctrl+S`",
    ],
    resources: [
      {
        label: "CSS Validator",
        url: "https://jigsaw.w3.org/css-validator/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  },
};

// Escape markdown special characters to prevent rendering issues
function escapeMarkdown(text: string): string {
  return text.replace(/([*_`[\]\\])/g, '\\$1');
}

function createDynamicTemplate(
  suggestion: string,
  code: string,
): RemediationTask["remediation"] {
  const upperCode = code.toUpperCase();
  const sanitizedSuggestion = suggestion ? escapeMarkdown(suggestion) : '';
  
  let title = "Manual Fix Required";
  let baseSteps: string[] = [
    "**Open in Sigil:** File → Open → Select your EPUB",
    "**Locate the issue:** Find the file mentioned in the location",
    "**Switch to Code View:** Press `F9`",
  ];
  
  if (upperCode.startsWith("OPF-") || upperCode.startsWith("PKG-")) {
    title = "Fix Package Document Issue";
    baseSteps = [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Open the OPF file:** Double-click `content.opf` in Book Browser",
      "**Switch to Code View:** Press `F9`",
    ];
  } else if (upperCode.startsWith("HTM-") || upperCode.startsWith("HTML-")) {
    title = "Fix HTML/XHTML Issue";
  } else if (upperCode.startsWith("CSS-")) {
    title = "Fix CSS Issue";
    baseSteps = [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Open the stylesheet:** In Book Browser, expand \"Styles\"",
      "**Switch to Code View:** Press `F9`",
    ];
  } else if (upperCode.startsWith("RSC-")) {
    title = "Fix Resource Issue";
  } else if (upperCode.startsWith("NAV-")) {
    title = "Fix Navigation Issue";
    baseSteps = [
      "**Open in Sigil:** File → Open → Select your EPUB",
      "**Open the navigation file:** Find `nav.xhtml` in Book Browser",
      "**Switch to Code View:** Press `F9`",
    ];
  }
  
  const suggestionStep = sanitizedSuggestion 
    ? `**Suggestion:** ${sanitizedSuggestion}`
    : "**Review the error message** and make the appropriate correction";
  
  return {
    title,
    steps: [
      ...baseSteps,
      suggestionStep,
      "**Save:** `Ctrl+S` and validate with Tools → Validate EPUB",
    ],
    resources: [
      {
        label: "EPUB Accessibility",
        url: "https://www.w3.org/TR/epub-a11y-11/",
      },
      {
        label: "Sigil User Guide",
        url: "https://sigil-ebook.com/sigil/guide/",
      },
    ],
  };
}

function getWcagCriteriaFromCode(code: string, message: string): string[] {
  const lowerCode = code.toLowerCase();
  const lowerMessage = message.toLowerCase();

  // First try exact code match (e.g., "table" or "table-structure")
  for (const [keyword, criteria] of Object.entries(wcagMappings)) {
    if (
      lowerCode === keyword ||
      lowerCode.includes(`-${keyword}`) ||
      lowerCode.includes(`${keyword}-`)
    ) {
      return criteria;
    }
  }

  // Then try word boundary match in message to prevent false positives
  // (e.g., "table of contents" won't match "table" keyword)
  for (const [keyword, criteria] of Object.entries(wcagMappings)) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(lowerMessage)) {
      return criteria;
    }
  }

  return [];
}

// Issue code aliases for precise matching
const issueCodeAliases: Record<string, string> = {
  "METADATA-ACCESSMODE": "accessmode",
  "METADATA-ACCESSIBILITYFEATURE": "accessibilityfeature",
  "METADATA-ACCESSIBILITYHAZARD": "accessibilityhazard",
  "METADATA-ACCESSIBILITYSUMMARY": "accessibilitysummary",
  "METADATA-ACCESSMODESUFFICIENT": "accessmodesufficient",
  "EPUB-ACCESSMODE": "accessmode",
  "EPUB-001": "accessmode",
  "EPUB-002": "accessibilityfeature",
  "EPUB-003": "accessibilityhazard",
  "EPUB-004": "accessibilitysummary",
  "LANDMARK-UNIQUE": "landmark",
  "ARIA-LANDMARK-UNIQUE": "landmark",
  "COLOR-CONTRAST": "contrast",
  CONTRAST: "contrast",
  "IMAGE-ALT": "alt",
  "IMG-ALT": "alt",
  "HEADING-ORDER": "heading",
  "HEADING-SKIP": "heading",
  LANGUAGE: "language",
  "HTML-LANG": "language",
  "TABLE-STRUCTURE": "table",
  "TABLE-HEADERS": "table",
  "PAGEBREAK-LABEL": "pagebreak",
  "LINK-NAME": "link",
  "LINK-PURPOSE": "link",
  "EPUB-TYPE-HAS-MATCHING-ROLE": "epub-type-role",
  "EPUB-TYPE-ROLE": "epub-type-role",
};

function getRemediationFromCode(
  code: string,
  message: string,
  suggestion?: string,
): RemediationTask["remediation"] {
  const upperCode = code.toUpperCase().trim();
  const lowerCode = code.toLowerCase();
  const lowerMessage = message.toLowerCase();

  // 1. Check alias first (exact code match)
  if (issueCodeAliases[upperCode]) {
    const templateKey = issueCodeAliases[upperCode];
    if (remediationTemplates[templateKey]) {
      return remediationTemplates[templateKey];
    }
  }

  // 2. Check for partial alias matches (e.g., "LANDMARK-UNIQUE-xyz")
  for (const [aliasCode, templateKey] of Object.entries(issueCodeAliases)) {
    if (
      upperCode.includes(aliasCode) ||
      upperCode.startsWith(aliasCode.split("-")[0] + "-")
    ) {
      if (remediationTemplates[templateKey]) {
        return remediationTemplates[templateKey];
      }
    }
  }

  // 3. Check for code prefix-based templates (OPF-*, HTM-*, CSS-*, etc.)
  if (upperCode.startsWith("OPF-") || upperCode.startsWith("PKG-")) {
    return createDynamicTemplate(suggestion || "", code);
  }
  if (upperCode.startsWith("HTM-") || upperCode.startsWith("HTML-")) {
    return createDynamicTemplate(suggestion || "", code);
  }
  if (upperCode.startsWith("CSS-")) {
    return createDynamicTemplate(suggestion || "", code);
  }
  if (upperCode.startsWith("RSC-")) {
    return createDynamicTemplate(suggestion || "", code);
  }
  if (upperCode.startsWith("NAV-")) {
    return createDynamicTemplate(suggestion || "", code);
  }

  // 4. Priority-based keyword matching on code
  const priorityOrder = [
    "landmark",
    "accessmodesufficient",
    "accessibilityfeature",
    "accessibilityhazard",
    "accessibilitysummary",
    "accessmode",
    "conformsto",
    "pagebreak",
    "reading",
    "heading",
    "contrast",
    "language",
    "table",
    "link",
    "img",
    "alt",
    "nav",
    "aria",
    "lang",
    "metadata",
  ];

  for (const keyword of priorityOrder) {
    if (lowerCode.includes(keyword) && remediationTemplates[keyword]) {
      return remediationTemplates[keyword];
    }
  }

  // 5. Fallback: check message keywords
  for (const keyword of priorityOrder) {
    if (lowerMessage.includes(keyword) && remediationTemplates[keyword]) {
      return remediationTemplates[keyword];
    }
  }

  // 6. Final fallback: use dynamic template with suggestion
  if (suggestion) {
    return createDynamicTemplate(suggestion, code);
  }

  return undefined;
}

function getSourceFromCode(code: string): string {
  const upperCode = code.toUpperCase();
  if (upperCode.startsWith("EPUB-") || upperCode.includes("ACE")) return "ACE";
  if (
    upperCode.startsWith("PKG-") ||
    upperCode.startsWith("OPF-") ||
    upperCode.startsWith("RSC-")
  )
    return "EPUBCheck";
  if (upperCode.startsWith("AXE-") || upperCode.includes("AXE")) return "AXE";
  return "ACE";
}

function normalizeAceTask(
  raw: RawAceAssertion,
  index: number,
): RemediationTask {
  const code =
    raw.issueCode ||
    raw.code ||
    raw.ruleId ||
    raw.rule?.code ||
    raw.rule?.id ||
    raw.test?.code ||
    raw.test?.id ||
    (raw["@type"] === "earl:assertion" ? null : raw["@type"]) ||
    `EPUB-${String(index + 1).padStart(3, "0")}`;

  const severityMap: Record<
    string,
    "critical" | "serious" | "moderate" | "minor"
  > = {
    critical: "critical",
    serious: "serious",
    major: "serious",
    moderate: "moderate",
    minor: "minor",
    low: "minor",
  };
  const rawSeverity = (raw.severity || raw.impact || "moderate").toLowerCase();
  const severity = severityMap[rawSeverity] || "moderate";

  // Determine task type and fix type from API
  // API now returns type: "auto" | "quickfix" | "manual"
  let taskType: "auto" | "manual" = "manual";
  let fixType: "auto" | "quickfix" | "manual" | undefined = undefined;
  
  if (raw.type === "auto") {
    taskType = "auto";
    fixType = "auto";
  } else if (raw.type === "quickfix") {
    taskType = "manual"; // QuickFix tasks are user-initiated, so type is "manual"
    fixType = "quickfix";
  } else if (raw.type === "manual") {
    taskType = "manual";
    fixType = "manual";
  } else if (raw.isAutoFixable === true) {
    taskType = "auto";
    fixType = "auto";
  } else if (raw.isAutoFixable === false) {
    taskType = "manual";
    // fixType will be determined by frontend hasQuickFixTemplate()
  } else {
    taskType = "manual";
  }

  // Use issueMessage first (new API), fallback to message/description
  const message =
    raw.issueMessage ||
    raw.message ||
    raw.description ||
    raw.test?.title ||
    "Accessibility issue detected";
  const location = raw.location || raw.pointer || raw.filePath;

  // Derive enhanced fields if not provided by API
  const wcagCriteria =
    raw.wcagCriteria || getWcagCriteriaFromCode(code, message);
  const source = raw.source || getSourceFromCode(code);
  const filePath =
    raw.filePath || (location ? location.split(",")[0].trim() : undefined);
  
  // Extract suggestion early so we can pass it to getRemediationFromCode
  const suggestion = raw.suggestion ||
    raw.help ||
    (typeof raw.remediation === "string" ? raw.remediation : undefined);

  // Handle remediation - prefer detailed templates over generic API strings
  let remediation: RemediationTask["remediation"] = undefined;
  const templateRemediation = getRemediationFromCode(code, message, suggestion);

  if (taskType === "manual") {
    if (raw.remediation && typeof raw.remediation === "object") {
      // API returned detailed object - use it
      remediation = raw.remediation;
    } else if (templateRemediation) {
      // We have a detailed template - prefer it over generic API string
      remediation = templateRemediation;
    } else if (raw.remediation && typeof raw.remediation === "string") {
      // No template available, use API string as fallback
      remediation = raw.remediation;
    }
  } else if (raw.remediation) {
    // For auto tasks, use API remediation if provided
    remediation = raw.remediation;
  }

  return {
    id: raw.id || `task-${index}`,
    code,
    severity,
    message,
    location,
    suggestion,
    type: taskType,
    fixType,
    status: (raw.status as TaskStatus) || "pending",
    filePath,
    selector: raw.selector,
    wcagCriteria: wcagCriteria.length > 0 ? wcagCriteria : undefined,
    source,
    html: raw.html,
    element: raw.element,
    context: raw.context,
    snippet: raw.snippet,
    remediation,
  };
}

function groupAndDeduplicateTasks(tasks: RemediationTask[]): RemediationTask[] {
  const grouped = new Map<string, RemediationTask>();

  for (const task of tasks) {
    // Include location/filePath in key to preserve tasks at different locations
    const locationKey = task.location || task.filePath || '';
    const key = `${task.code}-${task.message}-${locationKey}`;
    if (!grouped.has(key)) {
      grouped.set(key, task);
    }
  }

  return Array.from(grouped.values());
}

export const EPUBRemediation: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationState = location.state as LocationState | null;
  const cancelledRef = useRef(false);

  // Check URL for completion status
  const urlStatus = searchParams.get("status");
  const initialPageState: PageState =
    urlStatus === "completed" ? "complete" : "loading";

  console.log("[EPUBRemediation] jobId from URL:", jobId);
  console.log("[EPUBRemediation] urlStatus:", urlStatus);
  console.log("[EPUBRemediation] locationState:", locationState);

  // Get initial filename from multiple sources
  const getInitialFileName = (): string => {
    if (locationState?.fileName) return locationState.fileName;
    if (locationState?.auditResult?.fileName)
      return locationState.auditResult.fileName;
    if (jobId) {
      const cached = localStorage.getItem(`ninja-job-${jobId}-filename`);
      if (cached) return cached;
    }
    return "Loading...";
  };

  const [pageState, setPageState] = useState<PageState>(initialPageState);
  const [plan, setPlan] = useState<PlanViewPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [completedFixes, setCompletedFixes] = useState<FixResult[]>([]);
  const [comparisonSummary, setComparisonSummary] =
    useState<ComparisonSummary | null>(null);
  const [fileName, setFileName] = useState<string>(getInitialFileName());
  // Store API stats to use instead of local calculation
  const [apiStats, setApiStats] = useState<{
    byFixType?: { auto: number; quickfix: number; manual: number };
  } | null>(null);
  // Track total audit issues to show excluded count
  const [totalAuditIssues, setTotalAuditIssues] = useState<number | undefined>(undefined);

  // Batch quick fix state
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<{
    fixType: string;
    fixName: string;
    count: number;
    issues: Array<{
      id: string;
      code: string;
      message: string;
      filePath: string;
      location?: string;
    }>;
  } | null>(null);
  const queryClient = useQueryClient();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const batchModalRef = useRef<HTMLDivElement>(null);

  const handleBatchFixCancel = useCallback(() => {
    setShowBatchPanel(false);
    setSelectedBatch(null);
    const elementToFocus = previousFocusRef.current;
    previousFocusRef.current = null;
    if (elementToFocus?.isConnected) {
      elementToFocus.focus();
    }
  }, []);

  // Keyboard handling for batch modal (Escape to close, Tab focus trap)
  const handleBatchModalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleBatchFixCancel();
    }

    if (e.key === 'Tab' && batchModalRef.current) {
      const focusableElements = batchModalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [handleBatchFixCancel]);

  useEffect(() => {
    if (showBatchPanel) {
      if (!previousFocusRef.current) {
        previousFocusRef.current = document.activeElement as HTMLElement;
      }
      document.addEventListener('keydown', handleBatchModalKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleBatchModalKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [showBatchPanel, handleBatchModalKeyDown]);

  const handleBatchFixComplete = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('[Remediation Page] Batch fix completed, refreshing data');
    }
    setShowBatchPanel(false);
    setSelectedBatch(null);
    const elementToFocus = previousFocusRef.current;
    previousFocusRef.current = null;
    if (elementToFocus?.isConnected) {
      elementToFocus.focus();
    }

    // Refresh the plan data from the API to get updated task statuses
    if (jobId && !isDemo) {
      try {
        const response = await api.get(`/epub/job/${jobId}/remediation`, {
          params: { _t: Date.now() },
        });
        const data = response.data.data || response.data;
        if (data.tasks) {
          const normalizedTasks = data.tasks.map(
            (t: RawAceAssertion, i: number) => normalizeAceTask(t, i)
          );
          const dedupedTasks = groupAndDeduplicateTasks(normalizedTasks);
          setPlan((prev) => prev ? { ...prev, tasks: dedupedTasks } : null);
          console.log('[Batch Fix Complete] Plan refreshed with', dedupedTasks.length, 'tasks');
        }
      } catch (err) {
        console.warn('[Batch Fix Complete] Failed to refresh plan:', err);
      }
    }

    // Also invalidate similar-issues query
    queryClient.invalidateQueries({ queryKey: ['similar-issues', jobId] });
  }, [jobId, isDemo, queryClient]);

  // Fetch similar issues grouping for batch quick fixes
  const { data: similarIssuesFromApi } = useQuery({
    queryKey: ['similar-issues', jobId],
    queryFn: async () => {
      console.log('[Similar Issues] Fetching for job:', jobId);
      const response = await api.get(`/epub/job/${jobId}/remediation/similar-issues`);
      console.log('[Similar Issues] Response:', response.data);
      return response.data;
    },
    enabled: !!jobId && pageState === 'ready',
    retry: 1
  });

  // Client-side fallback: group issues by code when API doesn't return data
  const similarIssues = useMemo(() => {
    if (similarIssuesFromApi?.hasBatchableIssues) {
      return similarIssuesFromApi;
    }

    if (!plan?.tasks) return null;

    // Use same logic as getEffectiveFixType to detect quickfix tasks
    const getEffectiveFixTypeLocal = (t: PlanViewPlan['tasks'][0]) =>
      t.fixType || (t.type === 'auto' ? 'auto' : hasQuickFixTemplate(t.code) ? 'quickfix' : 'manual');

    const quickfixTasks = plan.tasks.filter(
      t => getEffectiveFixTypeLocal(t) === 'quickfix' && t.status === 'pending'
    );

    const groupedByCode: Record<string, typeof quickfixTasks> = {};
    quickfixTasks.forEach(task => {
      const code = task.code || 'unknown';
      if (!groupedByCode[code]) {
        groupedByCode[code] = [];
      }
      groupedByCode[code].push(task);
    });

    const batchableGroups = Object.entries(groupedByCode)
      .filter(([, tasks]) => tasks.length >= 2)
      .map(([code, tasks]) => ({
        fixType: code,
        fixName: tasks[0]?.message || `Fix ${code}`,
        count: tasks.length,
        issues: tasks.map(t => ({
          id: t.id,
          code: t.code || code,
          message: t.message,
          filePath: t.filePath || '',
          location: t.location
        }))
      }));

    if (batchableGroups.length === 0) return null;

    return {
      hasBatchableIssues: true,
      batchableGroups
    };
  }, [similarIssuesFromApi, plan?.tasks]);

  // Persist filename to localStorage when it changes
  useEffect(() => {
    if (fileName && fileName !== "Loading..." && jobId) {
      localStorage.setItem(`ninja-job-${jobId}-filename`, fileName);
    }
  }, [fileName, jobId]);

  // Fetch filename and total audit issues from API
  useEffect(() => {
    const fetchAuditInfo = async () => {
      if (!jobId) return;
      
      try {
        const auditResponse = await api.get(
          `/epub/job/${jobId}/audit/result`,
        );
        const auditData = auditResponse.data?.data || auditResponse.data;
        
        // Set total audit issues count
        const issuesCount = auditData?.summary?.total 
          ?? auditData?.combinedIssues?.length 
          ?? auditData?.issuesSummary?.total
          ?? auditData?.issues?.length;
        if (issuesCount !== undefined) {
          setTotalAuditIssues(issuesCount);
        }
        
        // Set filename if still loading
        if (fileName === "Loading..." && auditData?.fileName) {
          setFileName(auditData.fileName);
          return;
        }
      } catch {
        // Try job endpoint for filename
      }
      
      if (fileName === "Loading...") {
        try {
          const jobResponse = await api.get(`/jobs/${jobId}`);
          const jobData = jobResponse.data?.data || jobResponse.data;
          const fetchedName = jobData?.input?.fileName || jobData?.fileName;
          if (fetchedName) {
            setFileName(fetchedName);
            return;
          }
        } catch {
          // Use fallback
        }
        setFileName("document.epub");
      }
    };
    fetchAuditInfo();
  }, [jobId, fileName]);

  // Load comparison summary when returning with status=completed
  useEffect(() => {
    const loadCompletedState = async () => {
      if (urlStatus === "completed" && jobId && !comparisonSummary) {
        try {
          // Use Phase 4 comparison API endpoint which returns counts from RemediationChange table
          const response = await api.get(
            `/jobs/${jobId}/comparison`,
          );
          const data = response.data.data || response.data;
          setComparisonSummary({
            fixedCount: data.summary?.applied ?? 0,  // Phase 4 API uses "applied" instead of "fixedCount"
            failedCount: data.summary?.failed ?? 0,
            skippedCount: data.summary?.skipped ?? 0,
            beforeScore: 45,  // TODO: Calculate from before/after audit results
            afterScore: 85,
          });
        } catch {
          // Use defaults if API fails
          setComparisonSummary({
            fixedCount: 0,
            failedCount: 0,
            skippedCount: 0,
            beforeScore: 45,
            afterScore: 85,
          });
        }
      }
    };
    loadCompletedState();
  }, [urlStatus, jobId, comparisonSummary]);

  useEffect(() => {
    const loadRemediationPlan = async () => {
      if (!jobId) {
        setError("No job ID provided");
        setPageState("error");
        return;
      }

      const isDemoJob = jobId.startsWith("demo-");
      const isReturningCompleted = urlStatus === "completed";
      console.log(
        "[EPUBRemediation] isDemoJob:",
        isDemoJob,
        "isReturningCompleted:",
        isReturningCompleted,
      );

      // Always fetch from API to get correct task types and stats
      // locationState.autoFixableIssues is deprecated - API provides accurate three-tier classification
      try {
        const response = await api.get(`/epub/job/${jobId}/remediation`);
        const data = response.data.data || response.data;

        if (data.tasks && data.tasks.length > 0) {
          const apiFileName = data.epubFileName || data.fileName;
          if (apiFileName && fileName === "Loading...")
            setFileName(apiFileName);

          // Store API stats if available
          if (data.stats?.byFixType) {
            console.log("[EPUBRemediation] Using API stats.byFixType:", data.stats.byFixType);
            setApiStats({ byFixType: data.stats.byFixType });
          }

          const normalizedTasks = data.tasks.map(
            (t: RawAceAssertion, i: number) => {
              const normalized = normalizeAceTask(t, i);
              // Only mark auto tasks as completed when returning, preserve manual task status
              if (
                isReturningCompleted &&
                normalized.type === "auto" &&
                normalized.status === "pending"
              ) {
                return { ...normalized, status: "completed" as TaskStatus };
              }
              return normalized;
            },
          );
          const dedupedTasks = groupAndDeduplicateTasks(normalizedTasks);
          console.log(
            "[EPUBRemediation] Normalized tasks:",
            normalizedTasks.length,
            "-> Deduped:",
            dedupedTasks.length,
          );

          setPlan({
            jobId: data.jobId || jobId,
            epubFileName:
              apiFileName ||
              (fileName !== "Loading..." ? fileName : "document.epub"),
            tasks: dedupedTasks,
          });
          if (!isReturningCompleted) setPageState("ready");
          setIsDemo(false);
          return;
        }

        if (data.issues && data.issues.length > 0) {
          const apiFileName = data.epubFileName || data.fileName;
          if (apiFileName && fileName === "Loading...")
            setFileName(apiFileName);

          // Store API stats if available
          if (data.stats?.byFixType) {
            console.log("[EPUBRemediation] Using API stats.byFixType from issues:", data.stats.byFixType);
            setApiStats({ byFixType: data.stats.byFixType });
          }

          const normalizedTasks = data.issues.map(
            (issue: RawAceAssertion, i: number) => {
              const normalized = normalizeAceTask(issue, i);
              // Only mark auto tasks as completed when returning, preserve manual task status
              if (
                isReturningCompleted &&
                normalized.type === "auto" &&
                normalized.status === "pending"
              ) {
                return { ...normalized, status: "completed" as TaskStatus };
              }
              return normalized;
            },
          );
          const dedupedTasks = groupAndDeduplicateTasks(normalizedTasks);
          console.log(
            "[EPUBRemediation] Normalized issues:",
            normalizedTasks.length,
            "-> Deduped:",
            dedupedTasks.length,
          );

          setPlan({
            jobId: data.jobId || jobId,
            epubFileName:
              apiFileName ||
              (fileName !== "Loading..." ? fileName : "document.epub"),
            tasks: dedupedTasks,
          });
          if (!isReturningCompleted) setPageState("ready");
          setIsDemo(false);
          return;
        }
      } catch {
        if (!isDemoJob && !isReturningCompleted) {
          setError(
            "Unable to load remediation plan. The backend service is temporarily unavailable.",
          );
          setPageState("error");
          return;
        }
      }

      if (isDemoJob || isReturningCompleted) {
        const demoFileName =
          fileName !== "Loading..." ? fileName : "sample-book.epub";
        const demoPlan: PlanViewPlan = {
          jobId: jobId,
          epubFileName: demoFileName,
          tasks: [
            {
              id: "1",
              code: "EPUB-META-002",
              severity: "moderate",
              message:
                "Publications must declare the schema:accessibilityFeature metadata property in the Package Document",
              type: "auto",
              status: isReturningCompleted ? "completed" : "pending",
              suggestion:
                "Add schema:accessibilityFeature metadata to package OPF",
              source: "ACE",
              wcagCriteria: ["1.3.1", "4.1.2"],
            },
            {
              id: "2",
              code: "EPUB-META-003",
              severity: "minor",
              message:
                "Publications should declare the schema:accessMode metadata property in the Package Document",
              type: "auto",
              status: isReturningCompleted ? "completed" : "pending",
              suggestion:
                "Add schema:accessMode metadata (textual, visual, auditory)",
              source: "ACE",
              wcagCriteria: ["1.1.1"],
            },
            {
              id: "3",
              code: "EPUB-META-004",
              severity: "minor",
              message:
                "Publications should declare the schema:accessibilityHazard metadata property",
              type: "auto",
              status: isReturningCompleted ? "completed" : "pending",
              suggestion:
                "Add schema:accessibilityHazard metadata (none, flashing, motion, sound)",
              source: "ACE",
              wcagCriteria: ["2.3.1"],
            },
            {
              id: "4",
              code: "EPUB-META-005",
              severity: "minor",
              message:
                "Publications should declare the schema:accessibilitySummary metadata property",
              type: "auto",
              status: isReturningCompleted ? "completed" : "pending",
              suggestion: "Add a human-readable accessibility summary",
              source: "ACE",
            },
            {
              id: "5",
              code: "EPUB-NAV-001",
              severity: "moderate",
              message:
                "The navigation document should include landmark navigation with epub:type attributes",
              type: "auto",
              status: isReturningCompleted ? "completed" : "pending",
              suggestion:
                "Add epub:type landmarks (toc, bodymatter, backmatter) to nav",
              source: "ACE",
              wcagCriteria: ["2.4.1", "2.4.5"],
            },
            {
              id: "6",
              code: "EPUB-IMG-001",
              severity: "serious",
              message:
                "Image element is missing required alt attribute for accessibility",
              type: "manual",
              status: "pending",
              location: "content/chapter1.xhtml, line 42",
              suggestion:
                "Add descriptive alt text that conveys the image content",
              source: "ACE",
              wcagCriteria: ["1.1.1"],
              filePath: "OEBPS/content/chapter1.xhtml",
              selector: 'img[src="images/figure1.jpg"]',
              remediation: {
                title: "How to add alt text",
                steps: [
                  "Open the XHTML file in your EPUB editor",
                  "Locate the <img> element at line 42",
                  "Add an alt attribute with descriptive text",
                  "Describe what the image conveys, not just what it shows",
                ],
                resources: [
                  {
                    label: "Alt Text Guide",
                    url: "https://www.w3.org/WAI/tutorials/images/",
                  },
                  {
                    label: "WCAG 1.1.1",
                    url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content",
                  },
                ],
              },
            },
          ],
        };
        setPlan(demoPlan);
        if (!isReturningCompleted) setPageState("ready");
        setIsDemo(isDemoJob);
      }
    };

    loadRemediationPlan();
  }, [jobId, locationState, urlStatus, fileName]);

  const handleRunAutoRemediation = async () => {
    if (!plan) return;

    cancelledRef.current = false;
    setPageState("running");
    setCompletedFixes([]);

    const autoTasks = plan.tasks.filter(
      (t) => t.type === "auto" && t.status === "pending",
    );
    const totalAutoTasks = autoTasks.length;

    if (!isDemo) {
      try {
        await api.post(`/epub/job/${jobId}/auto-remediate`);
      } catch {
        // Continue with demo simulation
      }
    }

    const localFixes: FixResult[] = [];
    let currentTaskId: string | null = null;

    for (const task of autoTasks) {
      if (cancelledRef.current) {
        if (currentTaskId) {
          setPlan((prev) =>
            prev
              ? {
                  ...prev,
                  tasks: prev.tasks.map((t) =>
                    t.id === currentTaskId
                      ? { ...t, status: "pending" as TaskStatus }
                      : t,
                  ),
                }
              : null,
          );
        }
        break;
      }

      currentTaskId = task.id;
      setCurrentTask(task.message);

      setPlan((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === task.id
                  ? { ...t, status: "in_progress" as TaskStatus }
                  : t,
              ),
            }
          : null,
      );

      await new Promise((resolve) => setTimeout(resolve, 600));

      if (cancelledRef.current) {
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === task.id
                    ? { ...t, status: "pending" as TaskStatus }
                    : t,
                ),
              }
            : null,
        );
        break;
      }

      const success = Math.random() > 0.1;
      const newStatus: TaskStatus = success ? "completed" : "failed";

      setPlan((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === task.id ? { ...t, status: newStatus } : t,
              ),
            }
          : null,
      );

      const fixResult = {
        taskId: task.id,
        code: task.code,
        message: task.message,
        success,
      };
      localFixes.push(fixResult);
      setCompletedFixes([...localFixes]);
      currentTaskId = null;
    }

    setCurrentTask(null);

    if (cancelledRef.current) {
      setPageState("ready");
      return;
    }

    const successCount = localFixes.filter((f) => f.success).length;
    const failCount = localFixes.filter((f) => !f.success).length;

    try {
      const response = await api.get(`/epub/job/${jobId}/comparison/summary`);
      const data = response.data.data || response.data;
      setComparisonSummary({
        fixedCount: data.fixedCount ?? successCount,
        failedCount: data.failedCount ?? failCount,
        skippedCount: data.skippedCount ?? totalAutoTasks - localFixes.length,
        beforeScore: data.beforeScore ?? 45,
        afterScore: data.afterScore ?? Math.min(95, 45 + successCount * 10),
      });
    } catch {
      setComparisonSummary({
        fixedCount: successCount,
        failedCount: failCount,
        skippedCount: totalAutoTasks - localFixes.length,
        beforeScore: 45,
        afterScore: Math.min(95, 45 + successCount * 10),
      });
    }

    setPageState("complete");
    // Update URL to persist completion state
    setSearchParams({ status: "completed" }, { replace: true });
  };

  const handleCancelRemediation = () => {
    cancelledRef.current = true;
    setCurrentTask(null);
  };

  const handleMarkTaskFixed = async (taskId: string, notes?: string) => {
    if (!plan) return;

    if (!isDemo && jobId) {
      try {
        await api.post(`/epub/job/${jobId}/task/${taskId}/mark-fixed`, {
          notes,
        });
      } catch {
        // Continue with local update even if API fails
      }
    }

    setPlan((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "completed" as TaskStatus,
                    notes,
                    completionMethod: "manual" as const,
                  }
                : t,
            ),
          }
        : null,
    );
  };

  const handleSkipTask = async (taskId: string, reason?: string) => {
    if (!plan) return;

    if (!isDemo && jobId) {
      try {
        await api.post(`/epub/job/${jobId}/task/${taskId}/skip`, {
          reason,
        });
      } catch {
        // Continue with local update even if API fails
      }
    }

    setPlan((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "skipped" as TaskStatus,
                    notes: reason,
                  }
                : t,
            ),
          }
        : null,
    );
  };

  const handleRefreshPlan = async () => {
    console.log('handleRefreshPlan - forcing fresh data fetch');
    if (!jobId || isDemo) return;
    try {
      const response = await api.get(`/epub/job/${jobId}/remediation`, {
        params: {
          _t: Date.now(),
        },
      });
      const data = response.data.data || response.data;
      if (data.tasks) {
        const normalizedTasks = data.tasks.map(
          (t: RawAceAssertion, i: number) => normalizeAceTask(t, i)
        );
        const dedupedTasks = groupAndDeduplicateTasks(normalizedTasks);
        setPlan((prev) => prev ? { ...prev, tasks: dedupedTasks } : null);
        console.log('Plan refreshed with', dedupedTasks.length, 'tasks');
      }
    } catch (err) {
      console.warn('Failed to refresh plan:', err);
    }
  };

  const handleViewComparison = () => {
    const comparisonData = {
      epubFileName: plan?.epubFileName || fileName || "document.epub",
      fileName:
        fileName !== "Loading..."
          ? fileName
          : plan?.epubFileName || "document.epub",
      fixedCount:
        plan?.tasks.filter((t) => t.status === "completed").length || 0,
      failedCount: plan?.tasks.filter((t) => t.status === "failed").length || 0,
      skippedCount:
        plan?.tasks.filter((t) => t.status === "skipped").length || 0,
      beforeScore: comparisonSummary?.beforeScore || 45,
      afterScore: comparisonSummary?.afterScore || 85,
    };
    navigate(`/epub/compare/${jobId}`, { state: comparisonData });
  };

  const handleReauditComplete = (result: ReauditResult) => {
    if (!plan) return;

    const resolvedCodes = new Set(result.resolvedIssueCodes || []);

    const updatedTasks = plan.tasks.map((task) => {
      if (
        task.type === "manual" &&
        task.status === "pending" &&
        resolvedCodes.has(task.code)
      ) {
        return {
          ...task,
          status: "completed" as TaskStatus,
          completionMethod: "manual" as const,
        };
      }
      return task;
    });

    setPlan({ ...plan, tasks: updatedTasks });

    setComparisonSummary((prev) => ({
      fixedCount: (prev?.fixedCount || 0) + result.resolved,
      failedCount: prev?.failedCount || 0,
      skippedCount: prev?.skippedCount || 0,
      beforeScore: prev?.beforeScore || 0,
      afterScore: result.score || prev?.afterScore || 0,
    }));
  };

  if (pageState === "loading" || (pageState === "complete" && !plan)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">
            Loading remediation plan...
          </span>
        </div>
      </div>
    );
  }

  if (pageState === "error" || !plan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="error">
          {error || "Failed to load remediation plan"}
        </Alert>
        <Button className="mt-4" onClick={() => navigate("/epub")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to EPUB Accessibility
        </Button>
      </div>
    );
  }

  // Use actual change counts from database when available (more accurate than task counts)
  // Task counts may not reflect additional fixes discovered during remediation
  const fixedCount = comparisonSummary?.fixedCount ?? plan.tasks.filter((t) => t.status === "completed").length;
  const failedCount = comparisonSummary?.failedCount ?? plan.tasks.filter((t) => t.status === "failed").length;
  const skippedCount = comparisonSummary?.skippedCount ?? plan.tasks.filter((t) => t.status === "skipped").length;
  const pendingCount = plan.tasks.filter((t) => t.status === "pending").length;
  const pendingManualCount = plan.tasks.filter(
    (t) => t.type === "manual" && t.status === "pending",
  ).length;

  // Use API stats if available, otherwise calculate from tasks (fallback for backward compatibility)
  const getEffectiveFixType = (t: PlanViewPlan['tasks'][0]) =>
    t.fixType || (t.type === 'auto' ? 'auto' : hasQuickFixTemplate(t.code) ? 'quickfix' : 'manual');

  // Prefer API stats.byFixType over local calculation
  const autoTasksCount = apiStats?.byFixType?.auto ?? 
    plan.tasks.filter((t) => getEffectiveFixType(t) === "auto").length;
  const quickFixTasksCount = apiStats?.byFixType?.quickfix ?? 
    plan.tasks.filter((t) => getEffectiveFixType(t) === "quickfix").length;
  const manualTasksCount = apiStats?.byFixType?.manual ?? 
    plan.tasks.filter((t) => getEffectiveFixType(t) === "manual").length;

  const bySourceCounts = {
    epubCheck: plan.tasks.filter(t => (t.source ?? '').toLowerCase() === 'epubcheck').length,
    ace: plan.tasks.filter(t => (t.source ?? '').toLowerCase() === 'ace').length,
    jsAuditor: plan.tasks.filter(t => {
      const source = (t.source ?? '').toLowerCase();
      return source === 'js-auditor' || source === 'jsauditor' || source === 'js_auditor';
    }).length,
  };

  const tallyData: TallyData = {
    audit: {
      total: plan.tasks.length,
      bySource: bySourceCounts,
      bySeverity: {
        critical: plan.tasks.filter((t) => t.severity === "critical").length,
        serious: plan.tasks.filter((t) => t.severity === "serious").length,
        moderate: plan.tasks.filter((t) => t.severity === "moderate").length,
        minor: plan.tasks.filter((t) => t.severity === "minor").length,
      },
    },
    plan: {
      total: plan.tasks.length,
      bySource: bySourceCounts,
      byClassification: {
        autoFixable: autoTasksCount,
        quickFix: quickFixTasksCount,
        manual: manualTasksCount,
      },
    },
    validation: {
      isValid: true,
      errors: [],
      discrepancies: [],
    },
  };

  const completionStats: CompletionStats = {
    fixed: fixedCount,
    failed: failedCount,
    skipped: skippedCount,
    pending: pendingCount,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "EPUB Accessibility", path: "/epub" },
          { label: "Remediation" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/epub")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary-600" />
            EPUB Remediation
          </h1>
          <p className="text-gray-600 mt-1">
            Fix accessibility issues in your EPUB file
          </p>
        </div>
        {isDemo && <Badge variant="warning">Demo Mode</Badge>}
      </div>

      {isDemo && (
        <Alert variant="info">
          Backend unavailable - showing demo remediation workflow
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {pageState === "complete" && comparisonSummary && (
        <>
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">
                Remediation Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {fixedCount}
                  </p>
                  <p className="text-xs text-gray-600">Issues Fixed</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {failedCount}
                  </p>
                  <p className="text-xs text-gray-600">Failed</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {comparisonSummary.beforeScore}% →{" "}
                    {comparisonSummary.afterScore}%
                  </p>
                  <p className="text-xs text-gray-600">Score Improvement</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleViewComparison}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Comparison
                </Button>
                <Button onClick={() => navigate(`/remediation/${jobId}/comparison`)} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Review Changes
                </Button>
                <Button onClick={() => navigate("/epub")} variant="ghost">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start New Audit
                </Button>
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-green-200">
                <span className="text-sm text-green-700">
                  Was this remediation helpful?
                </span>
                <QuickRating entityType="remediation" entityId={jobId || ""} />
              </div>
            </CardContent>
          </Card>

          <EPUBExportOptions
            jobId={jobId || ""}
            epubFileName={plan?.epubFileName || "remediated.epub"}
            isDemo={isDemo}
            fixedCount={fixedCount}
            beforeScore={comparisonSummary.beforeScore}
            afterScore={comparisonSummary.afterScore}
          />
        </>
      )}

      <IssueTallyTracker
        tally={tallyData}
        completionStats={completionStats}
      />

      {/* Batch Quick Fix Section */}
      {similarIssues?.hasBatchableIssues && pageState === 'ready' && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Zap size={20} />
              Batch Quick Fixes Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-4">
              You have multiple similar issues that can be fixed together:
            </p>

            <div className="space-y-2">
              {similarIssues.batchableGroups.map((group: {
                fixType: string;
                fixName: string;
                count: number;
                issues: Array<{
                  id: string;
                  code: string;
                  message: string;
                  filePath: string;
                  location?: string;
                }>;
              }) => (
                <button
                  key={group.fixType}
                  onClick={(e) => {
                    previousFocusRef.current = e.currentTarget;
                    setSelectedBatch(group);
                    setShowBatchPanel(true);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white border border-green-300 rounded hover:bg-green-50 text-left"
                >
                  <div>
                    <div className="font-medium text-gray-900">{group.fixName}</div>
                    <div className="text-sm text-gray-600">
                      {group.count} similar {group.count === 1 ? 'issue' : 'issues'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Zap size={16} />
                    <span className="text-sm font-medium">Apply All</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RemediationPlanView
        plan={plan}
        isRunningRemediation={pageState === "running"}
        currentTask={currentTask}
        completedFixes={completedFixes}
        totalAuditIssues={totalAuditIssues}
        onRunAutoRemediation={handleRunAutoRemediation}
        onCancelRemediation={handleCancelRemediation}
        onMarkTaskFixed={handleMarkTaskFixed}
        onSkipTask={handleSkipTask}
        onRefreshPlan={handleRefreshPlan}
      />

      {pageState === "complete" && (
        <>
          <ReAuditSection
            jobId={jobId || "demo"}
            pendingCount={pendingManualCount}
            onReauditComplete={handleReauditComplete}
            isDemo={isDemo}
          />

          <TransferToAcrButton
            jobId={jobId || "demo"}
            pendingCount={pendingManualCount}
            isDemo={isDemo}
            fileName={fileName !== "Loading..." ? fileName : undefined}
          />
        </>
      )}

      {/* Batch Quick Fix Modal */}
      {showBatchPanel && selectedBatch && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleBatchFixCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-fix-title"
          tabIndex={-1}
        >
          <div 
            ref={batchModalRef}
            className="max-w-2xl w-full"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <BatchQuickFixPanel
              jobId={jobId || ''}
              fixType={selectedBatch.fixType}
              fixName={selectedBatch.fixName}
              epubFileName={fileName}
              issues={selectedBatch.issues}
              onComplete={handleBatchFixComplete}
              onCancel={handleBatchFixCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};
