import { type SubmitEvent, useEffect, useState } from 'react';
import { updateSportFolder } from '../services/sportFolderService';
import { getTrainingSessionsForSportFolder } from '../services/trainingSessionService';
import type { SportFolder } from '../types/sportFolder';
import type { TrainingSession } from '../types/trainingSession';

interface SportFolderDetailProps {
  folder: SportFolder;
  onBack: () => void;
  onUpdated: (folder: SportFolder) => void;
}

function formatDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return hours > 0
    ? minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    : `${minutes} min`;
}

function SportFolderDetail({ folder, onBack, onUpdated }: SportFolderDetailProps) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description ?? '');
  const [color, setColor] = useState(folder.color);
  const [icon, setIcon] = useState(folder.icon ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        setSessions(await getTrainingSessionsForSportFolder(folder.id));
      } catch {
        setError('Could not load sessions for this sport.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSessions();
  }, [folder.id]);

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      onUpdated(await updateSportFolder(folder.id, {
        name,
        description: description || null,
        color,
        icon: icon || null,
        isArchived: folder.isArchived,
      }));
      setIsEditing(false);
    } catch {
      setError('Could not update this sport.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main>
      <button type="button" onClick={onBack}>Back to sports</button>

      <section className="sport-detail-header">
        {isEditing ? (
          <form onSubmit={handleSave}>
            <label htmlFor="edit-sport-name">Name</label>
            <input id="edit-sport-name" value={name} onChange={(event) => setName(event.target.value)} required />
            <label htmlFor="edit-sport-description">Description</label>
            <textarea id="edit-sport-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <label htmlFor="edit-sport-color">Color</label>
            <input id="edit-sport-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            <label htmlFor="edit-sport-icon">Icon</label>
            <input id="edit-sport-icon" value={icon} onChange={(event) => setIcon(event.target.value)} />
            <button disabled={isSaving} type="submit">Save changes</button>
          </form>
        ) : (
          <>
            <h1 style={{ color: folder.color }}>
              {folder.icon} {folder.name}
            </h1>
            {folder.description && <p>{folder.description}</p>}
            <div className="sport-detail-actions">
              <button type="button" onClick={() => setIsEditing(true)}>Edit sport</button>
            </div>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </section>

      <section>
        <h2>Session history</h2>

        {isLoading ? (
          <p>Loading sessions...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : sessions.length === 0 ? (
          <p>No sessions have been created for this sport yet.</p>
        ) : (
          <ul className="sport-session-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <div>
                  <strong>{session.title}</strong>
                  <span>
                    {session.sessionDate} · {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}
                  </span>
                </div>
                <div className="sport-session-meta">
                  <span>{session.status}</span>
                  <span>{formatDuration(session.durationMinutes)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default SportFolderDetail;
