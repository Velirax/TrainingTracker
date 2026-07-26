import type { TrainingSession } from '../types/trainingSession';

interface SessionDetailsDialogProps {
  session: TrainingSession;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SessionDetailsDialog({ session, onClose, onEdit, onDelete }: SessionDetailsDialogProps) {
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
          <button type="button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" onClick={onDelete}>
            Delete
          </button>
          <button aria-label="Close session details" type="button" onClick={onClose}>
            Close
          </button>

        </div>

        <dl className="session-details">
          <div><dt>Sport</dt><dd>{session.sportFolderIcon} {session.sportFolderName}</dd></div>
          <div><dt>When</dt><dd>{session.sessionDate} · {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}</dd></div>
          <div><dt>Type</dt><dd>{session.sessionType}</dd></div>
          <div><dt>Status</dt><dd>{session.status}</dd></div>
          {session.rating && <div><dt>Rating</dt><dd>{session.rating}/5</dd></div>}
          {session.notes && <div className="session-details-notes"><dt>Notes</dt><dd>{session.notes}</dd></div>}
        </dl>
      </section>
    </div>
  );
}

export default SessionDetailsDialog;
