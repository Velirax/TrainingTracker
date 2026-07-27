import { type CSSProperties, useEffect, useState } from 'react';
import '../App.css';
import sportHoverSprite from '../assets/sport-hover-sprite.jpg';
import SportFolderDetail from '../components/SportFolderDetail';
import { getSportFolders } from '../services/sportFolderService';
import type { SportFolder } from '../types/sportFolder';

const sportImagePositions: Record<string, string> = {
  Tennis: '0% 0%',
  Padel: '50% 0%',
  Basketball: '100% 0%',
  Calisthenics: '0% 50%',
  Cycling: '50% 50%',
  Football: '100% 50%',
  Hiking: '0% 100%',
  Walking: '50% 100%',
  Yoga: '100% 100%',
  Gym: '0% 50%',
  Running: '50% 100%',
  Swimming: '100% 100%',
};

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
    <main className="sports-page">
      <header className="page-header">
        <span className="page-kicker">Training library</span>
        <h1><span>Explore</span> your sports.</h1>
        <p>Sessions, exercises, and progress for every way you train.</p>
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
              <li
                key={sport.id}
                style={{
                  '--sport-color': sport.color,
                  '--sport-background': `url(${sportHoverSprite})`,
                  '--sport-background-position': sportImagePositions[sport.name] ?? '50% 50%',
                } as CSSProperties}
              >
                <button
                  className="sport-folder-button"
                  type="button"
                  onClick={() => setSelectedSport(sport)}
                >
                  <span className="sport-card-title">
                    <i aria-hidden="true">{sport.name.charAt(0)}</i>
                    {sport.name}
                  </span>
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
