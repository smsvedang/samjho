"use client";

import { useState } from "react";
import { Subject, TopicSummary } from "@/lib/learning/types";

interface MyLearningViewProps {
  subjects: Subject[];
  loading: boolean;
  onSelectTopic: (topic: TopicSummary) => void;
}

export default function MyLearningView({
  subjects,
  loading,
  onSelectTopic,
}: MyLearningViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    subjects[0]?.id || null
  );

  const activeSubject = subjects.find((s) => s.id === (selectedSubjectId || subjects[0]?.id));

  // Compute subject average mastery
  const computeSubjectMastery = (subject: Subject): number => {
    if (!subject.topics || subject.topics.length === 0) return 0;
    const total = subject.topics.reduce((acc, t) => acc + (t.student_topic?.mastery_score || 0), 0);
    return Math.round(total / subject.topics.length);
  };

  const statusColors: Record<string, string> = {
    not_learned: "#9aa9a1",
    weak: "#e56d52",
    developing: "#e5a352",
    good: "#4ea375",
    strong: "#1f6960",
    mastered: "#164f49",
  };

  return (
    <section className="learning-view my-learning-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">CURRICULUM & MASTERY</span>
          <h1>My Learning Space</h1>
          <p>Explore subjects, diagnose prior knowledge, and master concepts step-by-step.</p>
        </div>
      </header>

      {loading ? (
        <div className="view-loading">
          <span className="spinner">✦</span>
          <p>Loading your curriculum progress...</p>
        </div>
      ) : (
        <div className="curriculum-layout">
          {/* Subject Selector Sidebar / Cards */}
          <div className="subjects-nav">
            {subjects.map((subj) => {
              const avg = computeSubjectMastery(subj);
              const isActive = (selectedSubjectId || subjects[0]?.id) === subj.id;
              return (
                <button
                  key={subj.id}
                  type="button"
                  className={`subject-nav-card ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedSubjectId(subj.id)}
                >
                  <div className="sub-card-top">
                    <span className="sub-icon">{subj.icon}</span>
                    <span className="sub-pct">{avg}%</span>
                  </div>
                  <strong className="sub-name">{subj.name}</strong>
                  <div className="sub-track">
                    <div className="sub-fill" style={{ width: `${avg}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Topics Grid for Active Subject */}
          {activeSubject && (
            <div className="topics-container">
              <div className="topics-header">
                <div>
                  <h2>{activeSubject.icon} {activeSubject.name}</h2>
                  <p>{activeSubject.description}</p>
                </div>
              </div>

              <div className="topics-list-grid">
                {(activeSubject.topics || []).map((topic) => {
                  const st = topic.student_topic;
                  const score = st?.mastery_score ?? 0;
                  const status = st?.status || "not_learned";
                  const hasWeakness = st?.weak_concepts && st.weak_concepts.length > 0;

                  return (
                    <article
                      key={topic.id}
                      className={`topic-card ${hasWeakness ? "has-weakness" : ""}`}
                      onClick={() => onSelectTopic(topic)}
                    >
                      <div className="topic-card-top">
                        <span
                          className="status-chip"
                          style={{
                            backgroundColor: `${statusColors[status]}15`,
                            color: statusColors[status],
                          }}
                        >
                          ● {status.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="topic-mastery-number">{score}%</span>
                      </div>

                      <h3 className="topic-card-title">{topic.name}</h3>
                      <p className="topic-card-desc">{topic.description}</p>

                      <div className="topic-progress-track">
                        <div
                          className="topic-progress-fill"
                          style={{
                            width: `${score}%`,
                            backgroundColor: statusColors[status] || "#1f6960",
                          }}
                        />
                      </div>

                      <div className="topic-card-footer">
                        {hasWeakness ? (
                          <span className="weak-hint">⚠️ {st.weak_concepts[0].replace(/_/g, " ")} needs review</span>
                        ) : (
                          <span className="concepts-count">
                            {(topic.key_concepts || []).length} key concepts
                          </span>
                        )}
                        <span className="open-hub-link">Open Topic →</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
