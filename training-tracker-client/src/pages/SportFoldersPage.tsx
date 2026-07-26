import { type SubmitEvent, useEffect, useState } from 'react';
import '../App.css';
import {
  createSportFolder,
  getSportFolders,
} from '../services/sportFolderService';
import type { SportFolder } from '../types/sportFolder';
import SportFolderDetail from '../components/SportFolderDetail';

const starterSports = [
  { name: 'Running', icon: '🏃', color: '#F7963B' },
  { name: 'Cycling', icon: '🚴', color: '#16A34A' },
  { name: 'Swimming', icon: '🏊', color: '#0EA5E9' },
  { name: 'Gym', icon: '🏋️', color: '#DC2626' },
  { name: 'Calisthenics', icon: '🤸', color: '#7C3AED' },
  { name: 'Tennis', icon: '🎾', color: '#2563EB' },
  { name: 'Padel', icon: '🏓', color: '#0891B2' },
  { name: 'Football', icon: '⚽', color: '#15803D' },
  { name: 'Basketball', icon: '🏀', color: '#EA580C' },
  { name: 'Hiking', icon: '🥾', color: '#65A30D' },
  { name: 'Yoga', icon: '🧘', color: '#9333EA' },
  { name: 'Walking', icon: '🚶', color: '#64748B' },
];


function SportFoldersPage() {
  const [sportFolders, setSportFolders] = useState<SportFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState('#3B82F6');
  const [folderIcon, setFolderIcon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<SportFolder | null>(null);
  const [addingStarterSport, setAddingStarterSport] = useState<string | null>(null);

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


  async function handleCreateFolder(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      const createdFolder = await createSportFolder({
        name: folderName,
        description: folderDescription || null,
        color: folderColor,
        icon: folderIcon || null,
      });

      setSportFolders((currentFolders) => [
        ...currentFolders,
        createdFolder,
      ]);

      setFolderName('');
      setFolderDescription('');
      setFolderColor('#3B82F6');
      setFolderIcon('');
    } catch {
      setFormError('Could not create the sport folder.');
    }
  }
  if (isLoading) {
    return <main>Loading sport folders...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  async function handleAddStarterSport(
    sport: (typeof starterSports)[number],
  ) {
    setAddingStarterSport(sport.name);
    setFormError(null);

    try {
      const createdFolder = await createSportFolder({
        name: sport.name,
        description: null,
        color: sport.color,
        icon: sport.icon,
      });

      setSportFolders((currentFolders) => [...currentFolders, createdFolder]);
    } catch {
      setFormError('Could not add this starter sport.');
    } finally {
      setAddingStarterSport(null);
    }
  }

  if (selectedFolder) {
    return (
      <SportFolderDetail
        folder={selectedFolder}
        onBack={() => setSelectedFolder(null)}
        onUpdated={(updatedFolder) => {
          setSportFolders((currentFolders) =>
            currentFolders.map((folder) =>
              folder.id === updatedFolder.id ? updatedFolder : folder,
            ),
          );
          setSelectedFolder(updatedFolder.isArchived ? null : updatedFolder);
        }}
      />
    );
  }

  const availableStarterSports = starterSports.filter((starterSport) =>
    !sportFolders.some(
      (folder) => folder.name.toLowerCase() === starterSport.name.toLowerCase(),
    ),
  );
  const activeSportFolders = sportFolders.filter((folder) => !folder.isArchived);

  return (
    <main>
      <h1>Training Tracker</h1>
      <p>Plan and track your multi-sport training.</p>

      {availableStarterSports.length > 0 && (
        <section>
          <h2>Add a sport</h2>
          <p>Start with a common sport, then customize it whenever you like.</p>
          <div className="starter-sport-list">
            {availableStarterSports.map((sport) => (
              <button
                key={sport.name}
                className="starter-sport-button"
                disabled={addingStarterSport !== null}
                style={{ borderColor: sport.color }}
                type="button"
                onClick={() => handleAddStarterSport(sport)}
              >
                {sport.icon} {sport.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Create a sport folder</h2>

        <form onSubmit={handleCreateFolder}>
          <label htmlFor="folder-name">Name</label>
          <input
            id="folder-name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            required
          />
          <label htmlFor="folder-description">Description</label>
          <textarea
            id="folder-description"
            value={folderDescription}
            onChange={(event) => setFolderDescription(event.target.value)}
          />

          <label htmlFor="folder-color">Color</label>
          <input
            id="folder-color"
            type="color"
            value={folderColor}
            onChange={(event) => setFolderColor(event.target.value)}
          />

          <label htmlFor="folder-icon">Icon</label>
          <input
            id="folder-icon"
            value={folderIcon}
            onChange={(event) => setFolderIcon(event.target.value)}
          />

          <button type="submit">Create folder</button>
          {formError && <p role="alert">{formError}</p>}
        </form>
      </section>

      <section>
        <h2>My sport folders</h2>

        {activeSportFolders.length === 0 ? (
          <p>You have no sport folders yet.</p>
        ) : (
          <ul>
            {activeSportFolders.map((folder) => (
              <li key={folder.id}>
                <button
                  className="sport-folder-button"
                  style={{ color: folder.color }}
                  type="button"
                  onClick={() => setSelectedFolder(folder)}
                >
                  {folder.icon} {folder.name}
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
