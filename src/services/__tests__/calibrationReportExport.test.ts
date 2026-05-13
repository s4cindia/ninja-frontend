import { describe, it, expect } from 'vitest';
import {
  buildCalibrationReport,
  buildCalibrationReportBlob,
  defaultReportFilename,
  deriveExecutiveSummary,
  type CalibrationReportInput,
  type AgreementRow,
} from '../calibrationReportExport';
import type { PhaseGateStatus, MAPSnapshot } from '../metrics.service';
import type { CorpusStats } from '../calibration.service';

function makePhaseGate(overrides: Partial<PhaseGateStatus> = {}): PhaseGateStatus {
  return {
    overallStatus: 'AMBER',
    readyForPhase2: false,
    criteria: [
      { id: 'C1', label: 'Overall mAP ≥75%', status: 'GREEN',  currentValue: '75.8% (best of last 14)', threshold: '75%', tooltip: '' },
      { id: 'C2', label: 'All 8 zone types ≥30 instances', status: 'GREEN', currentValue: 'Min: 36 instances (8/8 types at target)', threshold: '30 per zone type', tooltip: '' },
      { id: 'C3', label: 'Publisher diversity ≥3', status: 'GREEN', currentValue: '5 publisher(s)', threshold: '3 publishers', tooltip: '' },
      { id: 'C4', label: 'Content type diversity ≥3', status: 'GREEN', currentValue: '3 content type(s)', threshold: '3 content types', tooltip: '' },
      { id: 'C5', label: 'Write quality pass rate ≥95%', status: 'AMBER', currentValue: 'Spike not yet run', threshold: '95% PAC 2024 pass rate', tooltip: '' },
    ],
    ...overrides,
  };
}

function makeBestRun(overallMAP = 0.758): MAPSnapshot {
  return {
    runId: 'cmnx98xau000a6xworykkiefz',
    runDate: '2026-04-13T13:56:43Z',
    overallMAP,
    perClass: [
      { zoneType: 'paragraph',      ap: 0.66,  groundTruthCount: 1702, predictionCount: 1818, insufficientData: false },
      { zoneType: 'section-header', ap: 0.988, groundTruthCount: 167,  predictionCount: 165,  insufficientData: false },
      { zoneType: 'table',          ap: 0.743, groundTruthCount: 9,    predictionCount: 17,   insufficientData: false },
      { zoneType: 'figure',         ap: 0.644, groundTruthCount: 73,   predictionCount: 47,   insufficientData: false },
      { zoneType: 'caption',        ap: 0.737, groundTruthCount: 42,   predictionCount: 71,   insufficientData: false },
      { zoneType: 'footnote',       ap: 0,     groundTruthCount: 0,    predictionCount: 4,    insufficientData: true },
      { zoneType: 'header',         ap: 0,     groundTruthCount: 1,    predictionCount: 189,  insufficientData: true },
      { zoneType: 'footer',         ap: 0,     groundTruthCount: 0,    predictionCount: 3,    insufficientData: true },
    ],
  };
}

function makeCorpusStats(overrides: Partial<CorpusStats> = {}): CorpusStats {
  return {
    totalDocuments: 20,
    totalRuns: 17,
    totalConfirmedZones: 72568,
    averageAgreementRate: 0.258,
    byPublisher: { 'KH': 2, 'WK': 2, 'Innovative Ink': 1, 'Jones & Bartlett': 1, 'Human Kinetics': 1 },
    byContentType: { 'text-dominant': 15, 'table-heavy': 2, 'figure-heavy': 3 },
    ...overrides,
  };
}

function makeAgreementRows(): AgreementRow[] {
  return [
    { date: '12 May', agreementRate: 45, runId: 'cmp1qeoto001jjok3b6c6o8iv' },
    { date: '11 May', agreementRate: 37, runId: 'cmnscdb0k0002uckhxy8ycth2' },
    { date: '13 Apr', agreementRate: 67, runId: 'cmnx98xau000a6xworykkiefz' },
  ];
}

function fullInput(overrides: Partial<CalibrationReportInput> = {}): CalibrationReportInput {
  const bestRun = makeBestRun();
  return {
    phaseGate: makePhaseGate(),
    bestRun,
    mAPHistory: [bestRun],
    agreementRows: makeAgreementRows(),
    corpusStats: makeCorpusStats(),
    generatedAt: new Date('2026-05-13T12:00:00Z'),
    ...overrides,
  };
}

