import { useState } from 'react';
import './App.css';
import DashboardPage from './pages/DashboardPage';
import SportFoldersPage from './pages/SportFoldersPage';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'sports'>('home');

  return (
    <>
      <nav aria-label="Main navigation" className="app-navigation">
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
      </nav>

      {activeTab === 'home' ? <DashboardPage /> : <SportFoldersPage />}
    </>
  );
}

export default App;
