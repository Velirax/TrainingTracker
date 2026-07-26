import { useEffect, useState } from 'react';
import {
  deleteTrainingSession,
  getTrainingSessions,
  getSessionsNeedingReview,
} from '../services/trainingSessionService';
import type { TrainingSession } from '../types/trainingSession';
import TrainingCalendar from '../components/TrainingCalendar';
import MonthCalendar from '../components/MonthCalendar';
import SessionDetailsDialog from '../components/SessionDetailsDialog';
import SessionDialog from '../components/SessionDialog';
import SessionReviewDialog from '../components/SessionReviewDialog';

const weekRangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

function getWeekDates(date: Date): Date[] {
  const startOfWeek = new Date(date);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;

  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

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
  }>();

  for (const session of sessions) {
    const currentSummary = sportSummaries.get(session.sportFolderId);

    if (currentSummary) {
      currentSummary.count += 1;
    } else {
      sportSummaries.set(session.sportFolderId, {
        name: session.sportFolderName,
        color: session.sportFolderColor,
        icon: session.sportFolderIcon,
        count: 1,
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

interface SelectedTimeRange {
  start: Date;
  end: Date;
}
function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState<
      'timeGridWeek' | 'dayGridMonth'
    >('timeGridWeek');
    const weekDates = getWeekDates(selectedDate);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<SelectedTimeRange | null>(null);
    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
    const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
    const [sessionsNeedingReview, setSessionsNeedingReview] = useState<TrainingSession[]>([]);
    const plannedSessions = sessions.filter((session) => session.status === 'Planned');
    const completedSessions = sessions.filter((session) => session.status === 'Completed');
    const plannedBySport = groupSessionsBySport(plannedSessions);
    const completedBySport = groupSessionsBySport(completedSessions);
    const totalTrainingMinutes = sessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    );


    useEffect(() => {
        async function loadTrainingSessions() {
            setIsLoading(true);
            setError(null);

            try {
            const [startDate, endDate] = calendarView === 'timeGridWeek'
                ? [weekDates[0], weekDates[6]]
                : getMonthDates(selectedDate);

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
        }, [selectedDate, calendarView]);

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

            if (calendarView === 'timeGridWeek') {
              nextDate.setDate(nextDate.getDate() + direction * 7);
            } else {
              nextDate.setMonth(nextDate.getMonth() + direction);
            }

            return nextDate;
        });
    }

    function handleTimeRangeSelect(start: Date, end: Date) {
      setSelectedTimeRange({ start, end });
      setIsSessionDialogOpen(false);
      setSelectedSession(null);
    }

    function handleTimeRangeClear() {
    setSelectedTimeRange(null);
    setIsSessionDialogOpen(false);
    }

    function handleSessionClick(sessionId: number) {
      const session = sessions.find((currentSession) => currentSession.id === sessionId);

      if (session) {
          setSelectedTimeRange(null);
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
        setSelectedSession(null);
      } catch {
        setError('Could not delete the training session.');
      }
    }
    return (
    <main className="calendar-page">
        <h1>Training calendar</h1>
        <p>Plan your sessions and see your training week at a glance.</p>
        <section className="dashboard-overview">
          <h2>
            {calendarView === 'timeGridWeek'
              ? 'Week overview'
              : `${monthFormatter.format(selectedDate)} overview`}
          </h2>

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
                    <span>{sport.count}</span>
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
                    <span>{sport.count}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="dashboard-stat-card">
              <h3>Training time</h3>
              <strong>{formatTrainingTime(totalTrainingMinutes)}</strong>
              <p>{sessions.length} total sessions</p>
            </article>
          </div>
        </section>
        <section>
        <div className="calendar-toolbar">
        <h2>
            {calendarView === 'dayGridMonth'
              ? monthFormatter.format(selectedDate)
              : (
                <>
            {weekRangeFormatter.format(weekDates[0])} –{' '}
            {weekRangeFormatter.format(weekDates[6])}
                </>
              )}
        </h2>

        <div>
            <button type="button" onClick={() => changeCalendarPeriod(-1)}>
            Previous
            </button>
            <button type="button" onClick={() => setSelectedDate(new Date())}>
            Today
            </button>
            <button type="button" onClick={() => changeCalendarPeriod(1)}>
            Next
            </button>
            <button
              aria-pressed={calendarView === 'timeGridWeek'}
              type="button"
              onClick={() => setCalendarView('timeGridWeek')}
            >
              Week
            </button>
            <button
              aria-pressed={calendarView === 'dayGridMonth'}
              type="button"
              onClick={() => setCalendarView('dayGridMonth')}
            >
              Month
            </button>
        </div>
        </div>

        {isLoading ? (
            <p>Loading sessions...</p>
        ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              {calendarView === 'dayGridMonth' ? (
                <MonthCalendar
                  selectedDate={selectedDate}
                  sessions={sessions}
                  onSessionClick={handleSessionClick}
                />
              ) : (
                <TrainingCalendar
                  key={`${formatDateForApi(selectedDate)}-${sessions.map((session) => `${session.id}-${session.updatedAt}`).join(',')}`}
                  initialDate={selectedDate}
                  sessions={sessions}
                  onTimeRangeSelect={handleTimeRangeSelect}
                  onTimeRangeClear={handleTimeRangeClear}
                  onSessionClick={handleSessionClick}
                />
              )}
                {selectedTimeRange && !isSessionDialogOpen && (
                <div className="selected-range-actions">
                    <p>
                    {selectedTimeRange.start.toLocaleString()} –{' '}
                    {selectedTimeRange.end.toLocaleString()}
                    </p>

                    <button
                    type="button"
                    onClick={() => setIsSessionDialogOpen(true)}
                    >
                    Create session
                    </button>
                </div>
                )}

                {selectedTimeRange && isSessionDialogOpen && (
                <SessionDialog
                    start={selectedTimeRange.start}
                    end={selectedTimeRange.end}
                    onClose={() => {
                    setIsSessionDialogOpen(false);
                    setSelectedTimeRange(null);
                    }}
                    onCreated={(createdSession) => {
                    setSessions((currentSessions) => [
                        ...currentSessions,
                        createdSession,
                    ]);
                    setIsSessionDialogOpen(false);
                    setSelectedTimeRange(null);
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
