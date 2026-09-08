export type MistakeType =
  | "conceptual"
  | "calculation"
  | "application"
  | "memory"
  | "sign_unit"
  | "careless"
  | "unknown";

export type QuestionType =
  | "mcq"
  | "numerical"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "conceptual";

export type MasteryStatus =
  | "not_learned"
  | "weak"
  | "developing"
  | "good"
  | "strong"
  | "mastered";

export type RevisionStatus = "pending" | "completed" | "overdue";

export type EducationLevel = "school" | "college" | "competitive_exam" | "other";
export type PreferredLanguage = "english" | "hindi" | "hinglish";

export interface UserLearningProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  preferred_language: PreferredLanguage;
  education_level: EducationLevel;
  exam_target: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order_index: number;
  topics?: TopicSummary[];
}

export interface TopicSummary {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string;
  key_concepts: string[];
  order_index: number;
  student_topic?: StudentTopic | null;
}

export interface StudentTopic {
  id: string;
  user_id: string;
  topic_id: string;
  mastery_score: number; // 0 - 100
  status: MasteryStatus;
  confidence: number;
  accuracy: number;
  total_attempts: number;
  correct_attempts: number;
  weak_concepts: string[];
  last_studied_at: string | null;
  next_revision_at: string | null;
  revision_interval_days: number;
  revision_stage: number;
  topic?: TopicSummary;
}

export interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  concept_tested: string;
  question_type: QuestionType;
  difficulty: number; // 1 to 6
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  solution_steps: string[];
  hints: string[];
  metadata?: Record<string, unknown>;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id?: string;
  topic_id: string;
  user_answer: string;
  is_correct: boolean;
  time_taken_seconds: number;
  mistake_type?: MistakeType;
  confidence?: number;
  notes?: string;
  created_at: string;
}

export interface MistakeRecord {
  id: string;
  user_id: string;
  question_id?: string;
  topic_id: string;
  concept: string;
  mistake_type: MistakeType;
  student_answer: string;
  correct_answer: string;
  explanation: string;
  occurrence_count: number;
  resolution_streak: number;
  resolved: boolean;
  first_occurred_at: string;
  last_occurred_at: string;
  topic?: TopicSummary;
}

export interface RevisionItem {
  id: string;
  user_id: string;
  topic_id: string;
  due_at: string;
  interval_days: number;
  stage: number;
  performance_history: { date: string; score: number; is_passed: boolean }[];
  status: RevisionStatus;
  topic?: TopicSummary;
}

export interface ConceptScoreBreakdown {
  concept: string;
  accuracy: number;
  total: number;
  correct: number;
}

export interface DiagnosticResult {
  topic_id: string;
  topic_name: string;
  overall_mastery: number;
  concept_breakdowns: ConceptScoreBreakdown[];
  main_weakness: string | null;
  strong_areas: string[];
  weak_areas: string[];
  recommended_remediation: {
    title: string;
    explanation_focus: string;
    practice_question_count: number;
    estimated_minutes: number;
  };
}

export interface TestResult {
  id: string;
  user_id: string;
  topic_id: string;
  topic_name?: string;
  title: string;
  total_questions: number;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  difficulty: string;
  breakdown: {
    concept_pct: number;
    application_pct: number;
    calculation_pct: number;
  };
  strong_areas: string[];
  weak_areas: string[];
  started_at: string;
  completed_at: string;
  questions?: TestQuestionRecord[];
}

export interface TestQuestionRecord {
  id: string;
  test_id: string;
  question_id?: string;
  question: string;
  options: string[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_taken_seconds: number;
  mistake_type?: MistakeType;
  explanation: string;
}

export interface TutorContext {
  student_level?: EducationLevel | string;
  subject?: string;
  topic?: string;
  mastery?: number;
  weaknesses?: string[];
  recent_accuracy?: number;
  preferred_language?: PreferredLanguage;
  current_session_type?: string;
  difficulty_level?: number;
}
