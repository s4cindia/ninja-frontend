import { describe, it, expect } from 'vitest';
import { derivePhases, type DerivePhasesInput } from './pdfPhaseStepper';
import type { RemediationHistoryRun } from '@/types/pdf-remediation.types';

function baseInput(overrides?: Partial<DerivePhasesInput>): DerivePhasesInput {
  return {
    auditResult: { createdAt: '2026-10-01T10:00:00.000Z', completedAt: '2026-10-01T10:02:00.000Z' },
    aiAnalysisStatus: null,
    aiAnalyzedAt: null,
    remediationHistory: [],
    autoModeStatus: undefined,
    remediationCycleActive: false,
    remediationCycleSource: null,
    postRemediationStatus: undefined,
    lastVerifiedAt: null,
    pendingGuidanceCount: 0,
    guidanceAcknowledgment: null,
    acrGenerated: false,
    pacReportGenerated: false,
    ...overrides,
  };
}

function byId(phases: ReturnType<typeof derivePhases>, id: string) {
  return phases.find(p => p.id === id)!;
}

describe('derivePhases', () => {
  it('returns all 5 phases in order: audit, ai-analysis, remediation, verification, compliance', () => {
    const phases = derivePhases(baseInput());
    expect(phases.map(p => p.id)).toEqual(['audit', 'ai-analysis', 'remediation', 'verification', 'compliance']);
  });

  describe('audit phase', () => {
    it('is done with a duration when the audit result has both createdAt and completedAt', () => {
      const phases = derivePhases(baseInput());
      const audit = byId(phases, 'audit');
      expect(audit.status).toBe('done');
      expect(audit.durationMs).toBe(2 * 60 * 1000);
    });

    it('is not-started when there is no audit result at all', () => {
      const phases = derivePhases(baseInput({ auditResult: null }));
      expect(byId(phases, 'audit').status).toBe('not-started');
    });

    it('has no duration when completedAt is missing', () => {
      const phases = derivePhases(baseInput({ auditResult: { createdAt: '2026-10-01T10:00:00.000Z' } }));
      expect(byId(phases, 'audit').durationMs).toBeUndefined();
    });
  });

  describe('ai-analysis phase', () => {
    it('is in-progress while processing', () => {
      const phases = derivePhases(baseInput({ aiAnalysisStatus: 'processing' }));
      expect(byId(phases, 'ai-analysis').status).toBe('in-progress');
    });

    it('is in-progress while pending', () => {
      const phases = derivePhases(baseInput({ aiAnalysisStatus: 'pending' }));
      expect(byId(phases, 'ai-analysis').status).toBe('in-progress');
    });

    it('is not-started when nothing has happened yet', () => {
      const phases = derivePhases(baseInput());
      expect(byId(phases, 'ai-analysis').status).toBe('not-started');
    });

    it('is done once aiAnalysisStatus is complete, and pulls duration from the latest completed ai_analysis history event', () => {
      const history: RemediationHistoryRun[] = [
        {
          cycleNumber: 1,
          events: [
            { action: 'ai_analysis', source: 'analyze_job', status: 'completed', startedAt: '2026-10-01T10:02:00.000Z', completedAt: '2026-10-01T10:05:00.000Z' },
          ],
        },
      ];
      const phases = derivePhases(baseInput({ aiAnalysisStatus: 'complete', remediationHistory: history }));
      const aiAnalysis = byId(phases, 'ai-analysis');
      expect(aiAnalysis.status).toBe('done');
      expect(aiAnalysis.durationMs).toBe(3 * 60 * 1000);
    });

    it('remains done (via aiAnalyzedAt) even once aiAnalysisStatus has moved to processing again for a re-run — regression: step 2 must not regress to in-progress in lockstep with a later re-run', () => {
      const phases = derivePhases(baseInput({ aiAnalysisStatus: 'processing', aiAnalyzedAt: '2026-10-01T10:05:00.000Z' }));
      expect(byId(phases, 'ai-analysis').status).toBe('done');
    });

    it('is done (with a duration) from a completed remediationHistory ai_analysis event ALONE, with no aiAnalysisStatus/aiAnalyzedAt at all -- the PDF Batch item view has no source for either field', () => {
      const history: RemediationHistoryRun[] = [
        {
          cycleNumber: 1,
          events: [
            { action: 'ai_analysis', source: 'auto_loop', status: 'completed', startedAt: '2026-10-01T10:02:00.000Z', completedAt: '2026-10-01T10:05:00.000Z' },
          ],
        },
      ];
      const phases = derivePhases(baseInput({ aiAnalysisStatus: null, aiAnalyzedAt: null, remediationHistory: history }));
      const aiAnalysis = byId(phases, 'ai-analysis');
      expect(aiAnalysis.status).toBe('done');
      expect(aiAnalysis.durationMs).toBe(3 * 60 * 1000);
    });

    it('picks the LATEST of several completed ai_analysis events, not the first', () => {
      const history: RemediationHistoryRun[] = [
        { cycleNumber: 1, events: [{ action: 'ai_analysis', source: 'analyze_job', status: 'completed', startedAt: '2026-10-01T08:00:00.000Z', completedAt: '2026-10-01T08:10:00.000Z' }] },
        { cycleNumber: 2, events: [{ action: 'ai_analysis', source: 'analyze_job', status: 'completed', startedAt: '2026-10-01T09:00:00.000Z', completedAt: '2026-10-01T09:01:00.000Z' }] },
      ];
      const phases = derivePhases(baseInput({ aiAnalysisStatus: 'complete', remediationHistory: history }));
      expect(byId(phases, 'ai-analysis').durationMs).toBe(60 * 1000);
    });
  });

  describe('remediation phase', () => {
    it('is in-progress with a "Round N" detail and a liveSince anchor while an Auto Mode run is active', () => {
      const phases = derivePhases(baseInput({
        autoModeStatus: { autoStatus: 'running', autoRoundsCompleted: 2, autoStartedAt: '2026-10-01T11:00:00.000Z' },
      }));
      const remediation = byId(phases, 'remediation');
      expect(remediation.status).toBe('in-progress');
      expect(remediation.detail).toBe('Round 3');
      expect(remediation.liveSince).toBe('2026-10-01T11:00:00.000Z');
    });

    it('is done with a rounds-completed detail once an Auto Mode run has stopped', () => {
      const phases = derivePhases(baseInput({
        autoModeStatus: { autoStatus: 'stopped', autoRoundsCompleted: 4, autoStartedAt: null },
      }));
      const remediation = byId(phases, 'remediation');
      expect(remediation.status).toBe('done');
      expect(remediation.detail).toBe('4 rounds');
    });

    it('singularizes the rounds detail for exactly 1 round', () => {
      const phases = derivePhases(baseInput({
        autoModeStatus: { autoStatus: 'stopped', autoRoundsCompleted: 1, autoStartedAt: null },
      }));
      expect(byId(phases, 'remediation').detail).toBe('1 round');
    });

    it('is in-progress for a manual apply-all in flight (remediationCycleActive + matching source)', () => {
      const phases = derivePhases(baseInput({
        remediationCycleActive: true,
        remediationCycleSource: 'apply_all',
      }));
      expect(byId(phases, 'remediation').status).toBe('in-progress');
    });

    it('is NOT in-progress for AI analysis holding the same lock (analyze_job) — that belongs to the AI Analysis phase, not Remediation', () => {
      const phases = derivePhases(baseInput({
        remediationCycleActive: true,
        remediationCycleSource: 'analyze_job',
      }));
      expect(byId(phases, 'remediation').status).toBe('not-started');
    });

    it('is in-progress while the automatic post-fix re-audit is pending', () => {
      const phases = derivePhases(baseInput({ postRemediationStatus: 'pending' }));
      expect(byId(phases, 'remediation').status).toBe('in-progress');
    });

    it('is done with a duration from the latest manual (non-auto_loop) apply+reaudit cycle', () => {
      const history: RemediationHistoryRun[] = [
        {
          cycleNumber: 1,
          events: [
            { action: 'apply_fixes', source: 'apply_all', status: 'completed', startedAt: '2026-10-01T12:00:00.000Z', completedAt: '2026-10-01T12:01:00.000Z', appliedCount: 3 },
            { action: 'reaudit', source: 'apply_all', status: 'completed', startedAt: '2026-10-01T12:01:00.000Z', completedAt: '2026-10-01T12:04:00.000Z' },
          ],
        },
      ];
      const phases = derivePhases(baseInput({ remediationHistory: history, postRemediationStatus: 'complete' }));
      const remediation = byId(phases, 'remediation');
      expect(remediation.status).toBe('done');
      expect(remediation.durationMs).toBe(4 * 60 * 1000);
    });

    it('excludes an auto_loop-sourced cycle from the manual-cycle duration lookup, even with no active Auto Mode status', () => {
      const history: RemediationHistoryRun[] = [
        {
          cycleNumber: 1,
          events: [
            { action: 'reaudit', source: 'auto_loop', status: 'completed', startedAt: '2026-10-01T09:00:00.000Z', completedAt: '2026-10-01T09:30:00.000Z' },
          ],
        },
      ];
      const phases = derivePhases(baseInput({ remediationHistory: history }));
      // No manual cycle found, and nothing else indicates manual work done.
      expect(byId(phases, 'remediation').status).toBe('not-started');
    });

    it('is not-started when nothing has happened and no run is active', () => {
      const phases = derivePhases(baseInput());
      expect(byId(phases, 'remediation').status).toBe('not-started');
    });
  });

  describe('verification phase', () => {
    it('is not-started before the first re-audit has happened', () => {
      const phases = derivePhases(baseInput());
      expect(byId(phases, 'verification').status).toBe('not-started');
    });

    it('is in-progress once the first re-audit is done but re-analysis/guidance resolution has not caught up', () => {
      const phases = derivePhases(baseInput({ postRemediationStatus: 'complete', lastVerifiedAt: '2026-10-01T12:00:00.000Z' }));
      expect(byId(phases, 'verification').status).toBe('in-progress');
    });

    it('is done once re-analyzed after the last verification AND no pending guidance remains', () => {
      const phases = derivePhases(baseInput({
        postRemediationStatus: 'complete',
        lastVerifiedAt: '2026-10-01T12:00:00.000Z',
        aiAnalyzedAt: '2026-10-01T12:05:00.000Z',
        pendingGuidanceCount: 0,
      }));
      expect(byId(phases, 'verification').status).toBe('done');
    });

    it('is NOT done when the re-analysis timestamp predates the last verification (stale)', () => {
      const phases = derivePhases(baseInput({
        postRemediationStatus: 'complete',
        lastVerifiedAt: '2026-10-01T12:00:00.000Z',
        aiAnalyzedAt: '2026-10-01T11:00:00.000Z',
        pendingGuidanceCount: 0,
      }));
      expect(byId(phases, 'verification').status).toBe('in-progress');
    });

    it('treats an acknowledged guidance set as resolved, even with a nonzero pending count', () => {
      const phases = derivePhases(baseInput({
        postRemediationStatus: 'complete',
        lastVerifiedAt: '2026-10-01T12:00:00.000Z',
        aiAnalyzedAt: '2026-10-01T12:05:00.000Z',
        pendingGuidanceCount: 2,
        guidanceAcknowledgment: { note: 'will fix later', remainingCount: 2, acknowledgedAt: '2026-10-01T12:06:00.000Z', acknowledgedBy: 'op-1' },
      }));
      expect(byId(phases, 'verification').status).toBe('done');
    });
  });

  describe('compliance phase', () => {
    it('is not-started when neither artifact has been generated', () => {
      expect(byId(derivePhases(baseInput()), 'compliance').status).toBe('not-started');
    });

    it('is in-progress when only one of the two artifacts has been generated', () => {
      expect(byId(derivePhases(baseInput({ acrGenerated: true })), 'compliance').status).toBe('in-progress');
      expect(byId(derivePhases(baseInput({ pacReportGenerated: true })), 'compliance').status).toBe('in-progress');
    });

    it('is done once both artifacts have been generated', () => {
      expect(byId(derivePhases(baseInput({ acrGenerated: true, pacReportGenerated: true })), 'compliance').status).toBe('done');
    });
  });
});
