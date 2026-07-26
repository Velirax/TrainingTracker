import { type SubmitEvent, useEffect, useState } from 'react';
import {
  createExercise,
  getExercises,
  updateExercise,
} from '../services/exerciseService';
import { updateSportFolder } from '../services/sportFolderService';
import { getTrainingSessionsForSportFolder } from '../services/trainingSessionService';
import type { Exercise } from '../types/exercise';
import type { SportFolder } from '../types/sportFolder';
import type { TrainingSession } from '../types/trainingSession';

interface SportFolderDetailProps {
  folder: SportFolder;
  onBack: () => void;
  onUpdated: (folder: SportFolder) => void;
}

const availableTrackingFields = [
  'Sets',
  'Repetitions',
  'Weight',
  'Duration',
  'Distance',
  'Pace',
  'Elevation',
  'Calories',
  'Notes',
];

const exercisesPerPage = 6;

function formatDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return hours > 0
    ? minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    : `${minutes} min`;
}

function SportFolderDetail({ folder, onBack, onUpdated }: SportFolderDetailProps) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [areExercisesLoading, setAreExercisesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description ?? '');
  const [color, setColor] = useState(folder.color);
  const [icon, setIcon] = useState(folder.icon ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDescription, setExerciseDescription] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState('');
  const [exerciseDefaultUnit, setExerciseDefaultUnit] = useState('');
  const [trackingFields, setTrackingFields] = useState<string[]>([]);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [configuringExerciseId, setConfiguringExerciseId] = useState<number | null>(null);
  const [configuredTrackingFields, setConfiguredTrackingFields] = useState<string[]>([]);
  const [isSavingExerciseFields, setIsSavingExerciseFields] = useState(false);
  const [exercisePage, setExercisePage] = useState(1);

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

  useEffect(() => {
    async function loadExercises() {
      try {
        setExercises(await getExercises(folder.id));
      } catch {
        setExerciseError('Could not load exercises for this sport.');
      } finally {
        setAreExercisesLoading(false);
      }
    }

    loadExercises();
  }, [folder.id]);

  useEffect(() => {
    setExercisePage(1);
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

  async function handleCreateExercise(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingExercise(true);
    setExerciseError(null);

    try {
      const exercise = await createExercise({
        name: exerciseName,
        description: exerciseDescription || null,
        category: exerciseCategory || null,
        defaultUnit: exerciseDefaultUnit || null,
        trackingFields,
        sportFolderIds: [folder.id],
      });

      setExercises((currentExercises) =>
        [...currentExercises, exercise].sort((first, second) =>
          first.name.localeCompare(second.name)),
      );
      setExerciseName('');
      setExerciseDescription('');
      setExerciseCategory('');
      setExerciseDefaultUnit('');
      setTrackingFields([]);
      setExercisePage(1);
    } catch {
      setExerciseError('Could not create this exercise.');
    } finally {
      setIsCreatingExercise(false);
    }
  }

  const exercisePageCount = Math.max(1, Math.ceil(exercises.length / exercisesPerPage));
  const visibleExercises = exercises.slice(
    (exercisePage - 1) * exercisesPerPage,
    exercisePage * exercisesPerPage,
  );

  function toggleTrackingField(
    field: string,
    currentFields: string[],
    setFields: (fields: string[]) => void,
  ) {
    setFields(
      currentFields.includes(field)
        ? currentFields.filter((currentField) => currentField !== field)
        : [...currentFields, field],
    );
  }

  async function handleSaveExerciseFields(exercise: Exercise) {
    setIsSavingExerciseFields(true);
    setExerciseError(null);

    try {
      const updatedExercise = await updateExercise(exercise.id, {
        name: exercise.name,
        description: exercise.description,
        category: exercise.category,
        defaultUnit: exercise.defaultUnit,
        trackingFields: configuredTrackingFields,
        sportFolderIds: exercise.sportFolderIds,
      });

      setExercises((currentExercises) => currentExercises.map((currentExercise) =>
        currentExercise.id === updatedExercise.id ? updatedExercise : currentExercise));
      setConfiguringExerciseId(null);
    } catch {
      setExerciseError('Could not update the exercise fields.');
    } finally {
      setIsSavingExerciseFields(false);
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
        <h2>Exercise library</h2>
        <p>Create exercises for {folder.name}. Shared exercises can be added to other sports later.</p>

        <form className="exercise-create-form" onSubmit={handleCreateExercise}>
          <label htmlFor="exercise-name">Name</label>
          <input
            id="exercise-name"
            value={exerciseName}
            onChange={(event) => setExerciseName(event.target.value)}
            required
          />
          <label htmlFor="exercise-category">Category</label>
          <input
            id="exercise-category"
            placeholder="For example: Technical or Strength"
            value={exerciseCategory}
            onChange={(event) => setExerciseCategory(event.target.value)}
          />
          <label htmlFor="exercise-unit">Default unit</label>
          <input
            id="exercise-unit"
            placeholder="For example: repetitions or minutes"
            value={exerciseDefaultUnit}
            onChange={(event) => setExerciseDefaultUnit(event.target.value)}
          />
          <label htmlFor="exercise-description">Description</label>
          <textarea
            id="exercise-description"
            value={exerciseDescription}
            onChange={(event) => setExerciseDescription(event.target.value)}
          />
          <fieldset className="tracking-fields">
            <legend>Track during a session</legend>
            {availableTrackingFields.map((field) => (
              <label key={field}>
                <input
                  type="checkbox"
                  checked={trackingFields.includes(field)}
                  onChange={() => toggleTrackingField(
                    field,
                    trackingFields,
                    setTrackingFields,
                  )}
                />
                {field}
              </label>
            ))}
          </fieldset>
          <button disabled={isCreatingExercise} type="submit">
            {isCreatingExercise ? 'Adding exercise...' : 'Add exercise'}
          </button>
        </form>

        {exerciseError && <p role="alert">{exerciseError}</p>}

        {areExercisesLoading ? (
          <p>Loading exercises...</p>
        ) : exercises.length === 0 ? (
          <p>No exercises have been added to this sport yet.</p>
        ) : (
          <>
            <ul className="exercise-list">
            {visibleExercises.map((exercise) => (
              <li key={exercise.id}>
                <div className="exercise-title-row">
                  <strong>{exercise.name}</strong>
                  <span className="exercise-category-label">
                    {exercise.category ?? 'General'}
                  </span>
                  {exercise.isBuiltIn && <span className="built-in-badge">Built-in</span>}
                </div>
                {(exercise.category || exercise.defaultUnit) && (
                  <span>
                    {[exercise.category, exercise.defaultUnit]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
                {exercise.description && <p>{exercise.description}</p>}
                <p>
                  Tracks: {exercise.trackingFields.length > 0
                    ? exercise.trackingFields.join(', ')
                    : 'No fields selected'}
                </p>
                {!exercise.isBuiltIn && configuringExerciseId === exercise.id ? (
                  <div className="exercise-field-editor">
                    <p>Choose the fields you want to track for this exercise.</p>
                    <div className="tracking-fields">
                      {availableTrackingFields.map((field) => (
                        <label key={field}>
                          <input
                            type="checkbox"
                            checked={configuredTrackingFields.includes(field)}
                            onChange={() => toggleTrackingField(
                              field,
                              configuredTrackingFields,
                              setConfiguredTrackingFields,
                            )}
                          />
                          {field}
                        </label>
                      ))}
                    </div>
                    <div className="exercise-field-editor-actions">
                      <button
                        disabled={isSavingExerciseFields}
                        type="button"
                        onClick={() => handleSaveExerciseFields(exercise)}
                      >
                        {isSavingExerciseFields ? 'Saving...' : 'Save fields'}
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setConfiguringExerciseId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : !exercise.isBuiltIn && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setConfiguringExerciseId(exercise.id);
                      setConfiguredTrackingFields(exercise.trackingFields);
                    }}
                  >
                    Configure fields
                  </button>
                )}
              </li>
            ))}
            </ul>
            {exercisePageCount > 1 && (
              <div className="exercise-pagination">
              <button
                className="secondary-button"
                disabled={exercisePage === 1}
                type="button"
                onClick={() => setExercisePage((currentPage) => currentPage - 1)}
              >
                Previous
              </button>
              <span>Page {exercisePage} of {exercisePageCount}</span>
              <button
                className="secondary-button"
                disabled={exercisePage === exercisePageCount}
                type="button"
                onClick={() => setExercisePage((currentPage) => currentPage + 1)}
              >
                Next
              </button>
              </div>
            )}
          </>
        )}
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
