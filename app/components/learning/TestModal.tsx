"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { Question, TestResult } from "@/lib/learning/types";

interface TestModalProps {
  topicId: string;
  topicName: string;
  subjectId?: string;
  questionCount?: number;
  timeLimitMinutes?: number;
  token: string;
  onClose: () => void;
  onStartRemediation?: (weakness: string) => void;
}

export default function TestModal({
  topicId,
  topicName,
  subjectId,
  questionCount = 5,
  timeLimitMinutes = 15,
  token,
  onClose,
  onStartRemediation,
}: TestModalProps) {
  const [testId, setTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitMinutes * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    let active = true;
    async function initTest() {
      try {
        const response = await fetch("/api/tests", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
            topic_id: topicId,
            topic_name: topicName,
            subject_id: subjectId,
            question_count: questionCount,
            difficulty: 3,
          }),
        });

        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setTestId(data.test_id);
            setQuestions(data.questions || []);
            setLoading(false);
          }
        } else {
          if (active) setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize test", err);
        if (active) setLoading(false);
      }
    }
    void initTest();
    return () => {
      active = false;
    };
  }, [topicId, topicName, subjectId, questionCount, token]);

  const submitTest = useCallback(async () => {
    if (!testId || submitting) return;
    setSubmitting(true);
    const timeTaken = timeLimitMinutes * 60 - secondsRemaining;

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "submit",
          test_id: testId,
          topic_id: topicId,
          topic_name: topicName,
          time_taken_seconds: Math.max(15, timeTaken),
          questions,
          user_answers: userAnswers,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as TestResult;
        setTestResult(result);
      }
    } catch (err) {
      console.error("Test submit error", err);
    } finally {
      setSubmitting(false);
    }
  }, [testId, submitting, timeLimitMinutes, secondsRemaining, token, topicId, topicName, questions, userAnswers]);

  useEffect(() => {
    if (loading || testResult || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, testResult, secondsRemaining, submitTest]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins}:${remainderSecs < 10 ? "0" : ""}${remainderSecs}`;
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="learning-modal-backdrop" role="presentation">
      <div className="learning-modal test-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div className="modal-header-left">
            <span className="eyebrow">FORMAL TOPIC TEST</span>
            <h3>{topicName}</h3>
          </div>
          <div className="modal-header-right">
            {!testResult && (
              <div className={`timer-badge ${secondsRemaining < 120 ? "timer-warning" : ""}`}>
                <span>⏱</span> {formatTime(secondsRemaining)}
              </div>
            )}
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="test-body">
          {loading ? (
            <div className="test-loading">
              <span className="spinner">✦</span>
              <p>Configuring exam questions under test conditions...</p>
            </div>
          ) : testResult ? (
            /* Comprehensive Test Result Screen */
            <div className="test-result-screen">
              <div className="result-top-card">
                <span className="eyebrow">TEST EVALUATION</span>
                <h2>{topicName} Result</h2>

                <div className="result-stats-row">
                  <div className="stat-box">
                    <span className="stat-label">Score</span>
                    <strong className="stat-val primary">{testResult.score}%</strong>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Accuracy</span>
                    <strong className="stat-val">{testResult.accuracy}%</strong>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Time Spent</span>
                    <strong className="stat-val">{Math.round(testResult.time_taken_seconds / 60)} min</strong>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="breakdown-cards-grid">
                <div className="breakdown-card">
                  <span className="card-label">Conceptual Mastery</span>
                  <strong className="card-pct">{testResult.breakdown?.concept_pct ?? testResult.score}%</strong>
                  <div className="mini-bar"><div style={{ width: `${testResult.breakdown?.concept_pct ?? testResult.score}%` }} /></div>
                </div>
                <div className="breakdown-card">
                  <span className="card-label">Application Skill</span>
                  <strong className="card-pct">{testResult.breakdown?.application_pct ?? testResult.score}%</strong>
                  <div className="mini-bar"><div style={{ width: `${testResult.breakdown?.application_pct ?? testResult.score}%` }} /></div>
                </div>
                <div className="breakdown-card">
                  <span className="card-label">Calculation Precision</span>
                  <strong className="card-pct">{testResult.breakdown?.calculation_pct ?? testResult.score}%</strong>
                  <div className="mini-bar"><div style={{ width: `${testResult.breakdown?.calculation_pct ?? testResult.score}%` }} /></div>
                </div>
              </div>

              {/* Weak Areas & Remediation */}
              {testResult.weak_areas && testResult.weak_areas.length > 0 && (
                <div className="test-weakness-banner">
                  <div className="weak-header">
                    <span>⚠️ Targeted Areas for Improvement:</span>
                    <strong>{testResult.weak_areas.map((w) => w.replace(/_/g, " ")).join(", ")}</strong>
                  </div>
                  <p>Samjho has updated your learning profile and scheduled a quick revision cycle.</p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (onStartRemediation && testResult.weak_areas?.[0]) {
                        onStartRemediation(testResult.weak_areas[0]);
                      }
                      onClose();
                    }}
                  >
                    Fix Weaknesses with Practice <span>✦</span>
                  </button>
                </div>
              )}

              {/* Question Review List */}
              <div className="test-questions-review">
                <h4>Question Review & Explanations</h4>
                {testResult.questions?.map((q, idx) => (
                  <div key={idx} className={`review-item ${q.is_correct ? "correct" : "incorrect"}`}>
                    <div className="review-title">
                      <span className="status-mark">{q.is_correct ? "✓" : "✗"}</span>
                      <strong>Q{idx + 1}. {q.question}</strong>
                    </div>
                    <div className="review-answers">
                      <span>Your Answer: <em>{q.user_answer || "Not answered"}</em></span>
                      <span>Correct Answer: <b>{q.correct_answer}</b></span>
                    </div>
                    {q.explanation && (
                      <div className="review-explanation">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.explanation}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="result-footer">
                <button type="button" className="secondary-btn" onClick={onClose}>
                  Close Assessment
                </button>
              </div>
            </div>
          ) : currentQ ? (
            /* Live Test Screen */
            <div className="test-flow">
              {/* Question Palette */}
              <div className="question-palette">
                {questions.map((q, i) => {
                  const isAnswered = Boolean(userAnswers[q.id]?.trim());
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`palette-num ${currentIndex === i ? "active" : ""} ${isAnswered ? "answered" : ""}`}
                      onClick={() => setCurrentIndex(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="question-card">
                <div className="q-number">Question {currentIndex + 1} of {questions.length}</div>
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

              <div className="test-nav">
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
                    className="primary-button submit-test-btn"
                    disabled={submitting}
                    onClick={() => void submitTest()}
                  >
                    {submitting ? "Submitting..." : "Submit Test"} <span>✓</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="test-empty">
              <p>Unable to load test.</p>
              <button className="primary-button" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
