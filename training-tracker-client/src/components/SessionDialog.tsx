import { type SubmitEvent, useEffect, useState } from 'react';
import { getSportFolders } from '../services/sportFolderService';
import { createTrainingSession } from '../services/trainingSessionService';
import type { SportFolder } from '../types/sportFolder';
import type { TrainingSession } from '../types/trainingSession';

interface SessionDialogProps {
  start: Date;
  end: Date;
  onClose: () => void;
  onCreated: (session: TrainingSession) => void;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function SessionDialog({
  start,
  end,
  onClose,
  onCreated,
}: SessionDialogProps) {
  const [sportFolders, setSportFolders] = useState<SportFolder[]>([]);
  const [selectedSportFolderId, setSelectedSportFolderId] = useState('');
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(formatDateForInput(start));
  const [startTime, setStartTime] = useState(formatTimeForInput(start));
  const [endTime, setEndTime] = useState(formatTimeForInput(end));
  const [sessionType, setSessionType] = useState('Practice');
  const [sessionStatus, setSessionStatus] = useState('Planned');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSportFolders() {
      try {
        const folders = await getSportFolders();
        setSportFolders(folders.filter((folder) => !folder.isArchived));
      } catch {
        setFormError('Could not load sport folders.');
      }
    }

    loadSportFolders();
  }, []);

  async function handleCreateSession(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    if (!selectedSportFolderId) {
      setFormError('Choose a sport folder.');
      return;
    }

    setIsSaving(true);

    try {
      const createdSession = await createTrainingSession({
        sportFolderId: Number(selectedSportFolderId),
        title,
        sessionDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        sessionType,
        status: sessionStatus,
        rating: rating ? Number(rating) : null,
        notes: notes || null,
      });

      onCreated(createdSession);
    } catch {
      setFormError('Could not create the training session.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="session-dialog-title"
        aria-modal="true"
        className="session-dialog"
        role="dialog"
      >
        <div className="session-dialog-header">
          <h2 id="session-dialog-title">New training session</h2>
          <button
            aria-label="Close session dialog"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleCreateSession}>
          <p>
            Selected: {start.toLocaleString()} – {end.toLocaleString()}
          </p>

          <div className="session-dialog-fields">
            <div className="dialog-field dialog-field-wide">
              <label htmlFor="dialog-session-sport">Sport</label>
              <select id="dialog-session-sport" value={selectedSportFolderId} onChange={(event) => setSelectedSportFolderId(event.target.value)} required>
                <option value="">Choose a sport</option>
                {sportFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.icon} {folder.name}</option>
                ))}
              </select>
            </div>

            <div className="dialog-field dialog-field-wide">
              <label htmlFor="dialog-session-title">Title</label>
              <input id="dialog-session-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>

            <div className="dialog-field">
              <label htmlFor="dialog-session-date">Date</label>
              <input id="dialog-session-date" type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} required />
            </div>

            <div className="dialog-field">
              <label htmlFor="dialog-session-start-time">Start time</label>
              <input id="dialog-session-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </div>

            <div className="dialog-field">
              <label htmlFor="dialog-session-end-time">End time</label>
              <input id="dialog-session-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </div>

            <div className="dialog-field">
              <label htmlFor="dialog-session-type">Session type</label>
              <select id="dialog-session-type" value={sessionType} onChange={(event) => setSessionType(event.target.value)}>
                <option>Practice</option><option>Workout</option><option>Match</option><option>Casual play</option><option>Cardio</option><option>Recovery</option><option>Other</option>
              </select>
            </div>

            <div className="dialog-field">
              <label htmlFor="dialog-session-status">Status</label>
              <select id="dialog-session-status" value={sessionStatus} onChange={(event) => setSessionStatus(event.target.value)}>
                <option>Planned</option><option>Completed</option>
              </select>
            </div>

            <div className="dialog-field">
              <label htmlFor="dialog-session-rating">Rating</label>
              <select id="dialog-session-rating" value={rating} onChange={(event) => setRating(event.target.value)}>
                <option value="">No rating</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
              </select>
            </div>

            <div className="dialog-field dialog-field-wide">
              <label htmlFor="dialog-session-notes">Notes (optional)</label>
              <textarea id="dialog-session-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create session'}
          </button>

          {formError && <p role="alert">{formError}</p>}
        </form>
      </section>
    </div>
  );
}

export default SessionDialog;
