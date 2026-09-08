"use client";

import { useSyncExternalStore } from "react";
import { Subject, TopicSummary } from "@/lib/learning/types";

interface DashboardViewProps {
  subjects: Subject[];
  loading: boolean;
  onNavigateTab: (tab: "chat" | "learning" | "mistakes" | "revision") => void;
  onSelectTopic: (topic: TopicSummary) => void;
  onStartPractice: (topicId: string, topicName: string, concept?: string) => void;
  onStartRevision: (topicId: string, topicName: string) => void;
}

const emptySubscribe = () => () => {};

export default function DashboardView({
  subjects,
  loading,
  onNavigateTab,
  onSelectTopic,
  onStartPractice,
  onStartRevision,
}: DashboardViewProps) {
  const currentTimestamp = useSyncExternalStore(
    emptySubscribe,
    () => Date.now(),
    () => 0
  );

  // Extract all topics across subjects
  const allTopics: TopicSummary[] = [];
  subjects.forEach((s) => {
    if (s.topics) allTopics.push(...s.topics);
  });

  // 1. Find active / continue learning topic
  const studiedTopics = allTopics.filter((t) => t.student_topic?.last_studied_at);
  const sortedByRecent = [...studiedTopics].sort((a, b) => {
    const timeA = new Date(a.student_topic?.last_studied_at || 0).getTime();
    const timeB = new Date(b.student_topic?.last_studied_at || 0).getTime();
    return timeB - timeA;
  });
  const continueTopic = sortedByRecent[0] || allTopics[0] || null;

  // 2. Find topics due for revision
  const revisionDueTopics = allTopics.filter((t) => {
    const revAt = t.student_topic?.next_revision_at;
    if (!revAt || currentTimestamp === 0) return false;
    return new Date(revAt).getTime() <= currentTimestamp;
  });

  // 3. Find weak topics
  const weakTopics = allTopics.filter(
    (t) => (t.student_topic?.weak_concepts?.length ?? 0) > 0 || ((t.student_topic?.mastery_score ?? 0) < 50 && (t.student_topic?.total_attempts ?? 0) > 0)
  );

  // Overall stats
  const totalMastered = allTopics.filter((t) => (t.student_topic?.mastery_score ?? 0) >= 85).length;
  const totalAttempts = allTopics.reduce((acc, t) => acc + (t.student_topic?.total_attempts ?? 0), 0);

  return (
    <section className="learning-view dashboard-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">YOUR LEARNING COMMAND CENTER</span>
          <h1>What should we master today?</h1>
          <p>Here is your personalized roadmap based on recent attempts, revisions, and detected weaknesses.</p>
        </div>
      </header>

      {loading ? (
        <div className="view-loading">
          <span className="spinner">✦</span>
          <p>Analyzing your personal learning loop...</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Section 1: Continue Learning / Focus Hero */}
          {continueTopic && (
            <div className="dashboard-hero-card">
              <div className="hero-left">
                <span className="hero-tag">CONTINUE LEARNING</span>
                <h2>{continueTopic.name}</h2>
                <p>{continueTopic.description}</p>
                <div className="hero-stats">
                  <span>Topic Mastery: <strong>{continueTopic.student_topic?.mastery_score ?? 0}%</strong></span>
                  <span>•</span>
                  <span>Accuracy: <strong>{continueTopic.student_topic?.accuracy ?? 0}%</strong></span>
                </div>
              </div>

              <div className="hero-right">
                <button
                  type="button"
                  className="primary-button hero-cta"
                  onClick={() => onStartPractice(continueTopic.id, continueTopic.name)}
                >
                  Continue Practice <span>⚡</span>
                </button>
                <button
                  type="button"
                  className="secondary-btn hero-sec"
                  onClick={() => onSelectTopic(continueTopic)}
                >
                  Open Topic Hub →
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Quick Metrics Row */}
          <div className="metrics-row">
            <div className="metric-card" onClick={() => onNavigateTab("revision")}>
              <span className="metric-icon">⏱</span>
              <div className="metric-info">
                <strong>{revisionDueTopics.length}</strong>
                <span>Revisions Due</span>
              </div>
            </div>

            <div className="metric-card" onClick={() => onNavigateTab("mistakes")}>
              <span className="metric-icon">⚠️</span>
              <div className="metric-info">
                <strong>{weakTopics.length}</strong>
                <span>Weak Topics</span>
              </div>
            </div>

            <div className="metric-card" onClick={() => onNavigateTab("learning")}>
              <span className="metric-icon">🏆</span>
              <div className="metric-info">
                <strong>{totalMastered}</strong>
                <span>Concepts Mastered</span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-icon">🎯</span>
              <div className="metric-info">
                <strong>{totalAttempts}</strong>
                <span>Problems Solved</span>
              </div>
            </div>
          </div>

          {/* Section 3: Two Column Layout (Revision Due vs Weak Areas) */}
          <div className="dashboard-split-section">
            {/* Revision Due Box */}
            <div className="dash-card revision-due-card">
              <div className="dash-card-header">
                <div>
                  <h3>Spaced Revision Due</h3>
                  <p>Concepts ready for quick reinforcement</p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onNavigateTab("revision")}
                >
                  View All →
                </button>
              </div>

              {revisionDueTopics.length > 0 ? (
                <div className="dash-item-list">
                  {revisionDueTopics.slice(0, 3).map((top) => (
                    <div key={top.id} className="dash-item-row">
                      <div>
                        <strong>{top.name}</strong>
                        <span className="row-sub">Stage {(top.student_topic?.revision_stage ?? 0) + 1} Spaced Recall</span>
                      </div>
                      <button
                        type="button"
                        className="primary-button pill-cta"
                        onClick={() => onStartRevision(top.id, top.name)}
                      >
                        Start <span>✦</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty-box">
                  <span>✓</span>
                  <p>All revision topics are currently up to date!</p>
                </div>
              )}
            </div>

            {/* Weak Areas Box */}
            <div className="dash-card weak-areas-card">
              <div className="dash-card-header">
                <div>
                  <h3>Weak Areas Requiring Attention</h3>
                  <p>Recurring issues identified from recent attempts</p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onNavigateTab("mistakes")}
                >
                  Mistake Book →
                </button>
              </div>

              {weakTopics.length > 0 ? (
                <div className="dash-item-list">
                  {weakTopics.slice(0, 3).map((top) => {
                    const weakConcept = top.student_topic?.weak_concepts?.[0] || "core_principles";
                    return (
                      <div key={top.id} className="dash-item-row">
                        <div>
                          <strong>{top.name}</strong>
                          <span className="row-sub text-warn">⚠️ {weakConcept.replace(/_/g, " ")}</span>
                        </div>
                        <button
                          type="button"
                          className="primary-button pill-cta fix"
                          onClick={() => onStartPractice(top.id, top.name, weakConcept)}
                        >
                          Fix Weakness
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dash-empty-box">
                  <span>🎯</span>
                  <p>No major weaknesses detected. Keep solving higher difficulty questions!</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Subject Curriculum Overview */}
          <div className="dash-subjects-section">
            <div className="dash-card-header">
              <div>
                <h3>Explore Curriculum by Subject</h3>
                <p>Select any subject to view full chapter breakdown</p>
              </div>
              <button
                type="button"
                className="text-link"
                onClick={() => onNavigateTab("learning")}
              >
                Open My Learning →
              </button>
            </div>

            <div className="dash-subjects-grid">
              {subjects.map((subj) => {
                const count = (subj.topics || []).length;
                const totalMastery = (subj.topics || []).reduce(
                  (acc, t) => acc + (t.student_topic?.mastery_score || 0),
                  0
                );
                const avgMastery = count > 0 ? Math.round(totalMastery / count) : 0;

                return (
                  <div
                    key={subj.id}
                    className="dash-subject-card"
                    onClick={() => onNavigateTab("learning")}
                  >
                    <span className="subj-icon">{subj.icon}</span>
                    <strong>{subj.name}</strong>
                    <span className="subj-stats">{count} Topics • {avgMastery}% Mastered</span>
                    <div className="mini-track">
                      <div className="mini-fill" style={{ width: `${avgMastery}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
