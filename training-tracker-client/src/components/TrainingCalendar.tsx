import FullCalendar, {
  type DateSelectInfo,
} from '@fullcalendar/react';
import { useRef, useState } from 'react';
import interactionPlugin from '@fullcalendar/react/interaction';
import themePlugin from '@fullcalendar/react/themes/monarch';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import type { TrainingSession } from '../types/trainingSession';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import '@fullcalendar/react/themes/monarch/palettes/purple.css';
import dayGridPlugin from '@fullcalendar/react/daygrid';

interface TrainingCalendarProps {
  initialDate: Date;
  sessions: TrainingSession[];
  onTimeRangeSelect: (start: Date, end: Date) => void;
  onTimeRangeClear: () => void;
  onSessionClick: (sessionId: number) => void;
  onSessionScheduleChange: (sessionId: number, start: Date, end: Date) => void;
  firstDay?: number;
  view?: 'timeGridWeek' | 'dayGridMonth';
}

interface ExerciseTooltip {
  content: string;
  left: number;
  top: number;
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

function TrainingCalendar({
  initialDate,
  sessions,
  onTimeRangeSelect,
  onTimeRangeClear,
  onSessionClick,
  onSessionScheduleChange,
  firstDay = 1,
  view = 'timeGridWeek'
}: TrainingCalendarProps) {
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const [exerciseTooltip, setExerciseTooltip] = useState<ExerciseTooltip | null>(null);

  const events = sessions.map((session) => {
    if (view === 'dayGridMonth') {
      return {
        id: String(session.id),
        title: session.title,
        start: session.sessionDate,
        allDay: true,
        color: session.sportFolderColor,
        textColor: '#ffffff',
        classNames: ['training-calendar-event'],
        extendedProps: {
          exerciseTooltip: formatExerciseTooltip(session),
          eventColor: session.sportFolderColor,
        },
      };
    }

    return {
      id: String(session.id),
      title: session.title,
      start: `${session.sessionDate}T${session.startTime}`,
      end: `${session.sessionDate}T${session.endTime}`,
      color: session.sportFolderColor,
      textColor: '#ffffff',
      classNames: ['training-calendar-event'],
      extendedProps: {
        exerciseTooltip: formatExerciseTooltip(session),
        eventColor: session.sportFolderColor,
      },
    };
  });

  return (
    <div ref={calendarWrapperRef} className="training-calendar-wrapper">
      <FullCalendar
      plugins={[themePlugin, timeGridPlugin, interactionPlugin, dayGridPlugin]}
      initialView={view}
      initialDate={initialDate}
      firstDay={firstDay}
      events={events}
      eventDisplay="block"
      headerToolbar={false}
      allDaySlot={false}
      slotDuration="00:30:00"
      scrollTime="07:00:00"
      dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
      eventContent={(eventInfo) => (
        <div className="calendar-event-content">
          {eventInfo.view.type !== 'dayGridMonth' && (
            <strong>{eventInfo.timeText}</strong>
          )}
          <span>{eventInfo.event.title}</span>
        </div>
      )}
      eventMouseEnter={(hoverInfo) => {
        if (hoverInfo.event.extendedProps.exerciseTooltip === 'No exercises logged.') {
          return;
        }
        const wrapperBounds = calendarWrapperRef.current?.getBoundingClientRect();
        const eventBounds = hoverInfo.el.getBoundingClientRect();

        if (!wrapperBounds) {
          return;
        }

        setExerciseTooltip({
          content: String(hoverInfo.event.extendedProps.exerciseTooltip),
          left: eventBounds.left - wrapperBounds.left,
          top: eventBounds.bottom - wrapperBounds.top + 7,
        });
      }}
      eventMouseLeave={() => setExerciseTooltip(null)}
      eventDidMount={(mountInfo) => {
        const eventColor = String(mountInfo.event.extendedProps.eventColor);

        mountInfo.el.style.setProperty('background-color', eventColor, 'important');
        mountInfo.el.style.setProperty('border-color', eventColor, 'important');
        mountInfo.el.style.setProperty('color', '#ffffff', 'important');
        mountInfo.el.querySelectorAll('*').forEach((element) => {
          (element as HTMLElement).style.setProperty('color', '#ffffff', 'important');
        });
      }}
      selectable={view === 'timeGridWeek'}
      editable={view === 'timeGridWeek'}
      eventDurationEditable={view === 'timeGridWeek'}
      selectMirror
      nowIndicator
      height="auto"
      slotMinTime="07:00:00"
      slotMaxTime="24:00:00"
      select={(selectionInfo: DateSelectInfo) => {
        onTimeRangeSelect(selectionInfo.start, selectionInfo.end);
      }}
      unselect={onTimeRangeClear}
      unselectCancel=".selected-range-actions, .dialog-backdrop"
      eventClick={(clickInfo) => {
        onSessionClick(Number(clickInfo.event.id));
      }}
      eventDrop={(changeInfo) => {
        if (changeInfo.event.start && changeInfo.event.end) {
          onSessionScheduleChange(
            Number(changeInfo.event.id),
            changeInfo.event.start,
            changeInfo.event.end,
          );
        }
      }}
      eventResize={(changeInfo) => {
        if (changeInfo.event.start && changeInfo.event.end) {
          onSessionScheduleChange(
            Number(changeInfo.event.id),
            changeInfo.event.start,
            changeInfo.event.end,
          );
        }
      }}
    />
      {exerciseTooltip && (
        <div
          className="calendar-exercise-tooltip"
          style={{ left: exerciseTooltip.left, top: exerciseTooltip.top }}
        >
          <span className="calendar-tooltip-label">Exercises</span>
          <span>{exerciseTooltip.content}</span>
        </div>
      )}
    </div>
  );
}

export default TrainingCalendar;
