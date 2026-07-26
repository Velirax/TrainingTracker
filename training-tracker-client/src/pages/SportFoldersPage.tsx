import { useEffect, useState } from 'react';
import '../App.css';
import SportFolderDetail from '../components/SportFolderDetail';
import { getSportFolders } from '../services/sportFolderService';
import type { SportFolder } from '../types/sportFolder';

function SportFoldersPage() {
  const [sports, setSports] = useState<SportFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<SportFolder | null>(null);

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
    <main>
      <header className="page-header">
        <span className="page-kicker">Your training library</span>
        <h1>Sports</h1>
        <p>Explore sessions, exercises, and progress for every sport.</p>
      </header>

      <section className="sport-catalog-section">
        <div className="section-heading">
          <div><span className="section-kicker">All sports</span><h2>Choose a sport</h2></div>
          <span className="section-count">{activeSports.length} available</span>
        </div>

        {activeSports.length === 0 ? (
          <p>No sports are available yet.</p>
        ) : (
          <ul className="sport-catalog-list">
            {activeSports.map((sport) => (
              <li key={sport.id}>
                <button
                  className="sport-folder-button"
                  style={{ color: sport.color }}
                  type="button"
                  onClick={() => setSelectedSport(sport)}
                >
                  <span>{sport.icon} {sport.name}</span>
                  <small>
                    {sport.sessionCount} {sport.sessionCount === 1 ? 'session' : 'sessions'}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default SportFoldersPage;
