import React, { useState, useEffect } from 'react';
import { Landing } from './screens/Landing';
import { Auth } from './screens/Auth';
import { Dashboard } from './screens/Dashboard';
import { Studio } from './screens/Studio';
import { NewProjectModal } from './components/NewProjectModal';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'auth' | 'dashboard' | 'studio'>('landing');
  const [currentBrandSlug, setCurrentBrandSlug] = useState<string>('instacart');
  const [userEmail, setUserEmail] = useState<string>('alex.fondateur@startup.io');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleNavigate = (screen: 'landing' | 'auth' | 'dashboard' | 'studio', slug?: string) => {
    if (slug) setCurrentBrandSlug(slug);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (email?: string) => {
    if (email) setUserEmail(email);
  };

  const handleCreateProject = (brandSlug: string, customName?: string) => {
    setCurrentBrandSlug(brandSlug);
    setCurrentScreen('studio');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {currentScreen === 'landing' && (
        <Landing
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'auth' && (
        <Auth
          onNavigate={handleNavigate}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'dashboard' && (
        <Dashboard
          onNavigate={handleNavigate}
          onOpenNewProject={() => setIsNewProjectModalOpen(true)}
          userEmail={userEmail}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'studio' && (
        <Studio
          slug={currentBrandSlug}
          onNavigate={handleNavigate}
          theme={theme}
        />
      )}

      {/* Global New Project Wizard Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
