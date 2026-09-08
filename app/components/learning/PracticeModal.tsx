"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { Question } from "@/lib/learning/types";

interface PracticeModalProps {
  topicId: string;
  topicName: string;
  subjectId?: string;
  targetConcept?: string;
  initialDifficulty?: number;
  token: string;
  onClose: () => void;
  onMasteryUpdated?: (newMastery: number, status: string) => void;
}

interface PracticeEvaluationResponse {
  evaluation?: {
    is_correct?: boolean;
    feedback?: string;
    explanation?: string;
  };
  updated_mastery?: number;
  updated_status?: string;
}

export default function PracticeModal({
  topicId,
  topicName,
  subjectId,
  targetConcept,
  token,
  onClose,
  onMasteryUpdated,
}: PracticeModalProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<PracticeEvaluationResponse | null>(null);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [showSteps, setShowSteps] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchQuestion() {
      try {
        const url = new URL("/api/practice", window.location.origin);
        url.searchParams.set("topic_id", topicId);
        url.searchParams.set("topic_name", topicName);
        if (subjectId) url.searchParams.set("subject_id", subjectId);
        if (targetConcept) url.searchParams.set("target_concept", targetConcept);
        url.searchParams.set("count", "1");

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          if (active && data.questions && data.questions.length > 0) {
            setQuestion(data.questions[0]);
            if (data.current_difficulty) setDifficulty(data.current_difficulty);
            setLoading(false);
          }
        } else {
          if (active) setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load practice question", err);
        if (active) setLoading(false);
      }
    }
    void fetchQuestion();
    return () => {
      active = false;
    };
  }, [topicId, topicName, subjectId, targetConcept, token, refreshCounter]);

  function loadNextQuestion() {
    setLoading(true);
    setResult(null);
    setUserAnswer("");
    setSelectedOption(null);
    setCurrentHintIndex(-1);
    setShowSteps(false);
    setRefreshCounter((c) => c + 1);
  }

  async function handleSubmitAnswer() {
    if (!question || evaluating) return;
    const finalAnswer = selectedOption !== null ? selectedOption : userAnswer.trim();
    if (!finalAnswer) return;

    setEvaluating(true);
    try {
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic_id: topicId,
          question,
          user_answer: finalAnswer,
          time_taken_seconds: 25,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as PracticeEvaluationResponse;
        setResult(data);
        if (onMasteryUpdated && data.updated_mastery !== undefined && data.updated_status) {
          onMasteryUpdated(data.updated_mastery, data.updated_status);
        }
      }
    } catch (err) {
      console.error("Failed to submit practice answer", err);
    } finally {
      setEvaluating(false);
    }
  }

  function handleShowHint() {
    if (!question || !question.hints?.length) return;
    setCurrentHintIndex((prev) => Math.min(prev + 1, question.hints.length - 1));
  }

  return (
    <div className="learning-modal-backdrop" role="presentation">
      <div className="learning-modal practice-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div className="modal-header-left">
            <span className="eyebrow">PRACTICE SESSION</span>
            <h3>{topicName}</h3>
          </div>
          <div className="modal-header-right">
            <div className="difficulty-badge">
              <span className="badge-label">Difficulty:</span>
              <span className="badge-value">Level {difficulty}/6</span>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="practice-body">
          {loading ? (
            <div className="practice-loading">
              <span className="spinner">✦</span>
              <p>Preparing adaptive problem for your skill level...</p>
            </div>
          ) : question ? (
            <div className="practice-content">
              <div className="question-card">
                <div className="concept-tag">Concept: {question.concept_tested.replace(/_/g, " ")}</div>
                <div className="question-text">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {question.question}
                  </ReactMarkdown>
                </div>

                {/* Options if MCQ */}
                {question.options && question.options.length > 0 ? (
                  <div className="options-grid">
                    {question.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = selectedOption === opt;
                      let optionStateClass = "";
                      if (result) {
                        if (opt === question.correct_answer) optionStateClass = "correct-choice";
                        else if (isSelected && !result.evaluation?.is_correct) optionStateClass = "incorrect-choice";
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={Boolean(result)}
                          className={`practice-option ${isSelected ? "selected" : ""} ${optionStateClass}`}
                          onClick={() => setSelectedOption(opt)}
                        >
                          <span className="option-letter">{letter}</span>
                          <span className="option-body">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {opt}
                            </ReactMarkdown>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="numerical-input-wrap">
                    <input
                      type="text"
                      disabled={Boolean(result)}
                      placeholder="Type your answer or numerical value..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !result) {
                          e.preventDefault();
                          void handleSubmitAnswer();
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Hints & Steps Drawer */}
              {currentHintIndex >= 0 && question.hints && (
                <div className="hint-card">
                  <div className="hint-title">
                    <span>💡</span> Hint {currentHintIndex + 1} of {question.hints.length}:
                  </div>
                  <p>{question.hints[currentHintIndex]}</p>
                </div>
              )}

              {showSteps && question.solution_steps && (
                <div className="steps-card">
                  <div className="steps-title"><span>📝</span> Step-by-Step Breakdown:</div>
                  <ol>
                    {question.solution_steps.map((st, i) => (
                      <li key={i}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {st}
                        </ReactMarkdown>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Evaluation Feedback Banner */}
              {result && (
                <div className={`result-feedback ${result.evaluation?.is_correct ? "success" : "error"}`}>
                  <div className="feedback-heading">
                    <span className="feedback-icon">{result.evaluation?.is_correct ? "✓" : "✗"}</span>
                    <strong>{result.evaluation?.is_correct ? "Correct! Concept clicked." : "Not quite right."}</strong>
                  </div>
                  <p className="feedback-text">{result.evaluation?.feedback}</p>
                  {result.evaluation?.explanation && (
                    <div className="feedback-explanation">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {result.evaluation.explanation}
                      </ReactMarkdown>
                    </div>
                  )}
                  {result.updated_mastery !== undefined && (
                    <div className="mastery-update-tag">
                      Topic Mastery: <strong>{result.updated_mastery}%</strong> ({result.updated_status})
                    </div>
                  )}
                </div>
              )}

              {/* Practice Toolbar Actions */}
              <div className="practice-actions">
                {!result ? (
                  <>
                    <div className="helper-buttons">
                      {question.hints && question.hints.length > 0 && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={handleShowHint}
                          disabled={currentHintIndex >= question.hints.length - 1}
                        >
                          💡 {currentHintIndex < 0 ? "Get a Hint" : "Next Hint"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setShowSteps((s) => !s)}
                      >
                        {showSteps ? "Hide Steps" : "Show Steps"}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={evaluating || (!selectedOption && !userAnswer.trim())}
                      onClick={() => void handleSubmitAnswer()}
                    >
                      {evaluating ? "Checking..." : "Submit Answer"} <span>→</span>
                    </button>
                  </>
                ) : (
                  <div className="post-result-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => loadNextQuestion()}
                    >
                      Next Question <span>→</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="practice-empty">
              <p>No more questions available for this topic right now.</p>
              <button className="primary-button" onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
