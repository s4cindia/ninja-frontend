import wcagDocsData from '@/data/wcag-documentation.json';

export interface WcagTechnique {
  id: string;
  title: string;
  type: 'sufficient' | 'advisory' | 'failure';
}

export interface WcagExample {
  title: string;
  description: string;
}

export interface WcagResource {
  title: string;
  url: string;
}

export interface WcagHowToMeet {
  url: string;
  techniques: WcagTechnique[];
  epubSpecific: string[];
}

export interface WcagUnderstanding {
  url: string;
  examples: WcagExample[];
  resources: WcagResource[];
}

export interface WcagTestingProcedure {
  automated: string[];
  manual: string[];
  tools: string[];
}

export interface WcagRemediationGuidance {
  before: string;
  after: string;
  explanation: string;
}

export interface WcagDocumentation {
  criterionId: string;
  number: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  wcagUrl: string;
  shortDescription: string;
  intent: string;
  benefits: string[];
  howToMeet: WcagHowToMeet;
  understanding: WcagUnderstanding;
  testingProcedure: WcagTestingProcedure;
  remediationGuidance: WcagRemediationGuidance;
  applicableToEpub: boolean;
  applicableToPdf: boolean;
  commonIssues: string[];
}

interface WcagDocsData {
  criteriaDocumentation: WcagDocumentation[];
}

class WcagDocumentationService {
  private docsMap: Map<string, WcagDocumentation>;

  constructor() {
    this.docsMap = new Map();
    const data = wcagDocsData as WcagDocsData;

    data.criteriaDocumentation.forEach((doc) => {
      this.docsMap.set(doc.criterionId, doc);
    });

    data.criteriaDocumentation.forEach((doc) => {
      this.docsMap.set(doc.number, doc);
    });
  }

  getDocumentation(criterionId: string): WcagDocumentation | null {
    let doc = this.docsMap.get(criterionId);
    if (doc) return doc;

    const withoutLevel = criterionId.replace(/-[A]{1,3}$/, '');
    doc = this.docsMap.get(withoutLevel);
    if (doc) return doc;

    return null;
  }

  getEpubApplicable(): WcagDocumentation[] {
    return Array.from(this.docsMap.values())
      .filter(doc => doc.applicableToEpub)
      .filter((doc, index, self) =>
        index === self.findIndex(d => d.criterionId === doc.criterionId)
      );
  }

  getAllDocumentation(): WcagDocumentation[] {
    return Array.from(this.docsMap.values())
      .filter((doc, index, self) =>
        index === self.findIndex(d => d.criterionId === doc.criterionId)
      );
  }
}

export const wcagDocumentationService = new WcagDocumentationService();
