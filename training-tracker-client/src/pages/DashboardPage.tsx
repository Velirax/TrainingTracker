import { useEffect, useState } from 'react';
import {
  createTrainingSession,
  deleteTrainingSession,
  deleteFutureTrainingSessions,
  getTrainingSessions,
  getSessionsNeedingReview,
  updateTrainingSession,
} from '../services/trainingSessionService';
import { getSportFolders } from '../services/sportFolderService';
import { getPreferences } from '../services/profileService';
import { getSteps } from '../services/stepsService';
import type { DailySteps } from '../types/dailySteps';
import type { SportFolder } from '../types/sportFolder';
import type { TrainingSession } from '../types/trainingSession';
import WeeklyLedger from '../components/WeeklyLedger';
import SessionDetailsDialog from '../components/SessionDetailsDialog';
import SessionDialog from '../components/SessionDialog';
import SessionReviewDialog from '../components/SessionReviewDialog';
import CompleteSessionDialog from '../components/CompleteSessionDialog';
import RecurrenceDialog from '../components/RecurrenceDialog';

const weekRangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

function getWeekDates(date: Date, firstDay = 1): Date[] {
  const startOfWeek = new Date(date);
  const daysSinceFirstDay = (startOfWeek.getDay() - firstDay + 7) % 7;

  startOfWeek.setDate(startOfWeek.getDate() - daysSinceFirstDay);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);
    return day;
  });
}

function getMonthDates(date: Date): [Date, Date] {
  return [
    new Date(date.getFullYear(), date.getMonth(), 1),
    new Date(date.getFullYear(), date.getMonth() + 1, 0),
  ];
}

function getMonthGridDates(date: Date, firstDay: number): [Date, Date] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (firstOfMonth.getDay() - firstDay + 7) % 7;
  const firstVisibleDate = new Date(firstOfMonth);
  firstVisibleDate.setDate(firstVisibleDate.getDate() - offset);
  const lastVisibleDate = new Date(firstVisibleDate);
  lastVisibleDate.setDate(lastVisibleDate.getDate() + 41);

  return [firstVisibleDate, lastVisibleDate];
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function groupSessionsBySport(sessions: TrainingSession[]) {
  const sportSummaries = new Map<number, {
    name: string;
    color: string;
    icon: string | null;
    count: number;
    durationMinutes: number;
  }>();

  for (const session of sessions) {
    const currentSummary = sportSummaries.get(session.sportFolderId);

    if (currentSummary) {
      currentSummary.count += 1;
      currentSummary.durationMinutes += session.durationMinutes;
    } else {
      sportSummaries.set(session.sportFolderId, {
        name: session.sportFolderName,
        color: session.sportFolderColor,
        icon: session.sportFolderIcon,
        count: 1,
        durationMinutes: session.durationMinutes,
      });
    }
  }

  return Array.from(sportSummaries.values()).sort((first, second) =>
    second.count - first.count,
  );
}

function formatTrainingTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function exportSessionsCsv(sessions: TrainingSession[]) {
  const escape = (value: string | number | null | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = ['Date', 'Start', 'End', 'Sport', 'Title', 'Type', 'Status', 'Rating', 'Notes', 'Exercises'];
  const rows = sessions.map((session) => [
    session.sessionDate, session.startTime, session.endTime, session.sportFolderName, session.title,
    session.sessionType, session.status, session.rating, session.notes,
    session.exercises.map((exercise) => `${exercise.exerciseName}: ${Object.entries(exercise.trackingValues).filter(([, value]) => value).map(([field, value]) => `${field} ${value}`).join(', ')}`).join(' | '),
  ]);
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `training-sessions-${formatDateForApi(new Date())}.csv`; link.click();
  URL.revokeObjectURL(url);
}

function formatExerciseTooltip(session: TrainingSession): string {
  if (session.exercises.length === 0) {
    return 'No exercises logged.';
  }

  return session.exercises.map((exercise) => {
    const values = Object.entries(exercise.trackingValues)
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
      .join(', ');

    return values ? `${exercise.exerciseName} — ${values}` : exercise.exerciseName;
  }).join('\n');
}

function sumCalories(sessionsList: TrainingSession[]): number {
  return sessionsList.reduce((total, session) => total + session.calories, 0);
}

function computeStreak(historySessions: TrainingSession[]): number {
  const completedDates = new Set(
    historySessions.filter((session) => session.status === 'Completed').map((session) => session.sessionDate),
  );
  const cursor = new Date();
  let streak = 0;

  if (!completedDates.has(formatDateForApi(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completedDates.has(formatDateForApi(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
    const [weekStartsOn, setWeekStartsOn] = useState(1);
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
    const weekDates = getWeekDates(selectedDate, weekStartsOn);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [ledgerSteps, setLedgerSteps] = useState<DailySteps[]>([]);
    const [overviewSteps, setOverviewSteps] = useState<DailySteps[]>([]);
    const [overviewSessions, setOverviewSessions] = useState<TrainingSession[]>([]);
    const [overviewRange, setOverviewRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
    const [customOverviewStart, setCustomOverviewStart] = useState(formatDateForApi(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customOverviewEnd, setCustomOverviewEnd] = useState(formatDateForApi(new Date()));
    const [sportFolders, setSportFolders] = useState<SportFolder[]>([]);
    const [sportFilter, setSportFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [upcomingSessionSource, setUpcomingSessionSource] = useState<TrainingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [pendingCreateDate, setPendingCreateDate] = useState<Date | null>(null);
    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [streakHistorySessions, setStreakHistorySessions] = useState<TrainingSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
    const [sessionToComplete, setSessionToComplete] = useState<TrainingSession | null>(null);
    const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
    const [duplicatingSession, setDuplicatingSession] = useState<TrainingSession | null>(null);
    const [sessionsNeedingReview, setSessionsNeedingReview] = useState<TrainingSession[]>([]);
    const [recurrenceSource, setRecurrenceSource] = useState<TrainingSession | null>(null);
    const filteredSessions = sessions.filter((session) => {
      const matchesSport = !sportFilter || session.sportFolderId === Number(sportFilter);
      const matchesStatus = !statusFilter || session.status === statusFilter;
      const matchesType = !typeFilter || session.sessionType === typeFilter;
      const searchTarget = [
        session.title,
        session.notes ?? '',
        ...session.exercises.map((exercise) => exercise.exerciseName),
      ].join(' ').toLowerCase();
      return matchesSport && matchesStatus && matchesType &&
        searchTarget.includes(searchTerm.trim().toLowerCase());
    });
    const filteredOverviewSessions = overviewSessions.filter((session) => {
      const matchesSport = !sportFilter || session.sportFolderId === Number(sportFilter);
      const matchesStatus = !statusFilter || session.status === statusFilter;
      const matchesType = !typeFilter || session.sessionType === typeFilter;
      const searchTarget = [session.title, session.notes ?? '', ...session.exercises.map((exercise) => exercise.exerciseName)]
        .join(' ').toLowerCase();
      return matchesSport && matchesStatus && matchesType && searchTarget.includes(searchTerm.trim().toLowerCase());
    });
    const plannedSessions = filteredOverviewSessions.filter((session) => session.status === 'Planned');
    const completedSessions = filteredOverviewSessions.filter((session) => session.status === 'Completed');
    const plannedBySport = groupSessionsBySport(plannedSessions);
    const completedBySport = groupSessionsBySport(completedSessions);
    const totalTrainingMinutes = filteredOverviewSessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    );
    const sportComparison = groupSessionsBySport(completedSessions).slice(0, 5);
    const maxSportMinutes = Math.max(...sportComparison.map((sport) => sport.durationMinutes), 1);
    const statusCounts = [
      { label: 'Planned', count: plannedSessions.length, color: 'var(--status-info-solid)' },
      { label: 'Completed', count: completedSessions.length, color: 'var(--status-success-solid)' },
      { label: 'Cancelled', count: filteredOverviewSessions.filter((session) => session.status === 'Cancelled').length, color: 'var(--status-neutral-solid)' },
    ];
    const statusTotal = Math.max(statusCounts.reduce((total, item) => total + item.count, 0), 1);
    const now = new Date();
    const upcomingSessions = upcomingSessionSource
      .filter((session) => session.status === 'Planned')
      .filter((session) => new Date(
        `${session.sessionDate}T${session.startTime}`,
      ) >= now)
      .sort((first, second) =>
        `${first.sessionDate}T${first.startTime}`.localeCompare(
          `${second.sessionDate}T${second.startTime}`,
        ))
      .slice(0, 1);
    const todayKey = formatDateForApi(new Date());
    const todaySessions = upcomingSessionSource.filter((session) =>
      session.status === 'Planned' && session.sessionDate === todayKey,
    );
    const stepsByDate = Object.fromEntries(ledgerSteps.map((entry) => [entry.date, entry.stepCount]));
    const totalSteps = overviewSteps.reduce((total, entry) => total + entry.stepCount, 0);

    useEffect(() => {
      getSportFolders().then(setSportFolders).catch(() => setError('Could not load sports.'));
    }, []);


    useEffect(() => {
      getPreferences().then((preferences) => {
        const preferredCalendarView = preferences.defaultCalendarView === 'month' ? 'month' : 'week';

        setCalendarView(preferredCalendarView);
        setOverviewRange(preferredCalendarView);
        setWeekStartsOn(preferences.weekStartsOn);
        setDistanceUnit(preferences.distanceUnit);
      }).catch(() => {
        // The calendar remains usable with its week-view default.
      });
    }, []);


    useEffect(() => {
        async function loadTrainingSessions() {
            setIsLoading(true);
            setError(null);

            try {
            const [startDate, endDate] = calendarView === 'week'
                ? [weekDates[0], weekDates[6]]
                : getMonthGridDates(selectedDate, weekStartsOn);

            const loadedSessions = await getTrainingSessions(
                formatDateForApi(startDate),
                formatDateForApi(endDate),
            );

            setSessions(loadedSessions);
            } catch {
            setError('Could not load training sessions.');
            } finally {
            setIsLoading(false);
            }
        }

        loadTrainingSessions();
    }, [selectedDate, calendarView, weekStartsOn]);

    useEffect(() => {
      const [startDate, endDate] = calendarView === 'week'
          ? [weekDates[0], weekDates[6]]
          : getMonthGridDates(selectedDate, weekStartsOn);

      getSteps(formatDateForApi(startDate), formatDateForApi(endDate))
        .then(setLedgerSteps)
        .catch(() => {
          // Step badges simply stay hidden if this fails to load.
        });
    }, [selectedDate, calendarView, weekStartsOn]);

    useEffect(() => {
      const [startDate, endDate] = (() => {
        if (overviewRange === 'custom') return [customOverviewStart, customOverviewEnd];
        if (overviewRange === 'week') {
          const dates = getWeekDates(selectedDate, weekStartsOn);
          return [formatDateForApi(dates[0]), formatDateForApi(dates[6])];
        }
        if (overviewRange === 'year') {
          return [`${selectedDate.getFullYear()}-01-01`, `${selectedDate.getFullYear()}-12-31`];
        }
        const [start, end] = getMonthDates(selectedDate);
        return [formatDateForApi(start), formatDateForApi(end)];
      })();

      getTrainingSessions(startDate, endDate).then(setOverviewSessions).catch(() => {
        setError('Could not load dashboard metrics.');
      });
    }, [selectedDate, overviewRange, customOverviewStart, customOverviewEnd, weekStartsOn]);

    useEffect(() => {
      const [startDate, endDate] = (() => {
        if (overviewRange === 'custom') return [customOverviewStart, customOverviewEnd];
        if (overviewRange === 'week') {
          const dates = getWeekDates(selectedDate, weekStartsOn);
          return [formatDateForApi(dates[0]), formatDateForApi(dates[6])];
        }
        if (overviewRange === 'year') {
          return [`${selectedDate.getFullYear()}-01-01`, `${selectedDate.getFullYear()}-12-31`];
        }
        const [start, end] = getMonthDates(selectedDate);
        return [formatDateForApi(start), formatDateForApi(end)];
      })();

      getSteps(startDate, endDate).then(setOverviewSteps).catch(() => {
        // The steps stat simply stays at 0 if this fails to load.
      });
    }, [selectedDate, overviewRange, customOverviewStart, customOverviewEnd, weekStartsOn]);

    useEffect(() => {
      async function loadUpcomingSessions() {
        const today = new Date();
        const oneYearFromToday = new Date(today);
        oneYearFromToday.setFullYear(today.getFullYear() + 1);

        try {
          setUpcomingSessionSource(await getTrainingSessions(
            formatDateForApi(today),
            formatDateForApi(oneYearFromToday),
          ));
        } catch {
          setError('Could not load upcoming sessions.');
        }
      }

      loadUpcomingSessions();
    }, []);

    useEffect(() => {
      async function loadStreakHistory() {
        const today = new Date();
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        try {
          setStreakHistorySessions(await getTrainingSessions(
            formatDateForApi(ninetyDaysAgo),
            formatDateForApi(today),
          ));
        } catch {
          // The streak stat simply stays at 0 if this fails to load.
        }
      }

      loadStreakHistory();
    }, []);

    useEffect(() => {
      async function loadSessionsNeedingReview() {
        try {
          setSessionsNeedingReview(await getSessionsNeedingReview());
        } catch {
          setError('Could not load sessions needing review.');
        }
      }

      loadSessionsNeedingReview();
    }, []);


    function changeCalendarPeriod(direction: number) {
        setSelectedDate((currentDate) => {
            const nextDate = new Date(currentDate);

            if (calendarView === 'week') {
              nextDate.setDate(nextDate.getDate() + direction * 7);
            } else {
              nextDate.setMonth(nextDate.getMonth() + direction);
            }

            return nextDate;
        });
    }

    function handleDayClick(date: Date) {
      setPendingCreateDate(date);
      setIsSessionDialogOpen(false);
      setSelectedSession(null);
    }

    function handleCreateDismiss() {
      setPendingCreateDate(null);
      setIsSessionDialogOpen(false);
    }

    async function handleSessionReschedule(sessionId: number, newDate: Date) {
      const session = sessions.find((item) => item.id === sessionId);

      if (!session) return;

      try {
        const updated = await updateTrainingSession(session.id, {
          sportFolderId: session.sportFolderId,
          title: session.title,
          sessionDate: formatDateForApi(newDate),
          startTime: session.startTime,
          endTime: session.endTime,
          sessionType: session.sessionType,
          status: session.status,
          rating: session.rating,
          notes: session.notes,
          exercises: session.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, trackingValues: exercise.trackingValues })),
        });
        setSessions((items) => items.map((item) => item.id === updated.id ? updated : item));
        setUpcomingSessionSource((items) => items.map((item) => item.id === updated.id ? updated : item));
      } catch {
        setError('Could not reschedule the session.');
      }
    }

    function handleSessionClick(sessionId: number) {
      const session = sessions.find((currentSession) => currentSession.id === sessionId);

      if (session) {
          setPendingCreateDate(null);
          setIsSessionDialogOpen(false);
          setSelectedSession(session);
      }
    }
    async function handleSessionDelete(session: TrainingSession) {
      const shouldDelete = window.confirm(
        `Delete "${session.title}"? This cannot be undone.`,
      );

      if (!shouldDelete) {
        return;
      }

      try {
        await deleteTrainingSession(session.id);

        setSessions((currentSessions) =>
          currentSessions.filter(
            (currentSession) => currentSession.id !== session.id,
          ),
        );
        setUpcomingSessionSource((currentSessions) =>
          currentSessions.filter(
            (currentSession) => currentSession.id !== session.id,
          ),
        );
        setSelectedSession(null);
      } catch {
        setError('Could not delete the training session.');
      }
    }
    async function handleFutureSessionDelete(session: TrainingSession) {
      if (!window.confirm(`Delete "${session.title}" and all future occurrences?`)) return;
      try {
        await deleteFutureTrainingSessions(session.id);
        const cutoff = session.sessionDate;
        setSessions((items) => items.filter((item) => item.recurrenceGroupId !== session.recurrenceGroupId || item.sessionDate < cutoff));
        setUpcomingSessionSource((items) => items.filter((item) => item.recurrenceGroupId !== session.recurrenceGroupId || item.sessionDate < cutoff));
        setSelectedSession(null);
      } catch { setError('Could not delete future recurring sessions.'); }
    }
    async function createRecurrence(session: TrainingSession, occurrences: number) {
      const recurrenceGroupId = crypto.randomUUID();
      try {
        const baseRequest = {
          sportFolderId: session.sportFolderId, title: session.title, sessionDate: session.sessionDate,
          startTime: session.startTime, endTime: session.endTime, sessionType: session.sessionType,
          status: session.status, rating: session.rating, notes: session.notes,
          recurrenceGroupId,
          exercises: session.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, trackingValues: exercise.trackingValues })),
        };
        const groupedSource = await updateTrainingSession(session.id, baseRequest);
        const futureSessions: TrainingSession[] = [];
        for (let index = 1; index < occurrences; index += 1) {
          const date = new Date(`${session.sessionDate}T12:00:00`);
          date.setDate(date.getDate() + index * 7);
          futureSessions.push(await createTrainingSession({ ...baseRequest, sessionDate: formatDateForApi(date), status: 'Planned', rating: null }));
        }
        setSessions((items) => items.map((item) => item.id === groupedSource.id ? groupedSource : item).concat(futureSessions));
        setUpcomingSessionSource((items) => items.map((item) => item.id === groupedSource.id ? groupedSource : item).concat(futureSessions));
        setSuccessMessage(`Created ${occurrences - 1} future weekly sessions.`);
        setRecurrenceSource(null);
      } catch { setError('Could not create the recurring sessions.'); }
    }
    async function duplicateSessionNextWeek(session: TrainingSession) {
      const date = new Date(`${session.sessionDate}T12:00:00`);
      date.setDate(date.getDate() + 7);
      try {
        const duplicate = await createTrainingSession({
          sportFolderId: session.sportFolderId, title: session.title,
          sessionDate: formatDateForApi(date), startTime: session.startTime, endTime: session.endTime,
          sessionType: session.sessionType, status: 'Planned', rating: null, notes: session.notes,
          exercises: session.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, trackingValues: exercise.trackingValues })),
        });
        setSessions((items) => [...items, duplicate]);
        setUpcomingSessionSource((items) => [...items, duplicate]);
        setSelectedSession(null);
        setSuccessMessage('Created a planned copy for next week.');
      } catch { setError('Could not duplicate the session for next week.'); }
    }
    async function handleSessionCancel(session: TrainingSession) {
      try {
        const cancelled = await updateTrainingSession(session.id, {
          sportFolderId: session.sportFolderId,
          title: session.title,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          sessionType: session.sessionType,
          status: 'Cancelled',
          rating: session.rating,
          notes: session.notes,
          exercises: session.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, trackingValues: exercise.trackingValues })),
        });
        setSessions((items) => items.map((item) => item.id === cancelled.id ? cancelled : item));
        setUpcomingSessionSource((items) => items.map((item) => item.id === cancelled.id ? cancelled : item));
        setSelectedSession(null);
      } catch {
        setError('Could not cancel the training session.');
      }
    }
    return (
    <main className="calendar-page" data-distance-unit={distanceUnit}>
        <div className="dashboard-intro">
          {successMessage && <div className="success-message" role="status">{successMessage}<button type="button" onClick={() => setSuccessMessage(null)}>Dismiss</button></div>}
          {(todaySessions.length > 0 || sessionsNeedingReview.length > 0) && <section className="dashboard-reminders" aria-label="Session reminders">
            {todaySessions.length > 0 && <button type="button" onClick={() => handleSessionClick(todaySessions[0].id)}><strong>Today</strong><span>{todaySessions.length} planned {todaySessions.length === 1 ? 'session' : 'sessions'}</span></button>}
            {sessionsNeedingReview.length > 0 && <span><strong>Needs review</strong> {sessionsNeedingReview.length} past planned {sessionsNeedingReview.length === 1 ? 'session' : 'sessions'}</span>}
          </section>}
          <header className="page-header">
            <span className="page-kicker">Your training space</span>
            <div className="calendar-hero-copy">
              <div>
                <h1><span>Plan</span> your training.</h1>
                <p>Build a routine, log the work, and see what is ahead.</p>
              </div>
            </div>
          </header>
          <section className="session-filter-bar" aria-label="Session filters">
          <input
            aria-label="Search sessions or exercises"
            placeholder="Search sessions or exercises"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
            <option value="">All sports</option>
            {sportFolders.map((sport) => <option key={sport.id} value={sport.id}>{sport.icon} {sport.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option><option>Planned</option><option>Completed</option><option>Cancelled</option>
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All types</option><option>Practice</option><option>Workout</option><option>Match</option><option>Cardio</option><option>Recovery</option><option>Other</option>
          </select>
          {(searchTerm || sportFilter || statusFilter || typeFilter) && <button className="secondary-button" type="button" onClick={() => { setSearchTerm(''); setSportFilter(''); setStatusFilter(''); setTypeFilter(''); }}>Clear filters</button>}
          </section>
        </div>
        <div className="stat-strip">
          <div className="stat">
            <div className="stat-label">Training load</div>
            <div className="stat-value">{(totalTrainingMinutes / 60).toFixed(1)}<small>hrs this period</small></div>
          </div>
          <div className="stat">
            <div className="stat-label">Sessions completed</div>
            <div className="stat-value">{completedSessions.length}<small>of {filteredOverviewSessions.length} logged</small></div>
          </div>
          <div className="stat">
            <div className="stat-label">Current streak</div>
            <div className="stat-value">{computeStreak(streakHistorySessions)}<small>days</small></div>
          </div>
          <div className="stat">
            <div className="stat-label">Avg. session</div>
            <div className="stat-value">{completedSessions.length > 0 ? Math.round(totalTrainingMinutes / filteredOverviewSessions.length) : 0}<small>min</small></div>
          </div>
          <div className="stat">
            <div className="stat-label">Calories burned</div>
            <div className="stat-value">{sumCalories(completedSessions).toLocaleString()}<small>kcal est.</small></div>
          </div>
          <div className="stat">
            <div className="stat-label">Steps</div>
            <div className="stat-value">{totalSteps.toLocaleString()}<small>this period</small></div>
          </div>
        </div>
        <section className="dashboard-summary">
          <div className="dashboard-overview">
          <h2>
            Training overview
          </h2>
          <div className="overview-range-controls">
            <select value={overviewRange} onChange={(event) => setOverviewRange(event.target.value as typeof overviewRange)}>
              <option value="week">This displayed week</option>
              <option value="month">This displayed month</option>
              <option value="year">This displayed year</option>
              <option value="custom">Custom range</option>
            </select>
            {overviewRange === 'custom' && <><input type="date" value={customOverviewStart} onChange={(event) => setCustomOverviewStart(event.target.value)} /><input type="date" value={customOverviewEnd} onChange={(event) => setCustomOverviewEnd(event.target.value)} /></>}
          </div>

          <div className="dashboard-stats">
            <article className="dashboard-stat-card">
              <h3>Planned</h3>
              <strong>{plannedSessions.length} sessions</strong>
              <ul className="dashboard-sport-list">
                {plannedBySport.map((sport) => (
                  <li key={sport.name}>
                    <span style={{ color: sport.color }}>
                      {sport.icon ?? '•'} {sport.name}
                    </span>
                    <span>
                      {sport.count} {sport.count === 1 ? 'session' : 'sessions'} · {formatTrainingTime(sport.durationMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="dashboard-stat-card">
              <h3>Completed</h3>
              <strong>{completedSessions.length} sessions</strong>
              <ul className="dashboard-sport-list">
                {completedBySport.map((sport) => (
                  <li key={sport.name}>
                    <span style={{ color: sport.color }}>
                      {sport.icon ?? '•'} {sport.name}
                    </span>
                    <span>
                      {sport.count} {sport.count === 1 ? 'session' : 'sessions'} · {formatTrainingTime(sport.durationMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="dashboard-stat-card">
              <h3>Training time</h3>
              <strong>{formatTrainingTime(totalTrainingMinutes)}</strong>
              <p>{filteredOverviewSessions.length} matching sessions</p>
            </article>
          </div>
          <div className="dashboard-insights">
            <article><h3>Session status</h3><div className="status-chart">{statusCounts.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${(item.count / statusTotal) * 100}%`, backgroundColor: item.color }} /></i><small>{item.count}</small></div>)}</div></article>
            <article>
              <h3>Completed time by sport</h3>
              {sportComparison.length === 0 ? <p>No completed sessions in this range.</p> : <div className="sport-comparison">{sportComparison.map((sport) => <div key={sport.name}><span>{sport.name}</span><i><b style={{ width: `${(sport.durationMinutes / maxSportMinutes) * 100}%`, backgroundColor: sport.color }} /></i><small>{formatTrainingTime(sport.durationMinutes)}</small></div>)}</div>}
            </article>
          </div>
          </div>
          <aside className="upcoming-sessions">
          <h2>Next upcoming session</h2>
          {upcomingSessions.length === 0 ? (
            <p>No planned sessions in this period.</p>
          ) : (
            <ul>
              {upcomingSessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    data-exercise-tooltip={formatExerciseTooltip(session)}
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <span style={{ color: session.sportFolderColor }}>
                      {session.sportFolderIcon} {session.title}
                    </span>
                    <small>
                      {session.sessionDate} · {session.startTime.slice(0, 5)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </aside>
        </section>
        <section className="calendar-surface">
        <div className="calendar-toolbar">
        <h2>
            {calendarView === 'month'
              ? monthFormatter.format(selectedDate)
              : (
                <>
            {weekRangeFormatter.format(weekDates[0])} –{' '}
            {weekRangeFormatter.format(weekDates[6])}
                </>
              )}
        </h2>

        <div className="calendar-period-controls">
            <button type="button" onClick={() => changeCalendarPeriod(-1)}>
            Previous
            </button>
            <button type="button" onClick={() => setSelectedDate(new Date())}>
            Today
            </button>
            <button type="button" onClick={() => changeCalendarPeriod(1)}>
            Next
            </button>
        </div>
        <div className="calendar-view-controls">
            <button
              aria-pressed={calendarView === 'week'}
              type="button"
              onClick={() => {
                setCalendarView('week');
                setOverviewRange('week');
              }}
            >
              Week
            </button>
            <button
              aria-pressed={calendarView === 'month'}
              type="button"
              onClick={() => {
                setCalendarView('month');
                setOverviewRange('month');
              }}
            >
              Month
            </button>
        </div>
        <button className="secondary-button export-sessions-button" type="button" onClick={() => exportSessionsCsv(filteredOverviewSessions)}>Export CSV</button>
        </div>

        {isLoading ? (
            <p>Loading sessions...</p>
        ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <WeeklyLedger
                mode={calendarView}
                anchorDate={selectedDate}
                firstDay={weekStartsOn}
                sessions={filteredSessions}
                stepsByDate={stepsByDate}
                onSessionClick={handleSessionClick}
                onDayClick={handleDayClick}
                onSessionReschedule={(sessionId, newDate) => void handleSessionReschedule(sessionId, newDate)}
              />
                {pendingCreateDate && !isSessionDialogOpen && (
                <div className="selected-range-actions">
                    <p>
                    {pendingCreateDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>

                    <button
                    type="button"
                    onClick={() => setIsSessionDialogOpen(true)}
                    >
                    Create session
                    </button>
                    <button
                    className="secondary-button"
                    type="button"
                    onClick={handleCreateDismiss}
                    >
                    Dismiss
                    </button>
                </div>
                )}

                {pendingCreateDate && isSessionDialogOpen && (
                <SessionDialog
                    start={new Date(pendingCreateDate.getFullYear(), pendingCreateDate.getMonth(), pendingCreateDate.getDate(), 9, 0)}
                    end={new Date(pendingCreateDate.getFullYear(), pendingCreateDate.getMonth(), pendingCreateDate.getDate(), 10, 0)}
                    onClose={handleCreateDismiss}
                    onCreated={(createdSession) => {
                    setSessions((currentSessions) => [
                        ...currentSessions,
                        createdSession,
                    ]);
                    setUpcomingSessionSource((currentSessions) => [
                      ...currentSessions,
                      createdSession,
                    ]);
                    setIsSessionDialogOpen(false);
                    setPendingCreateDate(null);
                    }}
                />
                )}

                {editingSession && (
                  <SessionDialog
                    key={editingSession.id}
                    start={new Date(
                      `${editingSession.sessionDate}T${editingSession.startTime}`,
                    )}
                    end={new Date(
                      `${editingSession.sessionDate}T${editingSession.endTime}`,
                    )}
                    sessionToEdit={editingSession}
                    onClose={() => setEditingSession(null)}
                    onCreated={(createdSession) => {
                      setSessions((currentSessions) => [
                        ...currentSessions,
                        createdSession,
                      ]);
                    }}
                    onUpdated={(updatedSession) => {
                      setSessions((currentSessions) =>
                        currentSessions.map((session) =>
                          session.id === updatedSession.id
                            ? updatedSession
                            : session,
                        ),
                      );
                      setUpcomingSessionSource((currentSessions) => {
                        const hasSession = currentSessions.some(
                          (session) => session.id === updatedSession.id,
                        );

                        return hasSession
                          ? currentSessions.map((session) =>
                            session.id === updatedSession.id
                              ? updatedSession
                              : session)
                          : [...currentSessions, updatedSession];
                      });
                      setEditingSession(null);
                    }}
                  />
                )}

                {selectedSession && (
                  <SessionDetailsDialog
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onEdit={() => {
                      setEditingSession(selectedSession);
                      setSelectedSession(null);
                    }}
                    onDelete={() => handleSessionDelete(selectedSession)}
                    onDeleteFuture={() => void handleFutureSessionDelete(selectedSession)}
                    onComplete={() => { setSessionToComplete(selectedSession); setSelectedSession(null); }}
                    onCancel={() => void handleSessionCancel(selectedSession)}
                    onDuplicate={() => { setDuplicatingSession(selectedSession); setSelectedSession(null); }}
                    onDuplicateNextWeek={() => void duplicateSessionNextWeek(selectedSession)}
                    onMakeRecurring={() => { setRecurrenceSource(selectedSession); setSelectedSession(null); }}
                  />
                )}

                {recurrenceSource && <RecurrenceDialog title={recurrenceSource.title} onClose={() => setRecurrenceSource(null)} onCreate={(occurrences) => void createRecurrence(recurrenceSource, occurrences)} />}

                {duplicatingSession && (
                  <SessionDialog
                    start={new Date(`${duplicatingSession.sessionDate}T${duplicatingSession.startTime}`)}
                    end={new Date(`${duplicatingSession.sessionDate}T${duplicatingSession.endTime}`)}
                    sessionToDuplicate={duplicatingSession}
                    onClose={() => setDuplicatingSession(null)}
                    onCreated={(createdSession) => {
                      setSessions((items) => [...items, createdSession]);
                      setUpcomingSessionSource((items) => [...items, createdSession]);
                      setDuplicatingSession(null);
                    }}
                  />
                )}

                {sessionToComplete && (
                  <CompleteSessionDialog
                    session={sessionToComplete}
                    onClose={() => setSessionToComplete(null)}
                    onComplete={async (rating, notes, exercises) => {
                      try {
                        const completedSession = await updateTrainingSession(sessionToComplete.id, {
                          sportFolderId: sessionToComplete.sportFolderId,
                          title: sessionToComplete.title,
                          sessionDate: sessionToComplete.sessionDate,
                          startTime: sessionToComplete.startTime,
                          endTime: sessionToComplete.endTime,
                          sessionType: sessionToComplete.sessionType,
                          status: 'Completed',
                          rating,
                          notes,
                          exercises: exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, trackingValues: exercise.trackingValues })),
                        });
                        setSessions((items) => items.map((item) => item.id === completedSession.id ? completedSession : item));
                        setUpcomingSessionSource((items) => items.map((item) => item.id === completedSession.id ? completedSession : item));
                        setSessionToComplete(null);
                      } catch { setError('Could not complete the training session.'); }
                    }}
                  />
                )}

                {sessionsNeedingReview.length > 0 && (
                  <SessionReviewDialog
                    sessions={sessionsNeedingReview}
                    onClose={() => setSessionsNeedingReview([])}
                    onReviewed={(updatedSession) => {
                      setSessionsNeedingReview((currentSessions) =>
                        currentSessions.filter(
                          (session) => session.id !== updatedSession.id,
                        ),
                      );
                      setSessions((currentSessions) =>
                        currentSessions.map((session) =>
                          session.id === updatedSession.id
                            ? updatedSession
                            : session,
                        ),
                      );
                      setUpcomingSessionSource((currentSessions) =>
                        currentSessions.map((session) =>
                          session.id === updatedSession.id
                            ? updatedSession
                            : session,
                        ),
                      );
                    }}
                  />
                )}
            </>
          )}
        </section>
    </main>
    );
}

export default DashboardPage;
