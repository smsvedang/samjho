import { MistakeType } from "./types";

export type WeaknessState =
  | "emerging"
  | "weak"
  | "recurring"
  | "improving"
  | "resolved";

export interface ConceptPerformance {
  concept: string;
  total_attempts: number;
  incorrect_attempts: number;
  mistake_types: Record<string, number>;
  consecutive_correct_after_mistake: number;
  last_mistake_type?: MistakeType;
  last_attempt_at: string;
}

export interface WeaknessAnalysis {
  concept: string;
  state: WeaknessState;
  frequency: number;
  primary_mistake_type: MistakeType;
  recommendation: string;
}

/**
 * Analyzes attempts on concepts to deterministically detect weaknesses.
 */
export function analyzeConceptWeakness(
  performance: ConceptPerformance
): WeaknessAnalysis | null {
  const { concept, incorrect_attempts, mistake_types, consecutive_correct_after_mistake } =
    performance;

  if (incorrect_attempts === 0) {
    return null;
  }

  // Find dominant mistake type
  let primaryMistake: MistakeType = "conceptual";
  let maxCount = 0;
  for (const [type, count] of Object.entries(mistake_types)) {
    if (count > maxCount) {
      maxCount = count;
      primaryMistake = type as MistakeType;
    }
  }

  let state: WeaknessState;
  let recommendation = "";

  if (consecutive_correct_after_mistake >= 3) {
    state = "resolved";
    recommendation = `You have mastered ${concept.replace(/_/g, " ")}. Keep it up during revision!`;
  } else if (consecutive_correct_after_mistake > 0) {
    state = "improving";
    recommendation = `Great improvement on ${concept.replace(/_/g, " ")}. Solve 1-2 more to solidify mastery.`;
  } else if (incorrect_attempts >= 3) {
    state = "recurring";
    recommendation = `Recurring ${primaryMistake.replace(/_/g, " ")} issue in ${concept.replace(/_/g, " ")}. Let's review the fundamental steps.`;
  } else if (incorrect_attempts === 2) {
    state = "weak";
    recommendation = `Needs targeted practice on ${concept.replace(/_/g, " ")}.`;
  } else {
    state = "emerging";
    recommendation = `First slip in ${concept.replace(/_/g, " ")}. Practice a similar problem to verify.`;
  }

  return {
    concept,
    state,
    frequency: incorrect_attempts,
    primary_mistake_type: primaryMistake,
    recommendation,
  };
}

/**
 * Extracts list of weak concepts from an array of student attempts
 */
export function extractWeakConcepts(
  attempts: Array<{
    concept_tested?: string;
    is_correct: boolean;
    mistake_type?: MistakeType;
    created_at: string;
  }>
): string[] {
  const map = new Map<string, ConceptPerformance>();

  // Sort chronologically
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const item of sorted) {
    const concept = item.concept_tested || "general";
    if (!map.has(concept)) {
      map.set(concept, {
        concept,
        total_attempts: 0,
        incorrect_attempts: 0,
        mistake_types: {},
        consecutive_correct_after_mistake: 0,
        last_attempt_at: item.created_at,
      });
    }

    const stat = map.get(concept)!;
    stat.total_attempts++;
    stat.last_attempt_at = item.created_at;

    if (item.is_correct) {
      if (stat.incorrect_attempts > 0) {
        stat.consecutive_correct_after_mistake++;
      }
    } else {
      stat.incorrect_attempts++;
      stat.consecutive_correct_after_mistake = 0;
      const type = item.mistake_type || "conceptual";
      stat.mistake_types[type] = (stat.mistake_types[type] || 0) + 1;
      stat.last_mistake_type = type;
    }
  }

  const weakConcepts: string[] = [];
  for (const [concept, stat] of map.entries()) {
    const analysis = analyzeConceptWeakness(stat);
    if (analysis && (analysis.state === "weak" || analysis.state === "recurring" || analysis.state === "emerging")) {
      weakConcepts.push(concept);
    }
  }

  return weakConcepts;
}
