"use client";

import { useState } from "react";
import { PreferredLanguage, EducationLevel } from "@/lib/learning/types";

interface OnboardingModalProps {
  initialLanguage?: PreferredLanguage;
  onComplete: (data: {
    education_level: EducationLevel;
    exam_target: string;
    preferred_language: PreferredLanguage;
  }) => Promise<void>;
  onClose: () => void;
}

export default function OnboardingModal({
  initialLanguage = "hinglish",
  onComplete,
  onClose,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("college");
  const [examTarget, setExamTarget] = useState("general");
  const [language, setLanguage] = useState<PreferredLanguage>(initialLanguage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const educationOptions: { label: string; desc: string; val: EducationLevel; icon: string }[] = [
    { label: "College / University", desc: "Engineering, Sciences, CS, or Degree", val: "college", icon: "🎓" },
    { label: "School (9th - 12th)", desc: "CBSE, ICSE, State Boards", val: "school", icon: "🏫" },
    { label: "Competitive Exams", desc: "JEE, NEET, GATE, UPSC, GRE", val: "competitive_exam", icon: "🎯" },
    { label: "Self-Learner / Professional", desc: "Curious, Upskilling, Job Prep", val: "other", icon: "💡" },
  ];

  const languageOptions: { label: string; sub: string; val: PreferredLanguage }[] = [
    { label: "Hinglish", sub: "Mix of Hindi & English for natural intuitive grasp", val: "hinglish" },
    { label: "English", sub: "Standard English for academic and formal prep", val: "english" },
    { label: "Hindi (हिंदी)", sub: "Pure Hindi explanations where preferred", val: "hindi" },
  ];

  async function handleFinish() {
    setIsSubmitting(true);
    try {
      await onComplete({
        education_level: educationLevel,
        exam_target: examTarget,
        preferred_language: language,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="learning-modal-backdrop" role="presentation">
      <div className="learning-modal onboarding-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="onboarding-stepper">
          <div className={`step-dot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className="step-bar" />
          <div className={`step-dot ${step >= 2 ? "active" : ""}`}>2</div>
          <div className="step-bar" />
          <div className={`step-dot ${step >= 3 ? "active" : ""}`}>3</div>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <span className="eyebrow">STEP 1 OF 3</span>
            <h2>What are you currently studying?</h2>
            <p className="onboarding-sub">Samjho tailors explanation depth and examples to your level.</p>

            <div className="option-cards-grid">
              {educationOptions.map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  className={`option-card ${educationLevel === opt.val ? "selected" : ""}`}
                  onClick={() => setEducationLevel(opt.val)}
                >
                  <span className="card-icon">{opt.icon}</span>
                  <div className="card-text">
                    <strong>{opt.label}</strong>
                    <span>{opt.desc}</span>
                  </div>
                  <span className="card-radio">{educationLevel === opt.val ? "●" : "○"}</span>
                </button>
              ))}
            </div>

            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={() => setStep(2)}>
                Continue <span>→</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <span className="eyebrow">STEP 2 OF 3</span>
            <h2>What is your primary learning goal?</h2>
            <p className="onboarding-sub">Choose what you are preparing for or enter a specific target.</p>

            <div className="exam-target-chips">
              {["Concept Understanding", "Semester Exams", "GATE / Engineering", "JEE / NEET", "Placement / Interviews", "Daily Practice"].map((target) => (
                <button
                  key={target}
                  type="button"
                  className={`chip ${examTarget === target ? "active" : ""}`}
                  onClick={() => setExamTarget(target)}
                >
                  {target}
                </button>
              ))}
            </div>

            <label className="onboarding-input-label">
              <span>Or specify custom subject / target exam:</span>
              <input
                type="text"
                placeholder="e.g. Electrical Engineering GATE 2027"
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value)}
              />
            </label>

            <div className="modal-actions space-between">
              <button className="secondary-button" type="button" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="primary-button" type="button" onClick={() => setStep(3)}>
                Continue <span>→</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <span className="eyebrow">STEP 3 OF 3</span>
            <h2>How should Samjho explain things?</h2>
            <p className="onboarding-sub">Select your preferred explanation language. Technical terms remain standard.</p>

            <div className="option-cards-grid">
              {languageOptions.map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  className={`option-card ${language === opt.val ? "selected" : ""}`}
                  onClick={() => setLanguage(opt.val)}
                >
                  <div className="card-text">
                    <strong>{opt.label}</strong>
                    <span>{opt.sub}</span>
                  </div>
                  <span className="card-radio">{language === opt.val ? "●" : "○"}</span>
                </button>
              ))}
            </div>

            <div className="modal-actions space-between">
              <button className="secondary-button" type="button" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleFinish()}
              >
                {isSubmitting ? "Setting up space..." : "Start Learning"} <span>✦</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
