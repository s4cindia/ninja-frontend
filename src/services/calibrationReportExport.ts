// Builds a Calibration Analytics Word (.docx) report from the same data
// the Analytics tab renders. Pure function — no DOM, no async work — so
// it can be unit-tested without a browser. The caller supplies optional
// chart PNGs captured via html2canvas if it wants charts embedded.
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  PageBreak,
  ShadingType,
  BorderStyle,
} from 'docx';
import type {
  PhaseGateStatus,
  MAPSnapshot,
} from './metrics.service';
import type { CorpusStats } from './calibration.service';

export interface CalibrationReportInput {
  phaseGate: PhaseGateStatus;
  bestRun: MAPSnapshot | undefined;          // selected by C1 logic
  mAPHistory: MAPSnapshot[];                  // for trends + count
  agreementRows: AgreementRow[];              // computed by caller
  corpusStats: CorpusStats;
  /** PNG ArrayBuffer of the Tool Agreement chart section. Optional — text-only fallback when absent. */
  agreementChartPng?: ArrayBuffer;
  /** PNG ArrayBuffer of the Documents-by-Publisher chart. Optional. */
  publisherChartPng?: ArrayBuffer;
  generatedAt?: Date;                         // defaults to now
}

export interface AgreementRow {
  date: string;
  agreementRate: number;
  runId: string;
}

const STATUS_COLOUR: Record<string, string> = {
  GREEN: '2E7D32',
  AMBER: 'F9A825',
  RED: 'C62828',
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  paragraph: 'Body Text',
  'section-header': 'Heading',
  table: 'Table',
  figure: 'Figure / Image',
  caption: 'Caption',
  footnote: 'Footnote',
  header: 'Page Header',
  footer: 'Page Footer',
};

const PHASE2_TARGET_MAP = 0.75;

// ─── Executive summary derivation ─────────────────────────────────────

export interface ExecutiveSummary {
  overallStatus: 'GREEN' | 'AMBER' | 'RED';
  headline: string;
  bullets: string[];
  nextActions: string[];
}

export function deriveExecutiveSummary(
  input: Pick<CalibrationReportInput, 'phaseGate' | 'bestRun' | 'mAPHistory' | 'corpusStats'>,
): ExecutiveSummary {
  const { phaseGate, bestRun, mAPHistory, corpusStats } = input;

  const redCriteria = phaseGate.criteria.filter((c) => c.status === 'RED');
  const amberCriteria = phaseGate.criteria.filter((c) => c.status === 'AMBER');
  const greenCount = phaseGate.criteria.filter((c) => c.status === 'GREEN').length;

  const headline = phaseGate.readyForPhase2
    ? 'All Phase-1 exit criteria are met. The corpus is ready to advance to Phase 2.'
    : redCriteria.length > 0
      ? `Phase-1 readiness is RED, blocked by ${redCriteria.length} criteria below target.`
      : `Phase-1 readiness is AMBER, with ${greenCount} of 5 criteria GREEN and ${amberCriteria.length} pending.`;

  const bestMapPct = bestRun ? `${(bestRun.overallMAP * 100).toFixed(1)}%` : 'not yet computed';
  const avgAgreementPct = `${(corpusStats.averageAgreementRate * 100).toFixed(1)}%`;

  const bullets: string[] = [
    `Corpus: ${corpusStats.totalDocuments} documents, ${corpusStats.totalConfirmedZones.toLocaleString()} operator-verified zones, ${corpusStats.totalRuns} calibration runs to date.`,
    `Best detection accuracy (mAP): ${bestMapPct} from ${mAPHistory.length} scored run${mAPHistory.length === 1 ? '' : 's'}. Phase-2 target ${(PHASE2_TARGET_MAP * 100).toFixed(0)}%.`,
    `Average tool-agreement rate (Docling ↔ pdfxt): ${avgAgreementPct}.`,
    `Phase-1 criteria: ${greenCount} GREEN, ${amberCriteria.length} AMBER, ${redCriteria.length} RED.`,
  ];

  const nextActions: string[] = [];
  for (const c of redCriteria) nextActions.push(`Resolve ${c.label}: ${c.currentValue} vs target ${c.threshold}.`);
  for (const c of amberCriteria) nextActions.push(`Address ${c.label}: ${c.currentValue}.`);
  if (nextActions.length === 0 && !phaseGate.readyForPhase2) {
    nextActions.push('Re-run latest calibration to refresh metrics; investigate per-class AP gaps.');
  }
  if (phaseGate.readyForPhase2) {
    nextActions.push('Begin Phase 2 planning.');
  }

  return { overallStatus: phaseGate.overallStatus, headline, bullets, nextActions };
}

// ─── docx helpers ─────────────────────────────────────────────────────

function makeTitle(text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 280, after: 140 } });
}

function makeText(text: string, opts: { bold?: boolean; italic?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size })],
    spacing: { after: 100 },
  });
}

