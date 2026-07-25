import { type SubmitEvent, useEffect, useState } from 'react';import './App.css';
import {
  createSportFolder,
  getSportFolders,
} from './services/sportFolderService';
import type { SportFolder } from './types/sportFolder';


function App() {
  const [sportFolders, setSportFolders] = useState<SportFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState('#3B82F6');
  const [folderIcon, setFolderIcon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  return (
    <main>
      <h1>Training Tracker</h1>
      <p>Plan and track your multi-sport training.</p>

      <section>
        <h2>Create a sport folder</h2>

        <form onSubmit={handleCreateFolder}>
          <label htmlFor="folder-name">Name</label>
          <input
            id="folder-name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
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