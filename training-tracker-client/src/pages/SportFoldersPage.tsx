import { type CSSProperties, useEffect, useState } from 'react';
import '../App.css';
import SportFolderDetail from '../components/SportFolderDetail';
import { getSportFolders } from '../services/sportFolderService';
import { getTrainingSessionsForSportFolder } from '../services/trainingSessionService';
import type { SportFolder } from '../types/sportFolder';

interface FolderStats {
  hours: number;
  kcal: number;
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return String(Math.round(value));
}

function SportFoldersPage() {
  const [sports, setSports] = useState<SportFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<SportFolder | null>(null);
  const [folderStats, setFolderStats] = useState<Record<number, FolderStats>>({});

  useEffect(() => {
    async function loadSports() {
      try {
        setSports(await getSportFolders());
      } catch {
        setError('Unable to load sports.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSports();
  }, []);

  useEffect(() => {
    async function loadFolderStats() {
      const entries = await Promise.all(sports.map(async (sport) => {
        try {
          const sessions = await getTrainingSessionsForSportFolder(sport.id);
          const completedSessions = sessions.filter((session) => session.status === 'Completed');
          const hours = completedSessions.reduce((total, session) => total + session.durationMinutes, 0) / 60;
          const kcal = completedSessions.reduce((total, session) => total + session.calories, 0);
          return [sport.id, { hours, kcal }] as const;
        } catch {
          return [sport.id, { hours: 0, kcal: 0 }] as const;
        }
      }));

      setFolderStats(Object.fromEntries(entries));
    }

    if (sports.length > 0) {
      loadFolderStats();
    }
  }, [sports]);

  if (isLoading) {
    return <main>Loading sports...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  if (selectedSport) {
    return (
      <SportFolderDetail
        folder={selectedSport}
        onBack={() => setSelectedSport(null)}
        onUpdated={(updatedSport) => {
          setSports((currentSports) => currentSports.map((sport) =>
            sport.id === updatedSport.id ? updatedSport : sport));
          setSelectedSport(updatedSport);
        }}
      />
    );
  }

  const activeSports = sports
    .filter((sport) => !sport.isArchived)
    .sort((first, second) =>
      second.sessionCount - first.sessionCount ||
      first.name.localeCompare(second.name));

  return (
    <main className="sports-page">
      <header className="page-header">
        <span className="page-kicker">Training library</span>
        <h1><span>Explore</span> your sports.</h1>
        <p>Sessions, exercises, and progress for every way you train.</p>
      </header>

      {activeSports.length === 0 ? (
        <p>No sports are available yet.</p>
      ) : (
        <div className="folder-grid">
          {activeSports.map((sport) => {
            const stats = folderStats[sport.id];

            return (
              <button
                className="folder-card"
                key={sport.id}
                style={{ '--sport-color': sport.color } as CSSProperties}
                type="button"
                onClick={() => setSelectedSport(sport)}
              >
                <div className="folder-tab" style={{ background: sport.color }} />
                <div className="folder-body">
                  <p className="name">{sport.icon ?? sport.name.charAt(0)} {sport.name}</p>
                  <p className="meta">{sport.sessionCount} {sport.sessionCount === 1 ? 'session' : 'sessions'} all-time</p>
                  <div className="folder-stats">
                    <div>{sport.sessionCount}<span>Sessions</span></div>
                    <div>{stats ? stats.hours.toFixed(1) : '–'}<span>Hours</span></div>
                    <div>{stats ? formatCompact(stats.kcal) : '–'}<span>Kcal</span></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default SportFoldersPage;
