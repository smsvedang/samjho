"use client";

import { useState, useEffect } from "react";
import { formatDueNotice } from "@/lib/learning/spacedRevisionEngine";

interface ExtendedRevisionItem {
  id: string;
  user_id: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
  subject_icon: string;
  key_concepts: string[];
  due_at: string;
  interval_days: number;
  stage: number;
  status: string;
  is_due: boolean;
}

interface RevisionViewProps {
  token: string;
  onStartRevisionSession: (topicId: string, topicName: string) => void;
}

export default function RevisionView({
  token,
  onStartRevisionSession,
}: RevisionViewProps) {
  const [items, setItems] = useState<ExtendedRevisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRevisions() {
      setLoading(true);
      try {
        const response = await fetch("/api/revision", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = (await response.json()) as ExtendedRevisionItem[];
          setItems(data || []);
        }
      } catch (err) {
        console.error("Failed to load revision items", err);
      } finally {
        setLoading(false);
      }
    }
    void loadRevisions();
  }, [token]);

  const dueItems = items.filter((i) => i.is_due);
  const upcomingItems = items.filter((i) => !i.is_due);

  return (
    <section className="learning-view revision-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">SPACED REPETITION SCHEDULE</span>
          <h1>Concepts Due for Revision</h1>
          <p>Science-backed intervals (1d → 3d → 7d → 14d → 30d) so concepts stick permanently.</p>
        </div>
      </header>

      {loading ? (
        <div className="view-loading">
          <span className="spinner">✦</span>
          <p>Loading your spaced repetition intervals...</p>
        </div>
      ) : items.length > 0 ? (
        <div className="revision-sections">
          {/* Due Now Section */}
          <div className="due-now-block">
            <div className="due-heading">
              <h2>⚡ Due For Review ({dueItems.length})</h2>
              {dueItems.length > 0 && (
                <span className="due-sub">Quick 5-minute active recall will keep these in long-term memory.</span>
              )}
            </div>

            {dueItems.length > 0 ? (
              <div className="revision-cards-grid">
                {dueItems.map((item) => (
                  <article key={item.id} className="revision-card due">
                    <div className="card-top">
                      <span className="sub-icon">{item.subject_icon || "📚"}</span>
                      <span className="sub-name">{item.subject_name}</span>
                      <span className="due-pill">Due Now</span>
                    </div>

                    <h3 className="rev-title">{item.topic_name}</h3>

                    <div className="interval-info">
                      <span>Stage {(item.stage ?? 0) + 1} of 6</span>
                      <span>Next interval: {item.interval_days} days</span>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="primary-button full-width"
                        onClick={() => onStartRevisionSession(item.topic_id, item.topic_name)}
                      >
                        Start Revision <span>✦</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="all-caught-up-card">
                <span className="check-mark">✓</span>
                <div>
                  <strong>All caught up for today!</strong>
                  <p>No concepts are currently overdue. Check upcoming schedules below.</p>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Revisions */}
          {upcomingItems.length > 0 && (
            <div className="upcoming-block">
              <h3>Upcoming Revisions</h3>
              <div className="upcoming-list">
                {upcomingItems.map((item) => (
                  <div key={item.id} className="upcoming-row">
                    <div className="up-left">
                      <span className="up-icon">{item.subject_icon || "📚"}</span>
                      <div>
                        <strong>{item.topic_name}</strong>
                        <span>{item.subject_name}</span>
                      </div>
                    </div>
                    <div className="up-right">
                      <span className="due-date">{formatDueNotice(item.due_at)}</span>
                      <button
                        type="button"
                        className="secondary-btn rev-early-btn"
                        onClick={() => onStartRevisionSession(item.topic_id, item.topic_name)}
                      >
                        Revise Early
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon">📖</div>
          <h3>No topics in your revision queue yet</h3>
          <p>Start practicing topics in My Learning to automatically generate adaptive spaced repetition schedules!</p>
        </div>
      )}
    </section>
  );
}
