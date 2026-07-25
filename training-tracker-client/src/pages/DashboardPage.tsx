import { useEffect, useState } from 'react';
import { getTrainingSessions } from '../services/trainingSessionService';
import type { TrainingSession } from '../types/trainingSession';
import TrainingCalendar from '../components/TrainingCalendar';
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

function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const weekDates = getWeekDates(selectedDate);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            <TrainingCalendar
                key={formatDateForApi(selectedDate)}
                initialDate={selectedDate}
                sessions={sessions}
            />
        )}
        </section>
    </main>
    );
}

export default DashboardPage;