function statusCell(status: 'GREEN' | 'AMBER' | 'RED'): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: status, bold: true, color: STATUS_COLOUR[status] ?? '424242' })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: status === 'GREEN' ? 'E8F5E9' : status === 'AMBER' ? 'FFF8E1' : 'FFEBEE' },
  });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })] })],
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '37474F' },
  });
}

function dataCell(text: string, opts: { alignRight?: boolean; bold?: boolean } = {}): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold })],
        alignment: opts.alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
      }),
    ],
  });
}

function tableBordersHairline() {
  return {
    top:    { style: BorderStyle.SINGLE, size: 4, color: 'B0BEC5' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B0BEC5' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: 'B0BEC5' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: 'B0BEC5' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CFD8DC' },
    insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'CFD8DC' },
  };
}

// ─── Section builders ─────────────────────────────────────────────────

function buildTitle(generatedAt: Date): Paragraph[] {
  const dateStr = generatedAt.toISOString().slice(0, 10);
  return [
    new Paragraph({
      children: [new TextRun({ text: 'Calibration Analytics Report', bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: dateStr, size: 22, color: '78909C' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ];
}

function buildExecutiveSummarySection(summary: ExecutiveSummary): Paragraph[] {
  const out: Paragraph[] = [
    makeTitle('Executive Summary', HeadingLevel.HEADING_1),
    new Paragraph({
      children: [
        new TextRun({ text: 'Overall status: ', bold: true }),
        new TextRun({ text: summary.overallStatus, bold: true, color: STATUS_COLOUR[summary.overallStatus] ?? '424242' }),
      ],
      spacing: { after: 100 },
    }),
    makeText(summary.headline),
  ];

  out.push(makeTitle('Key metrics', HeadingLevel.HEADING_3));
  for (const b of summary.bullets) {
    out.push(new Paragraph({ text: b, bullet: { level: 0 }, spacing: { after: 60 } }));
  }

  out.push(makeTitle('Next actions', HeadingLevel.HEADING_3));
  for (const a of summary.nextActions) {
    out.push(new Paragraph({ text: a, bullet: { level: 0 }, spacing: { after: 60 } }));
  }
  return out;
}

function buildPhaseGateSection(phaseGate: PhaseGateStatus): (Paragraph | Table)[] {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Criterion'),
      headerCell('Current Value'),
      headerCell('Target'),
      headerCell('Status'),
    ],
  });
  const dataRows = phaseGate.criteria.map(
    (c) =>
      new TableRow({
        children: [
          dataCell(c.label, { bold: true }),
          dataCell(c.currentValue),
          dataCell(c.threshold, { alignRight: true }),
          statusCell(c.status),
        ],
      }),
  );
  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBordersHairline(),
  });

  return [
    makeTitle('Phase 1 Exit Criteria', HeadingLevel.HEADING_1),
    makeText('All 5 criteria must be GREEN to advance to Phase 2.', { italic: true }),
    table,
  ];
}

