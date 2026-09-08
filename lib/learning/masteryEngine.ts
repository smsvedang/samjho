import { MasteryStatus } from "./types";

export interface AttemptInput {
  is_correct: boolean;
  difficulty: number; // 1 to 6
  created_at: string;
  mistake_type?: string;
}

export function getMasteryStatus(score: number): MasteryStatus {
  if (score >= 95) return "mastered";
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "developing";
  if (score >= 30) return "weak";
  return "not_learned";
}

/**
 * Calculates a deterministic mastery score (0-100) based on:
 * 1. Weighted Accuracy across difficulty tiers (Level 1: 0.6x, Level 2: 0.8x, Level 3: 1.0x, Level 4: 1.2x, Level 5: 1.4x, Level 6: 1.6x)
 * 2. Recent performance weighting (more recent attempts have higher weight)
 * 3. Consecutive correct streak bonus (up to +10 pts)
 * 4. Recurring mistake penalty (up to -15 pts)
 */
export function calculateMasteryScore(
  attempts: AttemptInput[],
  unresolvedMistakeCount: number = 0
): { score: number; accuracy: number; status: MasteryStatus } {
  if (!attempts || attempts.length === 0) {
    return { score: 0, accuracy: 0, status: "not_learned" };
  }

  // Sort attempts from oldest to newest
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const totalAttempts = sorted.length;
  const correctAttempts = sorted.filter((a) => a.is_correct).length;
  const rawAccuracy = (correctAttempts / totalAttempts) * 100;

  // Difficulty weights
  const difficultyWeights: Record<number, number> = {
    1: 0.6,
    2: 0.8,
    3: 1.0,
    4: 1.2,
    5: 1.4,
    6: 1.6,
  };

  let totalWeightedPossible = 0;
  let totalWeightedEarned = 0;

  // Recency decay factor (older attempts matter slightly less)
  sorted.forEach((attempt, index) => {
    const recencyMultiplier = 0.5 + 0.5 * ((index + 1) / totalAttempts);
    const diffWeight = difficultyWeights[attempt.difficulty] || 1.0;
    const itemWeight = diffWeight * recencyMultiplier;

    totalWeightedPossible += itemWeight;
    if (attempt.is_correct) {
      totalWeightedEarned += itemWeight;
    }
  });

  const baseWeightedPercentage =
    totalWeightedPossible > 0
      ? (totalWeightedEarned / totalWeightedPossible) * 100
      : 0;

  // Streak calculation (last N attempts)
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].is_correct) {
      currentStreak++;
    } else {
      break;
    }
  }

  const streakBonus = Math.min(currentStreak * 2.5, 10);

  // Volume scale: mastery is constrained until student has solved enough problems
  // (e.g., 1 correct question shouldn't yield 95 mastery immediately)
  const volumeMultiplier = Math.min(totalAttempts / 5, 1.0);

  // Penalty for active unresolved recurring mistakes
  const mistakePenalty = Math.min(unresolvedMistakeCount * 4, 15);

  let finalScore = (baseWeightedPercentage + streakBonus) * volumeMultiplier - mistakePenalty;
  finalScore = Math.max(0, Math.min(100, Math.round(finalScore * 10) / 10));

  return {
    score: finalScore,
    accuracy: Math.round(rawAccuracy * 10) / 10,
    status: getMasteryStatus(finalScore),
  };
}
