import React, { useState } from 'react';
import { ShieldCheck, X, Lock } from 'lucide-react';

interface PrivacyBadgeProps {
  engineType?: string;
  stage?: string;
  externalSearchEnabled?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shadow-2xs"
        title="100% Private & Anonymous"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold tracking-wide">100% Private</span>
        <Lock className="w-3 h-3 ml-0.5 opacity-70" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-surface-darkCard rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up text-left">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Safe & Anonymous
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Zero identity required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  🔒 No Account, No Profile
                </p>
                <p>
                  Samjho mein koi email, phone number ya login nahi chahiye. Aap bina kisi pehchan ke direct baat kar sakte hain.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  💬 Ephemeral Messages
                </p>
                <p>
                  Aapki baatein database ya history mein store nahi hoti. Tab band karne ya Clear karne par sab khatam ho jata hai.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition cursor-pointer"
              >
                Samajh gaya
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