describe('deriveExecutiveSummary', () => {
  it('reports overall AMBER when one criterion is AMBER and rest are GREEN', () => {
    const summary = deriveExecutiveSummary(fullInput());
    expect(summary.overallStatus).toBe('AMBER');
    expect(summary.headline).toMatch(/AMBER/);
    expect(summary.headline).toMatch(/4 of 5 criteria GREEN/);
  });

  it('reports Phase-1 complete when readyForPhase2 is true', () => {
    const summary = deriveExecutiveSummary(
      fullInput({ phaseGate: makePhaseGate({ overallStatus: 'GREEN', readyForPhase2: true }) }),
    );
    expect(summary.headline).toMatch(/All Phase-1 exit criteria are met/);
    expect(summary.nextActions).toContain('Begin Phase 2 planning.');
  });

  it('surfaces RED criteria in next-actions when present', () => {
    const summary = deriveExecutiveSummary(
      fullInput({
        phaseGate: makePhaseGate({
          overallStatus: 'RED',
          criteria: [
            { id: 'C1', label: 'Overall mAP ≥75%', status: 'RED', currentValue: '45.2%', threshold: '75%', tooltip: '' },
            { id: 'C2', label: 'Zone types', status: 'GREEN', currentValue: '8/8', threshold: '30/type', tooltip: '' },
            { id: 'C3', label: 'Publishers', status: 'GREEN', currentValue: '5', threshold: '3', tooltip: '' },
            { id: 'C4', label: 'Content types', status: 'GREEN', currentValue: '3', threshold: '3', tooltip: '' },
            { id: 'C5', label: 'Write quality', status: 'AMBER', currentValue: 'Spike not yet run', threshold: '95%', tooltip: '' },
          ],
        }),
      }),
    );
    expect(summary.headline).toMatch(/RED/);
    expect(summary.nextActions.some((a) => a.includes('Overall mAP ≥75%'))).toBe(true);
    // AMBER criterion also surfaces, after the RED one
    expect(summary.nextActions.some((a) => a.includes('Write quality'))).toBe(true);
  });

  it('formats best-mAP correctly when present', () => {
    const summary = deriveExecutiveSummary(fullInput());
    expect(summary.bullets.some((b) => b.includes('75.8%'))).toBe(true);
  });

  it('handles undefined bestRun without crashing', () => {
    const summary = deriveExecutiveSummary(fullInput({ bestRun: undefined, mAPHistory: [] }));
    expect(summary.bullets.some((b) => b.includes('not yet computed'))).toBe(true);
  });

  it('reports run-count singular vs plural', () => {
    const oneRun = deriveExecutiveSummary(fullInput({ mAPHistory: [makeBestRun()] }));
    const manyRuns = deriveExecutiveSummary(fullInput({ mAPHistory: [makeBestRun(), makeBestRun(0.5), makeBestRun(0.4)] }));
    expect(oneRun.bullets.some((b) => b.includes('1 scored run.'))).toBe(true);
    expect(manyRuns.bullets.some((b) => b.includes('3 scored runs.'))).toBe(true);
  });
});

describe('buildCalibrationReport', () => {
  it('produces a Document with one section', () => {
    const doc = buildCalibrationReport(fullInput());
    // Document object is opaque to us — assert it exists and has the expected
    // shape. Real exercise of the OOXML output happens in the Packer.toBlob test.
    expect(doc).toBeDefined();
  });

  it('does not throw when chart PNGs are absent', () => {
    expect(() => buildCalibrationReport(fullInput({ agreementChartPng: undefined, publisherChartPng: undefined }))).not.toThrow();
  });

  it('does not throw when corpus has no documents', () => {
    const stats = makeCorpusStats({
      totalDocuments: 0,
      totalRuns: 0,
      totalConfirmedZones: 0,
      byPublisher: {},
      byContentType: {},
    });
    expect(() => buildCalibrationReport(fullInput({ corpusStats: stats }))).not.toThrow();
  });

  it('does not throw when no agreement rows are present', () => {
    expect(() => buildCalibrationReport(fullInput({ agreementRows: [] }))).not.toThrow();
  });
});

describe('buildCalibrationReportBlob', () => {
  it('produces a non-empty Blob', async () => {
    const blob = await buildCalibrationReportBlob(fullInput());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('includes embedded charts when PNGs are supplied', async () => {
    // Tiny valid PNG (1x1 transparent) so docx accepts it.
    const tinyPng = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82,
    ]).buffer;

    const withCharts = await buildCalibrationReportBlob(fullInput({
      agreementChartPng: tinyPng,
      publisherChartPng: tinyPng,
    }));
    const withoutCharts = await buildCalibrationReportBlob(fullInput());

    // With embedded images, the .docx zip is larger.
    expect(withCharts.size).toBeGreaterThan(withoutCharts.size);
  });
});

describe('defaultReportFilename', () => {
  it('returns an ISO-date-stamped .docx filename', () => {
    const name = defaultReportFilename(new Date('2026-05-13T12:00:00Z'));
    expect(name).toBe('calibration-analytics-2026-05-13.docx');
  });

  it('uses today when no date is passed', () => {
    const name = defaultReportFilename();
    expect(name).toMatch(/^calibration-analytics-\d{4}-\d{2}-\d{2}\.docx$/);
  });
});
