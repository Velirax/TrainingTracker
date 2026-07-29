import { useEffect, useState } from 'react';
import './App.css';
import DashboardPage from './pages/DashboardPage';
import SportFoldersPage from './pages/SportFoldersPage';
import AuthPage from './components/AuthPage';
import ProfilePage from './pages/ProfilePage';

function getStoredTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('training-tracker-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'sports' | 'profile'>('home');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('training-tracker-auth') ?? 'null')?.user ?? null);
  const [authMessage, setAuthMessage] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(getStoredTheme);

  useEffect(() => {
    const handleExpired = () => { setUser(null); setAuthMessage('Your session expired. Please sign in again.'); };
    window.addEventListener('training-tracker-auth-expired', handleExpired);
    return () => window.removeEventListener('training-tracker-auth-expired', handleExpired);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('training-tracker-theme', theme);
  }, [theme]);

  if (!user) return <AuthPage initialMessage={authMessage} onAuthenticated={() => { setAuthMessage(''); setUser(JSON.parse(localStorage.getItem('training-tracker-auth') ?? 'null')?.user ?? null); }} />;
  const signOut = () => { localStorage.removeItem('training-tracker-auth'); setUser(null); };
  const initials = user.displayName.slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <nav aria-label="Main navigation" className="rail">
        <button className="brand" type="button" onClick={() => setActiveTab('home')}>TT</button>
        <div className="rail-nav">
          <button
            aria-current={activeTab === 'home' ? 'page' : undefined}
            className="rail-btn"
            type="button"
            onClick={() => setActiveTab('home')}
          >
            <svg viewBox="0 0 24 24"><rect height="17" rx="2" width="18" x="3" y="4" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
            <span>Home</span>
          </button>
          <button
            aria-current={activeTab === 'sports' ? 'page' : undefined}
            className="rail-btn"
            type="button"
            onClick={() => setActiveTab('sports')}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" /></svg>
            <span>Sports</span>
          </button>
          <button
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            className="rail-btn"
            type="button"
            onClick={() => setActiveTab('profile')}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" /></svg>
            <span>Profile</span>
          </button>
        </div>
        <div className="rail-foot">
          <button
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={theme === 'dark'}
            className="theme-switch"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            type="button"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          />
          <button className="avatar-chip" type="button" onClick={() => setActiveTab('profile')}>{initials}</button>
        </div>
      </nav>

      {activeTab === 'home'
        ? <DashboardPage />
        : activeTab === 'sports'
          ? <SportFoldersPage />
          : <ProfilePage user={user} onSignOut={signOut} />}
    </div>
  );
}

export default App;
