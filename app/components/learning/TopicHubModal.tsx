"use client";

import { useState, useEffect } from "react";
import { TopicSummary, StudentTopic, MistakeRecord } from "@/lib/learning/types";
import { formatDueNotice } from "@/lib/learning/spacedRevisionEngine";

interface TopicDetailsResponse {
  topic?: {
    id: string;
    subject_id: string;
    subject_name?: string;
    name: string;
    slug: string;
    description: string;
    key_concepts: string[];
  };
  student_topic?: StudentTopic | null;
  mistakes?: MistakeRecord[];
  recent_attempts?: Record<string, unknown>[];
  revision_item?: Record<string, unknown> | null;
}

interface TopicHubModalProps {
  topic: TopicSummary;
  token?: string;
  onClose: () => void;
  onStartPractice: (targetConcept?: string) => void;
  onStartDiagnostic: () => void;
  onStartTest: () => void;
  onOpenMistakes: () => void;
}

export default function TopicHubModal({
  topic,
  token,
  onClose,
  onStartPractice,
  onStartDiagnostic,
  onStartTest,
  onOpenMistakes,
}: TopicHubModalProps) {
  const [details, setDetails] = useState<TopicDetailsResponse | null>(null);

  useEffect(() => {
    async function loadDetails() {
      if (!token) return;
      try {
        const response = await fetch(`/api/topics/${topic.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = (await response.json()) as TopicDetailsResponse;
          setDetails(data);
        }
      } catch (err) {
        console.error("Failed to load topic details", err);
      }
    }
    void loadDetails();
  }, [topic.id, token]);

  const studentTopic: StudentTopic | null = details?.student_topic || topic.student_topic || null;
  const masteryScore = studentTopic?.mastery_score ?? 0;
  const status = studentTopic?.status || "not_learned";
  const weakConcepts: string[] = studentTopic?.weak_concepts || [];
  const mistakes: MistakeRecord[] = details?.mistakes || [];
  const revisionDueNotice = formatDueNotice(studentTopic?.next_revision_at);

  const statusColors: Record<string, string> = {
    not_learned: "#9aa9a1",
    weak: "#e56d52",
    developing: "#e5a352",
    good: "#4ea375",
    strong: "#1f6960",
    mastered: "#164f49",
  };

  return (
    <div className="learning-modal-backdrop" role="presentation">
      <div className="learning-modal topic-hub-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div className="modal-header-left">
            <span className="eyebrow">{details?.topic?.subject_name || "TOPIC OVERVIEW"}</span>
            <h2>{topic.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="topic-hub-body">
          {/* Mastery Header Card */}
          <div className="mastery-overview-card">
            <div className="mastery-gauge-wrap">
              <div className="mastery-circle" style={{ borderColor: statusColors[status] || "#1f6960" }}>
                <span className="mastery-num">{masteryScore}%</span>
                <span className="mastery-lbl">Mastery</span>
              </div>
            </div>

            <div className="mastery-info">
              <div className="status-pill" style={{ backgroundColor: `${statusColors[status]}18`, color: statusColors[status] }}>
                ● {status.replace(/_/g, " ").toUpperCase()}
              </div>
              <p className="topic-description">{topic.description}</p>
              <div className="topic-meta-chips">
                <span>⏱ Spaced Revision: <strong>{revisionDueNotice}</strong></span>
                <span>🎯 Accuracy: <strong>{studentTopic?.accuracy ?? 0}%</strong></span>
                <span>📚 Attempts: <strong>{studentTopic?.total_attempts ?? 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Primary Action Row */}
          <div className="topic-actions-banner">
            {weakConcepts.length > 0 && (
              <button
                type="button"
                className="action-btn cta-primary"
                onClick={() => {
                  onStartPractice(weakConcepts[0]);
                  onClose();
                }}
              >
                <span>⚠️ Fix Weaknesses ({weakConcepts[0].replace(/_/g, " ")})</span>
                <b>→</b>
              </button>
            )}

            <div className="action-grid-buttons">
              <button
                type="button"
                className="action-card-btn"
                onClick={() => {
                  onStartPractice();
                  onClose();
                }}
              >
                <span className="btn-icon">⚡</span>
                <div className="btn-text">
                  <strong>Adaptive Practice</strong>
                  <span>Hints, steps & difficulty scaling</span>
                </div>
              </button>

              <button
                type="button"
                className="action-card-btn"
                onClick={() => {
                  onStartDiagnostic();
                  onClose();
                }}
              >
                <span className="btn-icon">🩺</span>
                <div className="btn-text">
                  <strong>Diagnostic Check</strong>
                  <span>Assess what you already know</span>
                </div>
              </button>

              <button
                type="button"
                className="action-card-btn"
                onClick={() => {
                  onStartTest();
                  onClose();
                }}
              >
                <span className="btn-icon">⏱</span>
                <div className="btn-text">
                  <strong>Topic Test</strong>
                  <span>Timed exam & deep breakdown</span>
                </div>
              </button>
            </div>
          </div>

          {/* Key Concepts List */}
          <div className="concepts-section">
            <h4>Core Topic Concepts</h4>
            <div className="concept-chips">
              {(topic.key_concepts || []).map((c) => {
                const isWeak = weakConcepts.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    className={`concept-pill ${isWeak ? "weak-concept" : ""}`}
                    onClick={() => {
                      onStartPractice(c);
                      onClose();
                    }}
                  >
                    <span>{isWeak ? "⚠️" : "✦"}</span>
                    <span>{c.replace(/_/g, " ")}</span>
                    <b className="practice-subtext">Practice →</b>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mistakes & Recent History */}
          {mistakes.length > 0 && (
            <div className="topic-mistakes-section">
              <div className="section-head">
                <h4>Mistake Book for this Topic ({mistakes.filter((m) => !m.resolved).length} active)</h4>
                <button type="button" className="text-link" onClick={() => { onOpenMistakes(); onClose(); }}>
                  View All Mistakes →
                </button>
              </div>
              <div className="topic-mistakes-list">
                {mistakes.slice(0, 3).map((m) => (
                  <div key={m.id} className="topic-mistake-item">
                    <div className="m-left">
                      <span className="m-type">{m.mistake_type.toUpperCase()}</span>
                      <strong>{m.concept.replace(/_/g, " ")}</strong>
                      <span className="m-count">Repeated {m.occurrence_count} time{m.occurrence_count > 1 ? "s" : ""}</span>
                    </div>
                    <button
                      type="button"
                      className="fix-pill"
                      onClick={() => {
                        onStartPractice(m.concept);
                        onClose();
                      }}
                    >
                      Fix This
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
