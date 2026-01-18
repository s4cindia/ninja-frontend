export const SCORE_WEIGHTS = {
  critical: 25,
  serious: 10,
  moderate: 5,
  minor: 1,
};

export interface ScoreBreakdown {
  weights: { critical: number; serious: number; moderate: number; minor: number };
  deductions: {
    critical: { count: number; points: number };
    serious: { count: number; points: number };
    moderate: { count: number; points: number };
    minor: { count: number; points: number };
  };
  totalDeduction: number;
  finalScore: number;
}

export function calculateScoreBreakdown(issuesSummary: {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}): ScoreBreakdown {
  const deductions = {
    critical: { count: issuesSummary.critical, points: issuesSummary.critical * SCORE_WEIGHTS.critical },
    serious: { count: issuesSummary.serious, points: issuesSummary.serious * SCORE_WEIGHTS.serious },
    moderate: { count: issuesSummary.moderate, points: issuesSummary.moderate * SCORE_WEIGHTS.moderate },
    minor: { count: issuesSummary.minor, points: issuesSummary.minor * SCORE_WEIGHTS.minor },
  };

  const totalDeduction = 
    deductions.critical.points + 
    deductions.serious.points + 
    deductions.moderate.points + 
    deductions.minor.points;

  const finalScore = Math.max(0, 100 - totalDeduction);

  return {
    weights: SCORE_WEIGHTS,
    deductions,
    totalDeduction,
    finalScore,
  };
}
