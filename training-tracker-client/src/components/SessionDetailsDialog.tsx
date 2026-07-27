import type { TrainingSession } from '../types/trainingSession';

interface SessionDetailsDialogProps {
  session: TrainingSession;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteFuture: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onDuplicateNextWeek: () => void;
  onMakeRecurring: () => void;
}

function SessionDetailsDialog({ session, onClose, onEdit, onDelete, onDeleteFuture, onComplete, onCancel, onDuplicate, onDuplicateNextWeek, onMakeRecurring }: SessionDetailsDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="session-details-title"
        aria-modal="true"
        className="session-dialog session-details-dialog"
        role="dialog"
      >
        <div className="session-dialog-header">
          <h2 id="session-details-title">{session.title}</h2>
          <button aria-label="Close session details" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <dl className="session-details">
          <div><dt>Sport</dt><dd>{session.sportFolderIcon} {session.sportFolderName}</dd></div>
          <div><dt>When</dt><dd>{session.sessionDate} · {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}</dd></div>
          <div><dt>Type</dt><dd>{session.sessionType}</dd></div>
          <div><dt>Status</dt><dd>{session.status}</dd></div>
          {session.recurrenceGroupId && <div><dt>Schedule</dt><dd>Weekly recurring session</dd></div>}
          {session.rating && <div><dt>Rating</dt><dd>{session.rating}/5</dd></div>}
          {session.notes && <div className="session-details-notes"><dt>Notes</dt><dd>{session.notes}</dd></div>}
        </dl>

        <div className="session-details-actions">
          {session.status === 'Planned' && <button type="button" onClick={onComplete}>Complete session</button>}
          {session.status === 'Planned' && <button className="secondary-button" type="button" onClick={onCancel}>Cancel session</button>}
          <button className="secondary-button" type="button" onClick={onDuplicate}>Duplicate</button>
          <button className="secondary-button" type="button" onClick={onDuplicateNextWeek}>Duplicate next week</button>
          <button className="secondary-button" type="button" onClick={onEdit}>Edit</button>
          {!session.recurrenceGroupId && <button className="secondary-button" type="button" onClick={onMakeRecurring}>Make recurring</button>}
          <button className="danger-button" type="button" onClick={onDelete}>Delete</button>
          {session.recurrenceGroupId && <button className="danger-button" type="button" onClick={onDeleteFuture}>Delete this and future</button>}
        </div>

        {session.exercises.length > 0 && (
          <section className="session-details-exercises">
            <h3>Exercises performed</h3>
            <ul>
              {session.exercises.map((exercise) => (
                <li key={exercise.exerciseId}>
                  <strong>{exercise.exerciseName}</strong>
                  {Object.keys(exercise.trackingValues).length > 0 && (
                    <span>
                      {Object.entries(exercise.trackingValues)
                        .filter(([, value]) => value)
                        .map(([field, value]) => {
                          if (field === 'Duration') {
                            return `${field}: ${value} min`;
                          }

                          if (field === 'Distance') {
                            return `${field}: ${value} km`;
                          }

                          return field === 'Pace'
                            ? `${field}: ${value} min/km`
                            : `${field}: ${value}`;
                        })
                        .join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  );
}

export default SessionDetailsDialog;
