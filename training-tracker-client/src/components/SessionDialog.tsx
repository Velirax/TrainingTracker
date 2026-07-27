import { type SubmitEvent, useEffect, useState } from 'react';
import { getExercises } from '../services/exerciseService';
import { getSportFolders } from '../services/sportFolderService';
import {
  createTrainingSession,
  getTrainingSessionsForSportFolder,
  updateTrainingSession,
} from '../services/trainingSessionService';
import type { SportFolder } from '../types/sportFolder';
import type { Exercise } from '../types/exercise';
import type { TrainingSession } from '../types/trainingSession';
import { createWorkoutTemplate, getWorkoutTemplates, type WorkoutTemplate } from '../services/workoutTemplateService';

interface SessionDialogProps {
  start: Date;
  end: Date;
  onClose: () => void;
  onCreated: (session: TrainingSession) => void;
  sessionToEdit?: TrainingSession;
  sessionToDuplicate?: TrainingSession;
  onUpdated?: (session: TrainingSession) => void;
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

function getTrackingFieldLabel(field: string): string {
  if (field === 'Duration') {
    return 'Duration (minutes)';
  }

  if (field === 'Distance') {
    return 'Distance (km)';
  }

  return field === 'Pace' ? 'Pace (min/km)' : field;
}

function SessionDialog({
  start,
  end,
  onClose,
  onCreated,
  sessionToEdit,
  sessionToDuplicate,
  onUpdated,
}: SessionDialogProps) {
  const [sportFolders, setSportFolders] = useState<SportFolder[]>([]);
  const sourceSession = sessionToEdit ?? sessionToDuplicate;
  const [selectedSportFolderId, setSelectedSportFolderId] = useState(
    sourceSession ? String(sourceSession.sportFolderId) : '',
  );
  const [title, setTitle] = useState(sourceSession?.title ?? '');
  const [sessionDate, setSessionDate] = useState(
    sessionToEdit?.sessionDate ?? formatDateForInput(start),
  );
  const [startTime, setStartTime] = useState(
    sessionToEdit?.startTime.slice(0, 5) ?? formatTimeForInput(start),
  );
  const [endTime, setEndTime] = useState(
    sessionToEdit?.endTime.slice(0, 5) ?? formatTimeForInput(end),
  );
  const [sessionType, setSessionType] = useState(
    sourceSession?.sessionType ?? 'Practice',
  );
  const [sessionStatus, setSessionStatus] = useState(
    sessionToEdit?.status ?? 'Planned',
  );
  const [rating, setRating] = useState(
    sourceSession?.rating ? String(sourceSession.rating) : '',
  );
  const [notes, setNotes] = useState(sourceSession?.notes ?? '');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [sessionExercises, setSessionExercises] = useState(
    sourceSession?.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      trackingValues: exercise.trackingValues,
    })) ?? [],
  );
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState('1');
  const isEditing = sessionToEdit !== undefined;
  

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

  useEffect(() => {
    if (!selectedSportFolderId) return;
    getWorkoutTemplates(Number(selectedSportFolderId)).then(setWorkoutTemplates).catch(() => setWorkoutTemplates([]));
  }, [selectedSportFolderId]);

  useEffect(() => {
    async function loadExercises() {
      if (!selectedSportFolderId) {
        setAvailableExercises([]);
        return;
      }

      try {
        setAvailableExercises(await getExercises(Number(selectedSportFolderId)));
      } catch {
        setFormError('Could not load exercises for this sport.');
      }
    }

    loadExercises();
  }, [selectedSportFolderId]);

  function handleSportChange(sportFolderId: string) {
    setSelectedSportFolderId(sportFolderId);
    setSelectedExerciseId('');
    setSessionExercises([]);
    setSelectedTemplateId('');
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      setSessionExercises([]);
      return;
    }

    const template = workoutTemplates.find((item) => String(item.id) === templateId);

    if (template) {
      setSessionExercises(template.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        trackingValues: { ...exercise.trackingValues },
      })));
    }
  }

  async function saveTemplate() {
    if (!templateName.trim() || !selectedSportFolderId || sessionExercises.length === 0) {
      return;
    }

    try {
      const template = await createWorkoutTemplate(templateName.trim(), Number(selectedSportFolderId), sessionExercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        trackingValues: { ...exercise.trackingValues },
      })));
      setWorkoutTemplates((items) => [...items, template]);
      setTemplateName('');
    } catch { setFormError('Could not save the workout template.'); }
  }

  async function addExercise() {
    if (!selectedExerciseId) {
      return;
    }

    const exerciseId = Number(selectedExerciseId);

    if (sessionExercises.some((exercise) => exercise.exerciseId === exerciseId)) {
      return;
    }

    setIsAddingExercise(true);
    let trackingValues: Record<string, string> = {};

    try {
      const previousSessions = await getTrainingSessionsForSportFolder(
        Number(selectedSportFolderId),
      );
      const mostRecentLoggedExercise = previousSessions
        .filter((session) => session.status === 'Completed')
        .filter((session) => session.id !== sessionToEdit?.id)
        .sort((first, second) => {
          const firstDateTime = `${first.sessionDate}T${first.startTime}`;
          const secondDateTime = `${second.sessionDate}T${second.startTime}`;
          return secondDateTime.localeCompare(firstDateTime);
        })
        .flatMap((session) => session.exercises)
        .find((exercise) => exercise.exerciseId === exerciseId);

      trackingValues = mostRecentLoggedExercise
        ? { ...mostRecentLoggedExercise.trackingValues }
        : {};
    } catch {
      // The exercise can still be added even if its earlier logs cannot load.
    } finally {
      setSessionExercises((currentExercises) => [
        ...currentExercises,
        { exerciseId, trackingValues },
      ]);
      setSelectedExerciseId('');
      setIsAddingExercise(false);
    }
  }

  function updateExerciseValue(exerciseId: number, field: string, value: string) {
    setSessionExercises((currentExercises) => currentExercises.map((exercise) =>
      exercise.exerciseId === exerciseId
        ? {
          ...exercise,
          trackingValues: {
            ...exercise.trackingValues,
            [field]: value,
          },
        }
        : exercise));
  }

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    if (!selectedSportFolderId) {
      setFormError('Choose a sport folder.');
      return;
    }

    if (sessionStatus === 'Planned' && sessionDate < formatDateForInput(new Date())) {
      setFormError('Planned sessions cannot be scheduled in the past.');
      return;
    }

    if (endTime <= startTime) {
      setFormError('End time must be later than start time.');
      return;
    }

    setIsSaving(true);

    try {
      const request = {
        sportFolderId: Number(selectedSportFolderId),
        title,
        sessionDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        sessionType,
        status: sessionStatus,
        rating: rating ? Number(rating) : null,
        notes: notes || null,
        exercises: sessionExercises,
      };

      const savedSession = sessionToEdit
        ? await updateTrainingSession(sessionToEdit.id, request)
        : await createTrainingSession(request);

      if (isEditing) {
        onUpdated?.(savedSession);
      } else {
        onCreated(savedSession);
        const occurrences = Math.min(Math.max(Number(repeatCount) || 1, 1), 52);

        for (let occurrence = 1; occurrence < occurrences; occurrence += 1) {
          const repeatedDate = new Date(`${sessionDate}T12:00:00`);
          repeatedDate.setDate(repeatedDate.getDate() + occurrence * 7);
          const repeatedSession = await createTrainingSession({
            ...request,
            sessionDate: formatDateForInput(repeatedDate),
          });
          onCreated(repeatedSession);
        }
      }
    } catch {
      setFormError(
        isEditing
          ? 'Could not update the training session.'
          : 'Could not create the training session.',
      );
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
          <h2 id="session-dialog-title">
            {isEditing ? 'Edit training session' : 'New training session'}
          </h2>
          <button
            aria-label="Close session dialog"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p>
            Selected: {start.toLocaleString()} – {end.toLocaleString()}
          </p>

          <div className="session-dialog-fields">
            <div className="dialog-field dialog-field-wide">
              <label htmlFor="dialog-session-sport">Sport</label>
              <select id="dialog-session-sport" value={selectedSportFolderId} onChange={(event) => handleSportChange(event.target.value)} required>
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
              <input
                id="dialog-session-date"
                type="date"
                value={sessionDate}
                min={
                  sessionStatus === 'Planned'
                    ? formatDateForInput(new Date())
                    : undefined
                }
                onChange={(event) => setSessionDate(event.target.value)}
                required
              />
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

            {!isEditing && (
              <div className="dialog-field">
                <label htmlFor="dialog-session-repeat">Repeat weekly</label>
                <select id="dialog-session-repeat" value={repeatCount} onChange={(event) => setRepeatCount(event.target.value)}>
                  <option value="1">Do not repeat</option>
                  <option value="2">For 2 weeks</option>
                  <option value="4">For 4 weeks</option>
                  <option value="8">For 8 weeks</option>
                  <option value="12">For 12 weeks</option>
                </select>
              </div>
            )}

            <div className="dialog-field dialog-field-wide">
              <label htmlFor="dialog-session-notes">Notes (optional)</label>
              <textarea id="dialog-session-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            <div className="dialog-field dialog-field-wide session-exercises-field">
              <label htmlFor="dialog-session-exercise">Exercises performed</label>
              {selectedSportFolderId && (
                <div className="workout-template-controls">
                  <select value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
                    <option value="">Select a template</option>
                    {workoutTemplates.filter((template) => template.sportFolderId === Number(selectedSportFolderId)).map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  <input placeholder="Template name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
                  <button type="button" onClick={() => void saveTemplate()} disabled={!templateName.trim() || sessionExercises.length === 0}>Save template</button>
                </div>
              )}
              <div className="session-exercise-picker">
                <select
                  id="dialog-session-exercise"
                  disabled={!selectedSportFolderId || availableExercises.length === 0}
                  value={selectedExerciseId}
                  onChange={(event) => setSelectedExerciseId(event.target.value)}
                >
                  <option value="">Choose an exercise</option>
                  {availableExercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!selectedExerciseId || isAddingExercise}
                  type="button"
                  onClick={() => void addExercise()}
                >
                  {isAddingExercise ? 'Adding...' : 'Add'}
                </button>
              </div>

              {sessionExercises.map((sessionExercise) => {
                const exercise = availableExercises.find((item) =>
                  item.id === sessionExercise.exerciseId);

                if (!exercise) {
                  return null;
                }

                return (
                  <div className="session-exercise-entry" key={exercise.id}>
                    <div className="session-exercise-entry-header">
                      <strong>{exercise.name}</strong>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setSessionExercises((currentExercises) =>
                          currentExercises.filter((item) => item.exerciseId !== exercise.id))}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="session-exercise-values">
                      {exercise.trackingFields.map((field) => (
                        <label key={field}>
                          {getTrackingFieldLabel(field)}
                          <input
                            type={field === 'Notes' || field === 'Pace' ? 'text' : 'number'}
                            min={field === 'Duration' ? '0' : undefined}
                            step={field === 'Distance' ? '0.01' : '1'}
                            placeholder={
                              field === 'Pace'
                                ? 'For example: 5:34'
                                : field === 'Distance' ? 'For example: 5.2' : undefined
                            }
                            value={sessionExercise.trackingValues[field] ?? ''}
                            onChange={(event) => updateExerciseValue(
                              exercise.id,
                              field,
                              event.target.value,
                            )}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={isSaving}>
            {isSaving
              ? isEditing ? 'Saving...' : 'Creating...'
              : isEditing ? 'Save changes' : 'Create session'}
          </button>

          {formError && <p role="alert">{formError}</p>}
        </form>
      </section>
    </div>
  );
}

export default SessionDialog;
