import { useEffect, useState } from 'react';
import { getTrainingSessions } from '../services/trainingSessionService';
import type { TrainingSession } from '../types/trainingSession';
import TrainingCalendar from '../components/TrainingCalendar';
import SessionDetailsDialog from '../components/SessionDetailsDialog';
import SessionDialog from '../components/SessionDialog';

const weekRangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
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
function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
interface SelectedTimeRange {
  start: Date;
  end: Date;
}
function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const weekDates = getWeekDates(selectedDate);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<SelectedTimeRange | null>(null);
    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);


    useEffect(() => {
        async function loadTrainingSessions() {
            setIsLoading(true);
            setError(null);

            try {
            const loadedSessions = await getTrainingSessions(
                formatDateForApi(weekDates[0]),
                formatDateForApi(weekDates[6]),
            );

            setSessions(loadedSessions);
            } catch {
            setError('Could not load training sessions.');
            } finally {
            setIsLoading(false);
            }
        }

        loadTrainingSessions();
        }, [selectedDate]);


    function changeWeek(days: number) {
        setSelectedDate((currentDate) => {
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + days);
            return nextDate;
        });
    }

    function handleTimeRangeSelect(start: Date, end: Date) {
    setSelectedTimeRange({ start, end });
    setIsSessionDialogOpen(false);
    setSelectedSession(null);
    }

    function handleSessionClick(sessionId: number) {
    const session = sessions.find((currentSession) => currentSession.id === sessionId);

    if (session) {
        setSelectedTimeRange(null);
        setIsSessionDialogOpen(false);
        setSelectedSession(session);
    }
    }
    return (
    <main className="calendar-page">
        <h1>Training calendar</h1>
        <p>Plan your sessions and see your training week at a glance.</p>
        <section>
        <div className="calendar-toolbar">
        <h2>
            {weekRangeFormatter.format(weekDates[0])} –{' '}
            {weekRangeFormatter.format(weekDates[6])}
        </h2>

        <div>
            <button type="button" onClick={() => changeWeek(-7)}>
            Previous
            </button>
            <button type="button" onClick={() => setSelectedDate(new Date())}>
            Today
            </button>
            <button type="button" onClick={() => changeWeek(7)}>
            Next
            </button>
        </div>
        </div>

        {isLoading ? (
            <p>Loading sessions...</p>
        ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <TrainingCalendar
                key={formatDateForApi(selectedDate)}
                initialDate={selectedDate}
                sessions={sessions}
                onTimeRangeSelect={handleTimeRangeSelect}
                onSessionClick={handleSessionClick}
              />
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

                {selectedSession && (
                  <SessionDetailsDialog
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                  />
                )}
            </>
          )}
        </section>
    </main>
    );
}

export default DashboardPage;
