import { type SubmitEvent, useEffect, useState } from 'react';
import {
  createExercise,
  deleteExercise,
  getExercises,
  updateExercise,
} from '../services/exerciseService';
import { updateSportFolder } from '../services/sportFolderService';
import { getTrainingSessionsForSportFolder } from '../services/trainingSessionService';
import { createWorkoutTemplate, deleteWorkoutTemplate, getWorkoutTemplates, updateWorkoutTemplate, type WorkoutTemplate } from '../services/workoutTemplateService';
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

type ChartTimeFrame = 'all' | '30' | '90' | '180' | '365';

function formatDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return hours > 0
    ? minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    : `${minutes} min`;
}

function formatTrackingValues(values: Record<string, string>): string {
  const entries = Object.entries(values)
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
    });

  return entries.length > 0 ? entries.join(' · ') : 'No values logged';
}

function parseTrackingValue(field: string, value: string): number | null {
  if (field === 'Pace') {
    const match = /^(\d+):(\d{1,2})$/.exec(value.trim());

    if (!match || Number(match[2]) >= 60) {
      return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatMetricValue(field: string, value: number): string {
  if (field === 'Pace') {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds} /km`;
  }

  if (field === 'Duration') {
    return `${value} min`;
  }

  return field === 'Distance' ? `${value} km` : String(value);
}

function formatDateForComparison(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
  const [trackingFields, setTrackingFields] = useState<string[]>([]);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [configuredTrackingFields, setConfiguredTrackingFields] = useState<string[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState('');
  const [editingExerciseDescription, setEditingExerciseDescription] = useState('');
  const [editingExerciseCategory, setEditingExerciseCategory] = useState('');
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [exercisePage, setExercisePage] = useState(1);
  const [progressExerciseId, setProgressExerciseId] = useState<number | null>(null);
  const [selectedLogMetric, setSelectedLogMetric] = useState('');
  const [chartTimeFrame, setChartTimeFrame] = useState<ChartTimeFrame>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'exercises' | 'templates' | 'sessions'>('overview');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateExerciseIds, setTemplateExerciseIds] = useState<number[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [editingTemplateExercises, setEditingTemplateExercises] = useState<WorkoutTemplate['exercises']>([]);
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('');

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

  function startEditingTemplate(template: WorkoutTemplate) {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setEditingTemplateExercises(template.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      trackingValues: { ...exercise.trackingValues },
    })));
  }

  function moveTemplateExercise(index: number, direction: number) {
    setEditingTemplateExercises((items) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return items;
      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function updateTemplateValue(exerciseId: number, field: string, value: string) {
    setEditingTemplateExercises((items) => items.map((item) => item.exerciseId === exerciseId
      ? { ...item, trackingValues: { ...item.trackingValues, [field]: value } }
      : item));
  }

  async function saveTemplateEdits() {
    if (!editingTemplateId || !editingTemplateName.trim() || editingTemplateExercises.length === 0) return;
    const saved = await updateWorkoutTemplate(editingTemplateId, editingTemplateName.trim(), folder.id, editingTemplateExercises);
    setTemplates((items) => items.map((item) => item.id === saved.id ? saved : item));
    setEditingTemplateId(null);
  }

  useEffect(() => {
    getWorkoutTemplates(folder.id).then(setTemplates).catch(() => setTemplates([]));
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
    setProgressExerciseId(null);
    setSelectedLogMetric('');
    setChartTimeFrame('all');
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

  function startEditingExercise(exercise: Exercise) {
    setEditingExerciseId(exercise.id);
    setEditingExerciseName(exercise.name);
    setEditingExerciseDescription(exercise.description ?? '');
    setEditingExerciseCategory(exercise.category ?? '');
    setConfiguredTrackingFields(exercise.trackingFields);
  }

  async function handleSaveExercise(exercise: Exercise) {
    setIsSavingExercise(true);
    setExerciseError(null);

    try {
      const updatedExercise = await updateExercise(exercise.id, {
        name: editingExerciseName,
        description: editingExerciseDescription || null,
        category: editingExerciseCategory || null,
        trackingFields: configuredTrackingFields,
        sportFolderIds: exercise.sportFolderIds,
      });

      setExercises((currentExercises) => currentExercises.map((currentExercise) =>
        currentExercise.id === updatedExercise.id ? updatedExercise : currentExercise));
      setEditingExerciseId(null);
    } catch {
      setExerciseError('Could not update the exercise.');
    } finally {
      setIsSavingExercise(false);
    }
  }

  async function handleDeleteExercise(exercise: Exercise) {
    if (!window.confirm(`Delete "${exercise.name}"? This cannot be undone.`)) {
      return;
    }

    setExerciseError(null);

    try {
      await deleteExercise(exercise.id);
      setExercises((currentExercises) => currentExercises.filter(
        (currentExercise) => currentExercise.id !== exercise.id,
      ));

      if (progressExerciseId === exercise.id) {
        setProgressExerciseId(null);
      }
    } catch {
      setExerciseError('Could not delete the exercise. Exercises already used in sessions are kept to preserve those logs.');
    }
  }

  const completedSessions = sessions.filter((session) => session.status === 'Completed');
  const plannedSessions = sessions.filter((session) => session.status === 'Planned');
  const completedDurationMinutes = completedSessions.reduce(
    (total, session) => total + session.durationMinutes,
    0,
  );
  const progressExercise = exercises.find((exercise) => exercise.id === progressExerciseId);
  const progressEntries = progressExercise
    ? sessions
      .filter((session) => session.status === 'Completed')
      .map((session) => ({
        session,
        exercise: session.exercises.find(
          (sessionExercise) => sessionExercise.exerciseId === progressExercise.id,
        ),
      }))
      .filter((entry) => entry.exercise !== undefined)
      .sort((first, second) => second.session.sessionDate.localeCompare(first.session.sessionDate))
    : [];
  const availableLogMetrics = progressExercise?.trackingFields.filter(
    (field) => field !== 'Notes',
  ) ?? [];
  const activeLogMetric = availableLogMetrics.includes(selectedLogMetric)
    ? selectedLogMetric
    : availableLogMetrics[0] ?? '';
  const chartCutoffDate = (() => {
    if (chartTimeFrame === 'all') {
      return null;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(chartTimeFrame));
    return formatDateForComparison(cutoff);
  })();
  const chartPoints = activeLogMetric
    ? progressEntries
      .filter((entry) =>
        chartCutoffDate === null || entry.session.sessionDate >= chartCutoffDate)
      .map(({ session, exercise }) => {
        const value = parseTrackingValue(
          activeLogMetric,
          exercise!.trackingValues[activeLogMetric] ?? '',
        );

        return value === null ? null : { date: session.sessionDate, value };
      })
      .filter((point): point is { date: string; value: number } => point !== null)
      .reverse()
    : [];
  const chartMinimum = chartPoints.length > 0
    ? Math.min(...chartPoints.map((point) => point.value))
    : 0;
  const chartMaximum = chartPoints.length > 0
    ? Math.max(...chartPoints.map((point) => point.value))
    : 0;
  const chartRange = chartMaximum - chartMinimum || 1;
  const chartAverage = chartPoints.length > 0
    ? chartPoints.reduce((total, point) => total + point.value, 0) / chartPoints.length
    : 0;
  const chartBest = activeLogMetric === 'Pace' ? chartMinimum : chartMaximum;
  const chartLatest = chartPoints.at(-1)?.value ?? 0;
  const filteredSportSessions = sessions.filter((session) => {
    const matchesStatus = !sessionStatusFilter || session.status === sessionStatusFilter;
    const matchesType = !sessionTypeFilter || session.sessionType === sessionTypeFilter;
    const searchTarget = [session.title, session.notes ?? '', ...session.exercises.map((exercise) => exercise.exerciseName)]
      .join(' ').toLowerCase();
    return matchesStatus && matchesType && searchTarget.includes(sessionSearchTerm.trim().toLowerCase());
  });

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

      <div aria-label="Sport sections" className="sport-detail-tabs" role="tablist">
        <button
          aria-selected={activeTab === 'overview'}
          role="tab"
          type="button"
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          aria-selected={activeTab === 'exercises'}
          role="tab"
          type="button"
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button aria-selected={activeTab === 'templates'} role="tab" type="button" onClick={() => setActiveTab('templates')}>Templates</button>
        <button
          aria-selected={activeTab === 'sessions'}
          role="tab"
          type="button"
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
      </div>

      {activeTab === 'overview' && (
      <section className="dashboard-overview sport-progress-summary">
        <h2>Training summary</h2>
        <div className="dashboard-stats">
          <article className="dashboard-stat-card">
            <h3>Completed</h3>
            <strong>{completedSessions.length}</strong>
            <p>Sessions completed in {folder.name}</p>
          </article>
          <article className="dashboard-stat-card">
            <h3>Planned</h3>
            <strong>{plannedSessions.length}</strong>
            <p>Sessions still planned</p>
          </article>
          <article className="dashboard-stat-card">
            <h3>Training time</h3>
            <strong>{formatDuration(completedDurationMinutes)}</strong>
            <p>Completed training time</p>
          </article>
        </div>
      </section>
      )}

      {activeTab === 'exercises' && (
      <>
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
                {!exercise.isBuiltIn && editingExerciseId === exercise.id ? (
                  <div className="exercise-edit-form">
                    <label>
                      Name
                      <input value={editingExerciseName} onChange={(event) => setEditingExerciseName(event.target.value)} required />
                    </label>
                    <label>
                      Category
                      <input value={editingExerciseCategory} onChange={(event) => setEditingExerciseCategory(event.target.value)} />
                    </label>
                    <label>
                      Description
                      <textarea value={editingExerciseDescription} onChange={(event) => setEditingExerciseDescription(event.target.value)} />
                    </label>
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
                        disabled={!editingExerciseName.trim() || isSavingExercise}
                        type="button"
                        onClick={() => void handleSaveExercise(exercise)}
                      >
                        {isSavingExercise ? 'Saving...' : 'Save exercise'}
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setEditingExerciseId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                <div className="exercise-title-row">
                  <strong>{exercise.name}</strong>
                  <span className="exercise-category-label">
                    {exercise.category ?? 'General'}
                  </span>
                  {exercise.isBuiltIn && <span className="built-in-badge">Built-in</span>}
                </div>
                {exercise.category && (
                  <span>
                    {exercise.category}
                  </span>
                )}
                {exercise.description && <p>{exercise.description}</p>}
                <p>
                  Tracks: {exercise.trackingFields.length > 0
                    ? exercise.trackingFields.join(', ')
                    : 'No fields selected'}
                </p>
                <button
                  className="secondary-button"
                  type="button"
                  aria-pressed={progressExerciseId === exercise.id}
                  onClick={() => {
                    setProgressExerciseId(exercise.id);
                    setSelectedLogMetric(exercise.trackingFields.find(
                      (field) => field !== 'Notes',
                    ) ?? '');
                    setChartTimeFrame('all');
                  }}
                >
                  View logs
                </button>
                {!exercise.isBuiltIn && (
                  <div className="exercise-card-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => startEditingExercise(exercise)}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => void handleDeleteExercise(exercise)}
                    >
                      Delete
                    </button>
                  </div>
                )}
                  </>
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

      <section className="exercise-progress">
        <h2>Exercise logs</h2>
        {progressExercise ? (
          <>
            <div className="exercise-progress-heading">
              <div>
                <h3>{progressExercise.name}</h3>
                <p>{progressEntries.length} completed {progressEntries.length === 1 ? 'session' : 'sessions'} logged</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setProgressExerciseId(null)}
              >
                Clear
              </button>
            </div>
            {availableLogMetrics.length > 0 && (
              <div className="exercise-chart">
                <div className="exercise-chart-controls">
                  <label htmlFor="exercise-log-metric">
                    Chart metric
                    <select
                      id="exercise-log-metric"
                      value={activeLogMetric}
                      onChange={(event) => setSelectedLogMetric(event.target.value)}
                    >
                      {availableLogMetrics.map((metric) => (
                        <option key={metric} value={metric}>{metric}</option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="exercise-chart-time-frame">
                    Time frame
                    <select
                      id="exercise-chart-time-frame"
                      value={chartTimeFrame}
                      onChange={(event) => setChartTimeFrame(
                        event.target.value as ChartTimeFrame,
                      )}
                    >
                      <option value="all">All time</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 3 months</option>
                      <option value="180">Last 6 months</option>
                      <option value="365">Last year</option>
                    </select>
                  </label>
                </div>
                {chartPoints.length === 0 ? (
                  <p>No {activeLogMetric.toLowerCase()} values have been logged yet.</p>
                ) : (
                  <>
                    <svg
                      aria-label={`${progressExercise.name} ${activeLogMetric} chart`}
                      className="exercise-chart-graphic"
                      role="img"
                      viewBox="0 0 640 220"
                    >
                      <line x1="44" x2="620" y1="18" y2="18" />
                      <line x1="44" x2="620" y1="184" y2="184" />
                      <polyline
                        fill="none"
                        points={chartPoints.map((point, index) => {
                          const x = chartPoints.length === 1
                            ? 332
                            : 44 + (576 * index) / (chartPoints.length - 1);
                          const y = 184 - ((point.value - chartMinimum) / chartRange) * 166;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                      {chartPoints.map((point, index) => {
                        const x = chartPoints.length === 1
                          ? 332
                          : 44 + (576 * index) / (chartPoints.length - 1);
                        const y = 184 - ((point.value - chartMinimum) / chartRange) * 166;

                        return (
                          <g key={`${point.date}-${index}`}>
                            <circle cx={x} cy={y} r="5" />
                            <text x={x} y={y - 10}>{formatMetricValue(activeLogMetric, point.value)}</text>
                            <text x={x} y="207">{point.date.slice(5)}</text>
                          </g>
                        );
                      })}
                    </svg>
                    <p className="exercise-chart-range">
                      Range: {formatMetricValue(activeLogMetric, chartMinimum)} – {formatMetricValue(activeLogMetric, chartMaximum)}
                    </p>
                    <div className="exercise-chart-summary">
                      <span><small>Latest</small>{formatMetricValue(activeLogMetric, chartLatest)}</span>
                      <span><small>{activeLogMetric === 'Pace' ? 'Fastest' : 'Best'}</small>{formatMetricValue(activeLogMetric, chartBest)}</span>
                      <span><small>Average</small>{formatMetricValue(activeLogMetric, chartAverage)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
            {progressEntries.length === 0 ? (
              <p>No completed sessions have logged this exercise yet.</p>
            ) : (
              <ul className="exercise-progress-list">
                {progressEntries.map(({ session, exercise }) => (
                  <li key={`${session.id}-${exercise!.exerciseId}`}>
                    <div>
                      <strong>{session.sessionDate}</strong>
                      <span>{session.title}</span>
                    </div>
                    <span>{formatTrackingValues(exercise!.trackingValues)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>Select “View logs” on an exercise above to see its completed-session history.</p>
        )}
      </section>
      </>
      )}

      {activeTab === 'templates' && (
        <section className="templates-tab">
          <div className="section-heading"><div><span className="section-kicker">Reusable plans</span><h2>Workout templates</h2></div></div>
          <p>Build a repeatable session from this sport’s exercises, then apply it from the new-session dialog.</p>
          <div className="template-builder">
            <input placeholder="Template name, for example Easy 5K" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
            <div className="template-exercise-picker">
              {exercises.map((exercise) => <label key={exercise.id}><input type="checkbox" checked={templateExerciseIds.includes(exercise.id)} onChange={() => setTemplateExerciseIds((current) => current.includes(exercise.id) ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])} />{exercise.name}</label>)}
            </div>
            <button type="button" disabled={!templateName.trim() || templateExerciseIds.length === 0} onClick={async () => { const template = await createWorkoutTemplate(templateName.trim(), folder.id, templateExerciseIds.map((exerciseId) => ({ exerciseId, trackingValues: {} }))); setTemplates((items) => [...items, template]); setTemplateName(''); setTemplateExerciseIds([]); }}>Save template</button>
          </div>
          <ul className="template-list">
            {templates.filter((template) => template.sportFolderId === folder.id).map((template) => (
              <li key={template.id} className="template-list-item">
                {editingTemplateId === template.id ? (
                  <div className="template-editor">
                    <input value={editingTemplateName} onChange={(event) => setEditingTemplateName(event.target.value)} aria-label="Template name" />
                    {editingTemplateExercises.map((entry, index) => {
                      const exercise = exercises.find((item) => item.id === entry.exerciseId);
                      return <div className="template-editor-exercise" key={entry.exerciseId}>
                        <div><strong>{exercise?.name ?? 'Unknown exercise'}</strong><span>
                          <button type="button" disabled={index === 0} onClick={() => moveTemplateExercise(index, -1)}>↑</button>
                          <button type="button" disabled={index === editingTemplateExercises.length - 1} onClick={() => moveTemplateExercise(index, 1)}>↓</button>
                          <button type="button" onClick={() => setEditingTemplateExercises((items) => items.filter((item) => item.exerciseId !== entry.exerciseId))}>Remove</button>
                        </span></div>
                        <div className="template-suggested-values">
                          {(exercise?.trackingFields ?? []).map((field) => <label key={field}>{field}
                            <input value={entry.trackingValues[field] ?? ''} placeholder="Suggested value" onChange={(event) => updateTemplateValue(entry.exerciseId, field, event.target.value)} />
                          </label>)}
                        </div>
                      </div>;
                    })}
                    <div className="template-editor-add">
                      <select defaultValue="" onChange={(event) => {
                        const exerciseId = Number(event.target.value);
                        if (exerciseId && !editingTemplateExercises.some((item) => item.exerciseId === exerciseId)) {
                          setEditingTemplateExercises((items) => [...items, { exerciseId, trackingValues: {} }]);
                        }
                        event.currentTarget.value = '';
                      }}>
                        <option value="">Add an exercise</option>
                        {exercises.filter((exercise) => !editingTemplateExercises.some((item) => item.exerciseId === exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
                      </select>
                      <button type="button" onClick={() => void saveTemplateEdits()}>Save changes</button>
                      <button className="secondary-button" type="button" onClick={() => setEditingTemplateId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div><strong>{template.name}</strong><span>{template.exercises.map((entry) => exercises.find((exercise) => exercise.id === entry.exerciseId)?.name).filter(Boolean).join(', ')}</span></div>
                    <div className="template-actions"><button type="button" onClick={() => startEditingTemplate(template)}>Edit</button><button className="danger-button" type="button" onClick={async () => { await deleteWorkoutTemplate(template.id); setTemplates((items) => items.filter((item) => item.id !== template.id)); }}>Delete</button></div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab === 'sessions' && (
      <section>
        <h2>Session history</h2>

        <div className="session-filter-bar sport-session-filters">
          <input placeholder="Search sessions or exercises" value={sessionSearchTerm} onChange={(event) => setSessionSearchTerm(event.target.value)} />
          <select value={sessionStatusFilter} onChange={(event) => setSessionStatusFilter(event.target.value)}><option value="">All statuses</option><option>Planned</option><option>Completed</option><option>Cancelled</option></select>
          <select value={sessionTypeFilter} onChange={(event) => setSessionTypeFilter(event.target.value)}><option value="">All types</option><option>Practice</option><option>Workout</option><option>Match</option><option>Cardio</option><option>Recovery</option><option>Other</option></select>
        </div>

        {isLoading ? (
          <p>Loading sessions...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : filteredSportSessions.length === 0 ? (
          <p>No sessions have been created for this sport yet.</p>
        ) : (
          <ul className="sport-session-list">
            {filteredSportSessions.map((session) => (
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
      )}
    </main>
  );
}

export default SportFolderDetail;
