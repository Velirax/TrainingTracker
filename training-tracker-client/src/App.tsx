import { useEffect, useState } from 'react';
import './App.css';
import DashboardPage from './pages/DashboardPage';
import SportFoldersPage from './pages/SportFoldersPage';
import AuthPage from './components/AuthPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'sports' | 'profile'>('home');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('training-tracker-auth') ?? 'null')?.user ?? null);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const handleExpired = () => { setUser(null); setAuthMessage('Your session expired. Please sign in again.'); };
    window.addEventListener('training-tracker-auth-expired', handleExpired);
    return () => window.removeEventListener('training-tracker-auth-expired', handleExpired);
  }, []);

  if (!user) return <AuthPage initialMessage={authMessage} onAuthenticated={() => { setAuthMessage(''); setUser(JSON.parse(localStorage.getItem('training-tracker-auth') ?? 'null')?.user ?? null); }} />;
  const signOut = () => { localStorage.removeItem('training-tracker-auth'); setUser(null); };

  return (
    <>
      <nav aria-label="Main navigation" className="app-navigation">
        <button className="app-brand" type="button" onClick={() => setActiveTab('home')}>
          <span>TT</span> Training Tracker
        </button>
        <div className="app-navigation-links">
        <button
          aria-current={activeTab === 'home' ? 'page' : undefined}
          className={activeTab === 'home' ? 'app-tab-active' : ''}
          type="button"
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button
          aria-current={activeTab === 'sports' ? 'page' : undefined}
          className={activeTab === 'sports' ? 'app-tab-active' : ''}
          type="button"
          onClick={() => setActiveTab('sports')}
        >
          Sports
        </button>
        <button className={activeTab === 'profile' ? 'app-tab-active' : ''} type="button" onClick={() => setActiveTab('profile')}>Profile</button>
        </div>
        <button className="user-chip" type="button" onClick={() => setActiveTab('profile')}>{user.displayName}</button>
      </nav>

      {activeTab === 'home' ? <DashboardPage /> : activeTab === 'sports' ? <SportFoldersPage /> : <ProfilePage user={user} onSignOut={signOut} />}
    </>
  );
}

export default App;
