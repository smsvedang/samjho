export const REVISION_INTERVALS = [1, 3, 7, 14, 30, 60];

export interface RevisionCalculationResult {
  next_revision_at: string;
  interval_days: number;
  stage: number;
  status: "pending" | "completed" | "overdue";
}

/**
 * Calculates the next spaced revision timestamp based on current stage and session score (0 to 100)
 */
export function calculateNextRevision(
  currentStage: number = 0,
  score: number = 100,
  baseDate: Date = new Date()
): RevisionCalculationResult {
  let nextStage: number;

  if (score >= 80) {
    // Advanced to next interval stage
    nextStage = Math.min(currentStage + 1, REVISION_INTERVALS.length - 1);
  } else if (score >= 60) {
    // Maintain current stage
    nextStage = currentStage;
  } else {
    // Reset/reduce stage due to struggle
    nextStage = Math.max(0, currentStage - 1);
  }

  const intervalDays = REVISION_INTERVALS[nextStage] || 1;
  const nextDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    next_revision_at: nextDate.toISOString(),
    interval_days: intervalDays,
    stage: nextStage,
    status: "pending",
  };
}

/**
 * Checks if a topic is currently due for revision
 */
export function isRevisionDue(nextRevisionAt: string | null | undefined): boolean {
  if (!nextRevisionAt) return false;
  return new Date(nextRevisionAt).getTime() <= Date.now();
}

/**
 * Formats relative due time (e.g. "Today", "Due in 2 days", "Overdue by 3 days")
 */
export function formatDueNotice(nextRevisionAt: string | null | undefined): string {
  if (!nextRevisionAt) return "Not scheduled";
  const diffMs = new Date(nextRevisionAt).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return overdue === 1 ? "Overdue by 1 day" : `Overdue by ${overdue} days`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}