function buildMapAccuracySection(bestRun: MAPSnapshot | undefined, mAPHistoryLen: number): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [makeTitle('Zone Detection Accuracy', HeadingLevel.HEADING_1)];

  if (!bestRun) {
    out.push(makeText('No mAP snapshots available yet.'));
    return out;
  }

  out.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Best of last ${mAPHistoryLen} runs: `, size: 22 }),
        new TextRun({ text: `${(bestRun.overallMAP * 100).toFixed(1)}%`, bold: true, size: 28, color: bestRun.overallMAP >= 0.75 ? STATUS_COLOUR.GREEN : bestRun.overallMAP >= 0.6 ? STATUS_COLOUR.AMBER : STATUS_COLOUR.RED }),
      ],
      spacing: { after: 160 },
    }),
  );

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Zone Type'),
      headerCell('GT Instances'),
      headerCell('Predictions'),
      headerCell('AP Score'),
      headerCell('Status'),
    ],
  });
  const dataRows = bestRun.perClass.map((c) => {
    const apPct = `${(c.ap * 100).toFixed(1)}%`;
    let statusText: string;
    let statusColor: 'GREEN' | 'AMBER' | 'RED';
    if (c.insufficientData) {
      statusText = 'Insufficient data';
      statusColor = 'AMBER';
    } else if (c.ap >= 0.75) {
      statusText = 'On target';
      statusColor = 'GREEN';
    } else if (c.ap >= 0.6) {
      statusText = 'Near target';
      statusColor = 'AMBER';
    } else {
      statusText = 'Below target';
      statusColor = 'RED';
    }
    return new TableRow({
      children: [
        dataCell(ZONE_TYPE_LABELS[c.zoneType] ?? c.zoneType, { bold: true }),
        dataCell(String(c.groundTruthCount), { alignRight: true }),
        dataCell(String(c.predictionCount), { alignRight: true }),
        dataCell(apPct, { alignRight: true, bold: true }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: statusText, color: STATUS_COLOUR[statusColor] })] })],
        }),
      ],
    });
  });

  out.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBordersHairline() }));
  out.push(makeText('Classes with fewer than 5 ground-truth instances are excluded from the overall mAP calculation.', { italic: true }));
  return out;
}

function buildAgreementSection(rows: AgreementRow[], chartPng: ArrayBuffer | undefined): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [
    makeTitle('Tool Agreement Rate', HeadingLevel.HEADING_1),
    makeText('Percentage of zones where Docling and pdfxt agree (target ≥ 75%).', { italic: true }),
  ];

  if (chartPng) {
    out.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: chartPng,
            transformation: { width: 560, height: 360 },
            type: 'png',
          }),
        ],
        spacing: { after: 120 },
      }),
    );
  }

  if (rows.length === 0) {
    out.push(makeText('No calibration runs scored for agreement.'));
    return out;
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: [headerCell('Date'), headerCell('Agreement Rate'), headerCell('Run ID')],
  });
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: [
          dataCell(r.date),
          dataCell(`${r.agreementRate}%`, { alignRight: true, bold: true }),
          dataCell(r.runId),
        ],
      }),
  );
  out.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBordersHairline() }));
  return out;
}

function buildCorpusCompositionSection(stats: CorpusStats, publisherChartPng: ArrayBuffer | undefined): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [
    makeTitle('Corpus Composition', HeadingLevel.HEADING_1),
    makeText('Breakdown of the calibration corpus by publisher and content type.', { italic: true }),
  ];

  // Stat row
  const statsTable = new Table({
    rows: [
      new TableRow({
        children: [
          headerCell('Total Documents'),
          headerCell('Total Confirmed Zones'),
          headerCell('Avg Agreement Rate'),
        ],
      }),
      new TableRow({
        children: [
          dataCell(String(stats.totalDocuments), { alignRight: false, bold: true }),
          dataCell(stats.totalConfirmedZones.toLocaleString(), { alignRight: false, bold: true }),
          dataCell(`${(stats.averageAgreementRate * 100).toFixed(1)}%`, { alignRight: false, bold: true }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBordersHairline(),
  });
  out.push(statsTable);

  out.push(makeTitle('Documents by Publisher', HeadingLevel.HEADING_3));
  if (publisherChartPng) {
    out.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: publisherChartPng,
            transformation: { width: 560, height: 220 },
            type: 'png',
          }),
        ],
        spacing: { after: 120 },
      }),
    );
  } else {
    const publishers = Object.entries(stats.byPublisher);
    if (publishers.length === 0) {
      out.push(makeText('No publisher data.'));
    } else {
      const headerRow = new TableRow({ tableHeader: true, children: [headerCell('Publisher'), headerCell('Documents')] });
      const dataRows = publishers.map(([name, count]) =>
        new TableRow({ children: [dataCell(name), dataCell(String(count), { alignRight: true, bold: true })] }),
      );
      out.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 60, type: WidthType.PERCENTAGE }, borders: tableBordersHairline() }));
    }
  }

  out.push(makeTitle('Documents by Content Type', HeadingLevel.HEADING_3));
  const contentTypes = Object.entries(stats.byContentType);
  if (contentTypes.length === 0) {
    out.push(makeText('No content type data.'));
  } else {
    const headerRow = new TableRow({ tableHeader: true, children: [headerCell('Content Type'), headerCell('Documents')] });
    const dataRows = contentTypes.map(([type, count]) =>
      new TableRow({ children: [dataCell(type), dataCell(String(count), { alignRight: true, bold: true })] }),
    );
    out.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 60, type: WidthType.PERCENTAGE }, borders: tableBordersHairline() }));
  }

  return out;
}

// ─── Public API ───────────────────────────────────────────────────────

export function buildCalibrationReport(input: CalibrationReportInput): Document {
  const generatedAt = input.generatedAt ?? new Date();
  const summary = deriveExecutiveSummary(input);

  const children: (Paragraph | Table)[] = [
    ...buildTitle(generatedAt),
    ...buildExecutiveSummarySection(summary),
    new Paragraph({ children: [new PageBreak()] }),
    ...buildPhaseGateSection(input.phaseGate),
    ...buildMapAccuracySection(input.bestRun, input.mAPHistory.length),
    ...buildAgreementSection(input.agreementRows, input.agreementChartPng),
    ...buildCorpusCompositionSection(input.corpusStats, input.publisherChartPng),
  ];

  return new Document({
    creator: 'Ninja Calibration Analytics',
    title: 'Calibration Analytics Report',
    sections: [{ properties: {}, children }],
  });
}

/** Convenience helper that builds the doc and packs it to a Blob for download. */
export async function buildCalibrationReportBlob(input: CalibrationReportInput): Promise<Blob> {
  const doc = buildCalibrationReport(input);
  return await Packer.toBlob(doc);
}

/** Suggested filename — caller can override. */
export function defaultReportFilename(generatedAt: Date = new Date()): string {
  const iso = generatedAt.toISOString().slice(0, 10);
  return `calibration-analytics-${iso}.docx`;
}
