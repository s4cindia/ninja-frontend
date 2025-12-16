export type AcrEditionCode = 'VPAT2.5-508' | 'VPAT2.5-WCAG' | 'VPAT2.5-EU' | 'VPAT2.5-INT';

export interface AcrEdition {
  id: string;
  code: AcrEditionCode;
  name: string;
  description: string;
  criteriaCount: number;
  isRecommended: boolean;
}

export interface EditionDetails extends AcrEdition {
  sections: EditionSection[];
  applicableStandards: string[];
}

export interface EditionSection {
  id: string;
  name: string;
  criteriaCount: number;
}
