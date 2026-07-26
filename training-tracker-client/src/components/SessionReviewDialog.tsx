import { useState } from 'react';
import { updateTrainingSession } from '../services/trainingSessionService';
import type { TrainingSession } from '../types/trainingSession';

interface SessionReviewDialogProps {
  sessions: TrainingSession[];
  onClose: () => void;
  onReviewed: (session: TrainingSession) => void;
}

function SessionReviewDialog({
  sessions,
  onClose,
  onReviewed,
}: SessionReviewDialogProps) {
  const [savingSessionId, setSavingSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reviewSession(session: TrainingSession, status: string) {
    setSavingSessionId(session.id);
    setError(null);

    try {
      const updatedSession = await updateTrainingSession(session.id, {
        sportFolderId: session.sportFolderId,
        title: session.title,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        sessionType: session.sessionType,
        status,
        rating: session.rating,
        notes: session.notes,
      });

      onReviewed(updatedSession);
    } catch {
      setError('Could not update this training session. Please try again.');
    } finally {
      setSavingSessionId(null);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="session-review-title"
        aria-modal="true"
        className="session-dialog session-review-dialog"
        role="dialog"
      >
        <div className="session-dialog-header">
          <h2 id="session-review-title">Review past sessions</h2>
          <button type="button" onClick={onClose}>Review later</button>
        </div>

        <p className="session-review-intro">
          Tell us what happened with these sessions that were still planned.
        </p>

        <div className="session-review-list">
          {sessions.map((session) => (
            <article key={session.id} className="session-review-item">
              <div>
                <strong>{session.sportFolderIcon} {session.title}</strong>
                <span>
                  {session.sessionDate} · {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}
                </span>
              </div>

              <div className="session-review-actions">
                <button
                  disabled={savingSessionId === session.id}
                  type="button"
                  onClick={() => reviewSession(session, 'Completed')}
                >
                  Completed
                </button>
                <button
                  className="secondary-button"
                  disabled={savingSessionId === session.id}
                  type="button"
                  onClick={() => reviewSession(session, 'Cancelled')}
                >
                  Cancelled
                </button>
              </div>
            </article>
          ))}
        </div>

        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}

export default SessionReviewDialog;
