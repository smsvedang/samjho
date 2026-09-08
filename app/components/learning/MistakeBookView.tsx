"use client";

import { useState, useEffect } from "react";
import { MistakeRecord } from "@/lib/learning/types";

interface MistakeBookViewProps {
  token: string;
  onFixMistake: (topicId: string, topicName: string, concept: string) => void;
}

export default function MistakeBookView({
  token,
  onFixMistake,
}: MistakeBookViewProps) {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");

  useEffect(() => {
    async function loadMistakes() {
      setLoading(true);
      try {
        const response = await fetch("/api/mistakes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMistakes(data || []);
        }
      } catch (err) {
        console.error("Failed to load Mistake Book", err);
      } finally {
        setLoading(false);
      }
    }
    void loadMistakes();
  }, [token]);

  const filteredMistakes = mistakes.filter((m) => {
    if (filter === "active") return !m.resolved;
    if (filter === "resolved") return m.resolved;
    return true;
  });

  const activeCount = mistakes.filter((m) => !m.resolved).length;
  const resolvedCount = mistakes.filter((m) => m.resolved).length;

  return (
    <section className="learning-view mistake-book-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">YOUR ERROR LOG</span>
          <h1>Personal Mistake Book</h1>
          <p>Every mistake is an opportunity to master the underlying principle.</p>
        </div>

        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Active Issues ({activeCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === "resolved" ? "active" : ""}`}
            onClick={() => setFilter("resolved")}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All History ({mistakes.length})
          </button>
        </div>
      </header>

      {loading ? (
        <div className="view-loading">
          <span className="spinner">✦</span>
          <p>Loading your personal mistake notebook...</p>
        </div>
      ) : filteredMistakes.length > 0 ? (
        <div className="mistakes-grid">
          {filteredMistakes.map((mistake) => (
            <article key={mistake.id} className={`mistake-card ${mistake.resolved ? "is-resolved" : ""}`}>
              <div className="mistake-card-top">
                <span className="topic-badge">{mistake.topic_name || "Topic"}</span>
                <span className={`mistake-type-tag ${mistake.mistake_type}`}>
                  {mistake.mistake_type.toUpperCase()}
                </span>
                {mistake.occurrence_count >= 3 && !mistake.resolved && (
                  <span className="recurring-tag">⚠️ Recurring ({mistake.occurrence_count}x)</span>
                )}
              </div>

              <h3 className="mistake-concept">{mistake.concept.replace(/_/g, " ")}</h3>

              {mistake.explanation && (
                <div className="mistake-analysis">
                  <p className="analysis-text">{mistake.explanation}</p>
                </div>
              )}

              <div className="mistake-answers-row">
                <div className="answer-snippet student">
                  <span className="ans-label">Your Answer:</span>
                  <code>{mistake.student_answer || "N/A"}</code>
                </div>
                <div className="answer-snippet correct">
                  <span className="ans-label">Correct:</span>
                  <code>{mistake.correct_answer || "N/A"}</code>
                </div>
              </div>

              <div className="mistake-card-footer">
                <div className="resolution-status">
                  {mistake.resolved ? (
                    <span className="resolved-status">✓ Resolved & Mastered</span>
                  ) : (
                    <span className="streak-status">
                      {mistake.resolution_streak > 0
                        ? `${mistake.resolution_streak}/2 correct retests`
                        : "Needs practice"}
                    </span>
                  )}
                </div>

                {!mistake.resolved && (
                  <button
                    type="button"
                    className="primary-button fix-btn"
                    onClick={() =>
                      onFixMistake(
                        mistake.topic_id,
                        mistake.topic_name || "Topic",
                        mistake.concept
                      )
                    }
                  >
                    Fix This <span>✦</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon">✓</div>
          <h3>{filter === "active" ? "No Active Mistakes!" : "No mistakes found"}</h3>
          <p>You have cleared all recurring errors. Keep practicing and challenging yourself!</p>
        </div>
      )}
    </section>
  );
}
