import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  EyeOff,
  Cpu,
  Sparkles,
  BookOpen,
  Brain,
  MessageCircle,
  PenTool,
  Sun,
  Moon,
  CheckCircle2,
  HelpCircle,
  Shield
} from 'lucide-react';
import { PrivacyBadge } from '../components/PrivacyBadge';

interface HomeProps {
  onStartTalking: () => void;
  onNavigate: (route: '/' | '/chat' | '/privacy' | '/safety' | '/about') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onStartTalking,
  onNavigate,
  isDarkMode,
  toggleDarkMode,
}) => {
  // Interactive example conversation simulator for Section 5
  const [selectedExample, setSelectedExample] = useState(0);

  const interactiveExamples = [
    {
      label: 'Personal & Venting',
      user: "Aaj bahut ajeeb din tha.",
      samjho: "Hmm… lagta hai aaj ka din thoda zyada bhari raha. Koi specific baat hui ya bas andar se ajeeb lag raha hai? Main sun raha hoon, jo mann mein aaye bol sakte ho.",
      mode: 'Listen Mode'
    },
    {
      label: 'Exam Stress + Personal',
      user: "Kal exam hai aur kuch yaad nahi ho raha. Upar se anxiety ho rahi hai.",
      samjho: "Dono cheezein ek saath chal rahi hain, isliye focus karna aur difficult lag raha hoga. Pehle panic ko thoda side mein rakhte hain. Tum chaho toh pehle thoda mann halka kar sakte ho, ya fir physics ko ek simple 10-minute ke plan se break down karein?",
      mode: 'Mixed Mode'
    },
    {
      label: 'Factual & Learning',
      user: "Explain Faraday's law in simple language.",
      samjho: "Think of Faraday's law as nature's reaction to moving magnets: Jab bhi kisi wire ke coil ke paas magnetic field change hota hai, woh electrons ko dhakka deta hai, creating electric current! Generators aur induction stoves isi par chalte hain.",
      mode: 'Ask Mode'
    },
    {
      label: 'Decision Making',
      user: "Should I change my course?",
      samjho: "Ye bada decision hai aur blindly haan ya naa kehna galat hoga. Aao pehle samjhte hain: Abhi kis cheez se sabse zyada frustration ho rahi hai—course ka syllabus, career options, ya peer pressure?",
      mode: 'Think Mode'
    },
  ];

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-neutral-900 dark:text-neutral-100 selection:bg-samjho-500 selection:text-white flex flex-col font-sans transition-colors duration-200">
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-30 w-full px-6 py-4 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-neutral-200/70 dark:border-neutral-800/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-samjho-600 to-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
            ☼
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
            SAMJHO
            <span className="text-amber-500 font-normal">☼</span>
          </span>
          <div className="ml-2 hidden sm:block">
            <PrivacyBadge />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium">
          <button
            onClick={() => onNavigate('/privacy')}
            className="hidden sm:inline text-neutral-600 dark:text-neutral-300 hover:text-samjho-600 dark:hover:text-samjho-400 transition"
          >
            How Privacy Works
          </button>
          <button
            onClick={() => onNavigate('/safety')}
            className="hidden md:inline text-neutral-600 dark:text-neutral-300 hover:text-samjho-600 dark:hover:text-samjho-400 transition"
          >
            Safety
          </button>
          <button
            onClick={() => onNavigate('/about')}
            className="hidden md:inline text-neutral-600 dark:text-neutral-300 hover:text-samjho-600 dark:hover:text-samjho-400 transition"
          >
            About
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onStartTalking}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-samjho-600 hover:bg-samjho-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Start Talking</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero Section (PRD Section 9 & 29) */}
      <section className="relative px-6 pt-16 pb-20 max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-samjho-50 dark:bg-samjho-950/60 text-samjho-700 dark:text-samjho-300 border border-samjho-200/60 dark:border-samjho-800/40 text-xs font-semibold mb-6 animate-fade-in">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>No Account Required • Zero Cloud Conversation Database</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-4 leading-tight">
          Samjho.
        </h1>
        <p className="text-xl sm:text-2xl text-neutral-600 dark:text-neutral-300 font-medium max-w-2xl mb-4">
          An AI that listens, understands and explains.
        </p>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-xl mb-10 leading-relaxed">
          “A place where I can say anything without having to introduce myself.”
          Your conversations are designed to stay directly on your device.
        </p>

        {/* Primary CTA and Secondary */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onStartTalking}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-samjho-600 hover:bg-samjho-700 text-white text-base font-semibold shadow-float hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Talking</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('/privacy')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-surface-darkCard text-neutral-800 dark:text-neutral-200 border border-neutral-300/80 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-base font-medium transition cursor-pointer"
          >
            How privacy works
          </button>
        </div>

        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
          No signup. No onboarding form. No personal details.
        </p>
      </section>

      {/* Section 2: "You don't always need an answer" (PRD Section 29) */}
      <section className="px-6 py-16 bg-neutral-50/70 dark:bg-surface-darkSubtle/40 border-y border-neutral-200/60 dark:border-neutral-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
            You don't always need an answer.
          </h2>
          <p className="text-base text-neutral-600 dark:text-neutral-400 mb-8">
            Sometimes you just want to say something.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div
              onClick={onStartTalking}
              className="p-5 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:border-samjho-400 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-samjho-600 dark:text-samjho-400 mb-1">
                Factual & Concepts
              </div>
              <div className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                “Explain this concept.”
              </div>
            </div>

            <div
              onClick={onStartTalking}
              className="p-5 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:border-samjho-400 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-samjho-600 dark:text-samjho-400 mb-1">
                Life & Uncertainty
              </div>
              <div className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                “I don't know what I'm doing with my life.”
              </div>
            </div>

            <div
              onClick={onStartTalking}
              className="p-5 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:border-samjho-400 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-samjho-600 dark:text-samjho-400 mb-1">
                Technical & Coding
              </div>
              <div className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                “Help me understand this code.”
              </div>
            </div>

            <div
              onClick={onStartTalking}
              className="p-5 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:border-samjho-400 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-samjho-600 dark:text-samjho-400 mb-1">
                Personal & Venting
              </div>
              <div className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                “Can I tell you something?”
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: "One AI. Many conversations." (PRD Section 29) */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
            One AI. Many conversations.
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            Adapts automatically without forcing you to choose a rigid mode.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-soft transition">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Learn</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Factual, educational, and concept breakdowns with intuition, examples, and formulas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-soft transition">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Think</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Reasoning & decision support. Clarify factors and trade-offs without robotic advice.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-soft transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <PenTool className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Create</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Writing drafts, emails, debugging code, and structuring thoughts naturally.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-soft transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Talk</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Venting and reflection. A place to be heard in English, Hindi, or Hinglish.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: "Privacy by design." (PRD Section 16, 29) */}
      <section className="px-6 py-16 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-800">
            <Lock className="w-3.5 h-3.5" />
            <span>Guaranteed Local Experience</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Privacy by design.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-lg mx-auto mb-10">
            You don't have to give us yourself to talk to AI.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
              <div className="text-emerald-400 font-bold text-lg mb-1">0</div>
              <div className="text-xs text-neutral-300 font-medium">No Account</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
              <div className="text-emerald-400 font-bold text-lg mb-1">0</div>
              <div className="text-xs text-neutral-300 font-medium">No Profile</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
              <div className="text-emerald-400 font-bold text-lg mb-1">0</div>
              <div className="text-xs text-neutral-300 font-medium">No Chat History</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
              <div className="text-emerald-400 font-bold text-lg mb-1">0</div>
              <div className="text-xs text-neutral-300 font-medium">No Tracking</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/60 col-span-2 sm:col-span-1">
              <div className="text-emerald-400 font-bold text-lg mb-1">100%</div>
              <div className="text-xs text-neutral-300 font-medium">Local AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: "Ask anything." Interactive preview (PRD Section 29) */}
      <section className="px-6 py-20 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
            Ask anything.
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            See how Samjho understands context and speaks naturally.
          </p>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {interactiveExamples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedExample(idx)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                selectedExample === idx
                  ? 'bg-samjho-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Interactive Chat Box Mock */}
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-darkCard border border-neutral-200/90 dark:border-neutral-800 shadow-soft max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs text-neutral-400 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <span className="font-semibold text-samjho-600 dark:text-samjho-400">
              {interactiveExamples[selectedExample].mode}
            </span>
            <span>Example preview</span>
          </div>

          <div className="my-4 space-y-4">
            {/* User prompt */}
            <div className="flex justify-end">
              <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2.5 rounded-2xl rounded-tr-xs text-sm">
                {interactiveExamples[selectedExample].user}
              </div>
            </div>

            {/* Samjho response */}
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-samjho-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                ☼
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-800/80 p-4 rounded-2xl rounded-tl-xs text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                {interactiveExamples[selectedExample].samjho}
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onStartTalking}
              className="text-xs font-semibold text-samjho-600 dark:text-samjho-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Try asking this in live chat <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer (PRD Section 29) */}
      <footer className="mt-auto border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white/50 dark:bg-surface-darkCard/50 px-6 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-samjho-600 text-white flex items-center justify-center font-bold text-xs">
              ☼
            </div>
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              Samjho AI
            </span>
            <span className="text-xs text-neutral-400 ml-2">
              samjhoai.in
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
            <button onClick={() => onNavigate('/privacy')} className="hover:text-samjho-600 transition">
              Privacy
            </button>
            <button onClick={() => onNavigate('/safety')} className="hover:text-samjho-600 transition">
              Safety
            </button>
            <button onClick={() => onNavigate('/about')} className="hover:text-samjho-600 transition">
              About
            </button>
            <a
              href="mailto:contact@samjhoai.in"
              className="hover:text-samjho-600 transition"
            >
              Contact
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-6 pt-4 border-t border-neutral-200/40 dark:border-neutral-800/40 text-center text-[11px] text-neutral-400">
          Samjho — because sometimes understanding is more important than answering.
        </div>
      </footer>
    </div>
  );
};
