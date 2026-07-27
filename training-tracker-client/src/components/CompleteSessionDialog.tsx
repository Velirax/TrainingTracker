import { type FormEvent, useEffect, useState } from 'react';
import { getExercises } from '../services/exerciseService';
import type { Exercise } from '../types/exercise';
import type { TrainingSession, TrainingSessionExercise } from '../types/trainingSession';

interface Props {
  session: TrainingSession;
  onClose: () => void;
  onComplete: (
    rating: number | null,
    notes: string | null,
    exercises: TrainingSessionExercise[],
  ) => void;
}

function fieldLabel(field: string): string {
  if (field === 'Duration') return 'Duration (minutes)';
  if (field === 'Distance') return 'Distance (km)';
  return field === 'Pace' ? 'Pace (min/km)' : field;
}

export default function CompleteSessionDialog({ session, onClose, onComplete }: Props) {
  const [rating, setRating] = useState(session.rating?.toString() ?? '');
  const [notes, setNotes] = useState(session.notes ?? '');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [sessionExercises, setSessionExercises] = useState(session.exercises);

  useEffect(() => {
    getExercises(session.sportFolderId).then(setAvailableExercises).catch(() => setAvailableExercises([]));
  }, [session.sportFolderId]);

  function updateExerciseValue(exerciseId: number, field: string, value: string) {
    setSessionExercises((items) => items.map((exercise) => exercise.exerciseId === exerciseId
      ? { ...exercise, trackingValues: { ...exercise.trackingValues, [field]: value } }
      : exercise));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onComplete(rating ? Number(rating) : null, notes || null, sessionExercises);
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="session-dialog completion-dialog" role="dialog" aria-modal="true" aria-labelledby="complete-session-title">
        <div className="session-dialog-header">
          <h2 id="complete-session-title">Complete session</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <p>{session.title} · {session.sessionDate}</p>
        <form onSubmit={submit}>
          <div className="session-dialog-fields">
            <label className="dialog-field">How did it go?
              <select value={rating} onChange={(event) => setRating(event.target.value)}>
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="dialog-field dialog-field-wide">Notes (optional)
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>

          {sessionExercises.length > 0 && <div className="completion-exercises">
            <h3>Final exercise values</h3>
            <p>Adjust what you actually completed before saving.</p>
            {sessionExercises.map((sessionExercise) => {
              const exercise = availableExercises.find((item) => item.id === sessionExercise.exerciseId);
              const fields = exercise?.trackingFields ?? Object.keys(sessionExercise.trackingValues);
              return <div className="session-exercise-entry" key={sessionExercise.exerciseId}>
                <strong>{exercise?.name ?? sessionExercise.exerciseName}</strong>
                {fields.length > 0 && <div className="session-exercise-values">
                  {fields.map((field) => <label key={field}>{fieldLabel(field)}
                    <input
                      type={field === 'Notes' || field === 'Pace' ? 'text' : 'number'}
                      step={field === 'Distance' ? '0.01' : '1'}
                      placeholder={field === 'Pace' ? 'For example: 5:34' : undefined}
                      value={sessionExercise.trackingValues[field] ?? ''}
                      onChange={(event) => updateExerciseValue(sessionExercise.exerciseId, field, event.target.value)}
                    />
                  </label>)}
                </div>}
              </div>;
            })}
          </div>}
          <button type="submit">Mark completed</button>
        </form>
      </section>
    </div>
  );
}
