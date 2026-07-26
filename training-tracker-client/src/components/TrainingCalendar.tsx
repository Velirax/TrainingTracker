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

interface TrainingCalendarProps {
  initialDate: Date;
  sessions: TrainingSession[];
  onTimeRangeSelect: (start: Date, end: Date) => void;
}

function TrainingCalendar({
  initialDate,
  sessions,
  onTimeRangeSelect,
}: TrainingCalendarProps) {
  const events = sessions.map((session) => ({
    id: String(session.id),
    title: session.title,
    start: `${session.sessionDate}T${session.startTime}`,
    end: `${session.sessionDate}T${session.endTime}`,
    color: session.sportFolderColor,
  }));

  return (
    <FullCalendar
      plugins={[themePlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      initialDate={initialDate}
      events={events}
      headerToolbar={false}
      eventContent={(eventInfo) => (
        <div className="calendar-event-content">
          <strong>{eventInfo.timeText}</strong>
          <span>{eventInfo.event.title}</span>
        </div>
      )}
      selectable
      selectMirror
      nowIndicator
      height="auto"
      slotMinTime="07:00:00"
      slotMaxTime="24:00:00"
      select={(selectionInfo: DateSelectInfo) => {
        onTimeRangeSelect(selectionInfo.start, selectionInfo.end);
    }}
    />
  );
}

export default TrainingCalendar;
