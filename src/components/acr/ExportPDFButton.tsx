import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { ACRAnalysisReport } from '@/types/acr-analysis-report.types';

interface ExportPDFButtonProps {
  report: ACRAnalysisReport;
}

export function ExportPDFButton({ report }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 20;

      const line = (h = 6) => { y += h; };
      const addText = (text: string, size = 10, color: [number, number, number] = [30, 30, 30]) => {
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, contentW) as string[];
        doc.text(lines, margin, y);
        y += lines.length * (size * 0.4) + 2;
      };
      const addSection = (title: string) => {
        line(4);
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, y, pageW - margin, y);
        line(4);
        addText(title, 13, [79, 70, 229]);
        line(2);
      };

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageW, 30, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('AI Analysis Report', margin, 13);
      doc.setFontSize(9);
      doc.text(report.metadata.contentTitle, margin, 21);
      doc.text(
        `Generated ${new Date(report.metadata.analysisDate).toLocaleDateString()}  ·  Job ${report.metadata.jobId}`,
        margin, 27
      );

      y = 38;

      // Executive Summary
      addSection('Executive Summary');
      const { executiveSummary: es } = report;
      addText(`Overall Confidence: ${es.overallConfidence}%`, 11, [30, 30, 30]);
      addText(`Total Criteria: ${es.totalCriteria}  |  Automated Passed: ${es.automatedPassed}  |  Manual Required: ${es.manualRequired}  |  N/A: ${es.notApplicable}`);

      if (es.keyFindings.length) {
        line(2);
        addText('Key Findings:', 10, [60, 60, 60]);
        es.keyFindings.forEach(f => addText(`  • ${f.text}`, 9));
      }

      if (es.criticalActions.length) {
        line(2);
        addText('Critical Actions:', 10, [180, 60, 0]);
        es.criticalActions.forEach(a => addText(`  • ${a}`, 9));
      }

      // Statistics
      addSection('Statistics');
      const { statistics: st } = report;
      addText(`Auto-Fixed: ${st.autoFixed}  |  Quick-Fix: ${st.quickFix}  |  Manual: ${st.manual}`);
      addText(`High Confidence: ${st.highConfidenceCount}  |  Medium: ${st.mediumConfidenceCount}  |  Low: ${st.lowConfidenceCount}`);
      line(2);
      (['A', 'AA', 'AAA'] as const).forEach(lvl => {
        const d = st.byWcagLevel[lvl];
        addText(`WCAG Level ${lvl}: ${d.total} total, ${d.passed} passed, ${d.manual} manual, ${d.na} N/A`, 9);
      });

      // Remediation explainability summary
      addSection('Remediation Explainability');
      const { remediationExplainability: rx } = report;

      if (rx.autoFixed.length) {
        addText(`Auto-Fixed (${rx.autoFixed.length})`, 10, [37, 99, 235]);
        rx.autoFixed.slice(0, 10).forEach(item => {
          addText(`  ${item.ruleId}: ${item.description}`, 8);
          addText(`    → ${item.explanation.whatPlatformDid ?? item.explanation.reason}`, 8, [80, 80, 80]);
        });
        if (rx.autoFixed.length > 10) addText(`  … and ${rx.autoFixed.length - 10} more`, 8, [120, 120, 120]);
      }

      if (rx.quickFixes.length) {
        line(2);
        addText(`Quick-Fix Required (${rx.quickFixes.length})`, 10, [180, 120, 0]);
        rx.quickFixes.slice(0, 10).forEach(item => {
          addText(`  ${item.ruleId}: ${item.description}`, 8);
          if (item.explanation.whatUserMustDo) {
            addText(`    → ${item.explanation.whatUserMustDo}`, 8, [80, 80, 80]);
          }
        });
        if (rx.quickFixes.length > 10) addText(`  … and ${rx.quickFixes.length - 10} more`, 8, [120, 120, 120]);
      }

      if (rx.manualRequired.length) {
        line(2);
        addText(`Manual Required (${rx.manualRequired.length})`, 10, [200, 80, 20]);
        rx.manualRequired.slice(0, 10).forEach(item => {
          addText(`  ${item.ruleId}: ${item.description}`, 8);
        });
        if (rx.manualRequired.length > 10) addText(`  … and ${rx.manualRequired.length - 10} more`, 8, [120, 120, 120]);
      }

      // AI Insights
      if (report.aiInsights) {
        addSection('AI Insights');
        const ai = report.aiInsights;
        if (ai.riskAssessment) addText(ai.riskAssessment, 9);
        if (ai.topPriorities.length) {
          addText('Top Priorities:', 9, [60, 60, 60]);
          ai.topPriorities.forEach((p, i) => addText(`  ${i + 1}. ${p}`, 8));
        }
      }

      // Methodology footer
      line(6);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      line(3);
      addText(
        'Methodology: Automated EPUB/PDF accessibility auditing (EPUBCheck, ACE by DAISY, Matterhorn Protocol) combined with AI-assisted conformance analysis. Manual testing is required for criteria marked as "Manual Required".',
        8, [120, 120, 120]
      );

      doc.save(`ACR-Analysis-Report-${report.metadata.jobId}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
    >
      {exporting ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Download size={14} />
      )}
      Export PDF
    </button>
  );
}
