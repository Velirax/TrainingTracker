interface RecurrenceDialogProps {
  title: string;
  onClose: () => void;
  onCreate: (occurrences: number) => void;
}

function RecurrenceDialog({ title, onClose, onCreate }: RecurrenceDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-modal="true" className="session-dialog session-details-dialog" role="dialog" aria-labelledby="recurrence-dialog-title">
        <div className="session-dialog-header">
          <h2 id="recurrence-dialog-title">Make recurring</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <p>Create future weekly planned sessions for <strong>{title}</strong>.</p>
        <div className="recurrence-options">
          {[2, 4, 8, 12].map((occurrences) => (
            <button key={occurrences} type="button" onClick={() => onCreate(occurrences)}>
              Repeat for {occurrences} weeks
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default RecurrenceDialog;
