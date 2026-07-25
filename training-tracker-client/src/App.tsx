import { useEffect, useState } from 'react';
import './App.css';
import { getSportFolders } from './services/sportFolderService';
import type { SportFolder } from './types/sportFolder';

function App() {
  const [sportFolders, setSportFolders] = useState<SportFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSportFolders() {
      try {
        const folders = await getSportFolders();
        setSportFolders(folders);
      } catch {
        setError('Unable to load sport folders.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSportFolders();
  }, []);

  if (isLoading) {
    return <main>Loading sport folders...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  return (
    <main>
      <h1>Training Tracker</h1>
      <p>Plan and track your multi-sport training.</p>

      <section>
        <h2>My sport folders</h2>

        {sportFolders.length === 0 ? (
          <p>You have no sport folders yet.</p>
        ) : (
          <ul>
            {sportFolders.map((folder) => (
              <li key={folder.id}>
                <span style={{ color: folder.color }}>
                  {folder.icon} {folder.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;