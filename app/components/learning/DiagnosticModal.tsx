"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { Question, DiagnosticResult } from "@/lib/learning/types";

interface DiagnosticModalProps {
  topicId: string;
  topicName: string;
  keyConcepts?: string[];
  subjectId?: string;
  token: string;
  onClose: () => void;
  onStartRemediation?: (concept: string) => void;
}

export default function DiagnosticModal({
  topicId,
  topicName,
  keyConcepts = [],
  subjectId,
  token,
  onClose,
  onStartRemediation,
}: DiagnosticModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchDiagnostic() {
      try {
        const response = await fetch("/api/diagnostic", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "start",
            topic_id: topicId,
            topic_name: topicName,
            key_concepts: keyConcepts,
            subject_id: subjectId,
          }),
        });

        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setQuestions(data.questions || []);
            setLoading(false);
          }
        } else {
          if (active) setLoading(false);
        }
      } catch (err) {
        console.error("Failed to start diagnostic", err);
        if (active) setLoading(false);
      }
    }
    void fetchDiagnostic();
    return () => {
      active = false;
    };
  }, [topicId, topicName, keyConcepts, subjectId, token]);

  async function handleSubmitDiagnostic() {
    setSubmitting(true);
    try {
      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        user_answer: userAnswers[q.id] || "",
      }));

      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "submit",
          topic_id: topicId,
          topic_name: topicName,
          questions,
          answers: answersPayload,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as DiagnosticResult;
        setReport(result);
      }
    } catch (err) {
      console.error("Diagnostic submit error", err);
    } finally {
      setSubmitting(false);
    }
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.values(userAnswers).filter((v) => Boolean(v?.trim())).length;
  const isComplete = answeredCount === questions.length && questions.length > 0;

  return (
    <div className="learning-modal-backdrop" role="presentation">
      <div className="learning-modal diagnostic-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div className="modal-header-left">
            <span className="eyebrow">DIAGNOSTIC ASSESSMENT</span>
            <h3>{topicName}</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="diagnostic-body">
          {loading ? (
            <div className="diagnostic-loading">
              <span className="spinner">✦</span>
              <p>Analyzing key concepts and preparing your diagnostic check...</p>
            </div>
          ) : report ? (
            /* Diagnostic Report Screen */
            <div className="diagnostic-report">
              <div className="report-header">
                <span className="eyebrow">ASSESSMENT REPORT</span>
                <h2>{topicName} Diagnostic</h2>
                <div className="overall-score-badge">
                  <span>Overall Baseline Mastery:</span>
                  <strong>{report.overall_mastery}%</strong>
                </div>
              </div>

              <div className="concept-breakdowns-grid">
                <h4>Concept Breakdown</h4>
                {report.concept_breakdowns.map((b) => (
                  <div key={b.concept} className="concept-breakdown-row">
                    <div className="breakdown-info">
                      <span className="concept-name">{b.concept.replace(/_/g, " ")}</span>
                      <span className="concept-score">{b.accuracy}% ({b.correct}/{b.total})</span>
                    </div>
                    <div className="breakdown-track">
                      <div
                        className={`breakdown-fill ${b.accuracy >= 70 ? "strong" : b.accuracy >= 50 ? "medium" : "weak"}`}
                        style={{ width: `${b.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {report.main_weakness && (
                <div className="remediation-callout">
                  <div className="weakness-tag">
                    <span>⚠️ Primary Weakness Detected:</span>
                    <strong>{report.main_weakness.replace(/_/g, " ")}</strong>
                  </div>
                  <div className="remediation-details">
                    <p>{report.recommended_remediation.explanation_focus}</p>
                    <div className="remediation-meta">
                      <span>⏱ ~{report.recommended_remediation.estimated_minutes} min guided practice</span>
                      <span>🎯 {report.recommended_remediation.practice_question_count} targeted questions + retest</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button cta-fix"
                    onClick={() => {
                      if (onStartRemediation && report.main_weakness) {
                        onStartRemediation(report.main_weakness);
                      }
                      onClose();
                    }}
                  >
                    Fix This Weakness <span>✦</span>
                  </button>
                </div>
              )}

              <div className="report-footer">
                <button type="button" className="secondary-btn" onClick={onClose}>
                  Done for now
                </button>
              </div>
            </div>
          ) : currentQ ? (
            /* Interactive Assessment Screen */
            <div className="diagnostic-flow">
              <div className="progress-indicator">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <div className="indicator-track">
                  <div
                    className="indicator-fill"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="question-card">
                <div className="concept-tag">Testing: {currentQ.concept_tested.replace(/_/g, " ")}</div>
                <div className="question-text">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {currentQ.question}
                  </ReactMarkdown>
                </div>

                {currentQ.options && currentQ.options.length > 0 ? (
                  <div className="options-grid">
                    {currentQ.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = userAnswers[currentQ.id] === opt;
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`practice-option ${isSelected ? "selected" : ""}`}
                          onClick={() => setUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))}
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
                      placeholder="Type your answer..."
                      value={userAnswers[currentQ.id] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="diagnostic-nav">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                  ← Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  >
                    Next Question <span>→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!isComplete || submitting}
                    onClick={() => void handleSubmitDiagnostic()}
                  >
                    {submitting ? "Analyzing Answers..." : "Complete Assessment"} <span>✓</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="diagnostic-empty">
              <p>Unable to load diagnostic questions.</p>
              <button className="primary-button" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
