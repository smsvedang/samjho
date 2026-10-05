import React, { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { ChatPage } from './pages/Chat';
import { Privacy } from './pages/Privacy';
import { Safety } from './pages/Safety';
import { About } from './pages/About';

type AppRoute = '/' | '/chat' | '/privacy' | '/safety' | '/about';

export const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname as AppRoute;
      if (['/chat', '/privacy', '/safety', '/about'].includes(path)) {
        return path;
      }
    }
    return '/';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('samjho_theme') === 'dark' ||
        (!localStorage.getItem('samjho_theme') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return true;
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Sync theme with document class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('samjho_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('samjho_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync URL history state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as AppRoute;
      if (['/', '/chat', '/privacy', '/safety', '/about'].includes(path)) {
        setRoute(path);
      } else {
        setRoute('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // PWA Install prompt listener (PRD Section 33)
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const navigate = (newRoute: AppRoute) => {
    setRoute(newRoute);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', newRoute);
      window.scrollTo(0, 0);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-200">
      {/* PWA Floating Install Banner if prompt available */}
      {deferredPrompt && (
        <div className="fixed bottom-4 left-4 z-40 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs animate-slide-up border border-neutral-700 dark:border-neutral-200">
          <span>Add Samjho to Home Screen</span>
          <button
            onClick={handleInstallPWA}
            className="px-3 py-1 rounded-xl bg-samjho-600 text-white text-xs font-semibold hover:bg-samjho-700 transition cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={() => setDeferredPrompt(null)}
            className="text-neutral-400 hover:text-neutral-200 text-xs cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Route Views */}
      {route === '/' && (
        <Home
          onStartTalking={() => navigate('/chat')}
          onNavigate={navigate}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}

      {route === '/chat' && (
        <ChatPage
          onNavigate={navigate}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}

      {route === '/privacy' && (
        <Privacy
          onBack={() => navigate('/')}
          onStartTalking={() => navigate('/chat')}
        />
      )}

      {route === '/safety' && (
        <Safety
          onBack={() => navigate('/')}
          onStartTalking={() => navigate('/chat')}
        />
      )}

      {route === '/about' && (
        <About
          onBack={() => navigate('/')}
          onStartTalking={() => navigate('/chat')}
        />
      )}
    </div>
  );
};
