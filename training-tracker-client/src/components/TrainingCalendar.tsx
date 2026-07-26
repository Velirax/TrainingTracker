import FullCalendar, {
  type DateSelectInfo,
} from '@fullcalendar/react';
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
  view?: 'timeGridWeek' | 'dayGridMonth';
}

function TrainingCalendar({
  initialDate,
  sessions,
  onTimeRangeSelect,
  onTimeRangeClear,
  onSessionClick,
  view = 'timeGridWeek'
}: TrainingCalendarProps) {
  const events = sessions.map((session) => {
    if (view === 'dayGridMonth') {
      return {
        id: String(session.id),
        title: session.title,
        start: session.sessionDate,
        allDay: true,
        color: session.sportFolderColor,
      };
    }

    return {
      id: String(session.id),
      title: session.title,
      start: `${session.sessionDate}T${session.startTime}`,
      end: `${session.sessionDate}T${session.endTime}`,
      color: session.sportFolderColor,
    };
  });

  return (
    <FullCalendar
      plugins={[themePlugin, timeGridPlugin, interactionPlugin, dayGridPlugin]}
      initialView={view}
      initialDate={initialDate}
      firstDay={1}
      events={events}
      eventDisplay="block"
      headerToolbar={false}
      eventContent={(eventInfo) => (
        <div className="calendar-event-content">
          {eventInfo.view.type !== 'dayGridMonth' && (
            <strong>{eventInfo.timeText}</strong>
          )}
          <span>{eventInfo.event.title}</span>
        </div>
      )}
      selectable={view === 'timeGridWeek'}
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
    />
  );
}

export default TrainingCalendar;
