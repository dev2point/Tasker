import { Task } from '@/types/task';
import { getTaskDueDateTime } from './reminders';

// Export tasks into iCalendar (.ics) format
export function generateICalendar(tasks: Task[]): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const formatICSDate = (date: Date) => {
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      'Z'
    );
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planit//Task Manager with Reminders//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Mes Tâches Planit',
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  const nowFormatted = formatICSDate(new Date());

  tasks.forEach((task) => {
    const dueDateTime = getTaskDueDateTime(task);
    const startDateTime = new Date(dueDateTime.getTime() - 30 * 60 * 1000); // 30 min before as event start

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:task-${task.id}@planit.app`);
    lines.push(`DTSTAMP:${nowFormatted}`);
    lines.push(`DTSTART:${formatICSDate(startDateTime)}`);
    lines.push(`DTEND:${formatICSDate(dueDateTime)}`);
    lines.push(`SUMMARY:${task.title.replace(/[\n\r,]/g, ' ')}`);

    let description = task.description || '';
    if (task.subtasks && task.subtasks.length > 0) {
      description +=
        '\\n\\nSous-tâches:\\n' +
        task.subtasks
          .map((s) => `${s.completed ? '[X]' : '[ ]'} ${s.title}`)
          .join('\\n');
    }
    description += `\\nPriorité: ${task.priority}\\nCatégorie: ${task.category}`;
    lines.push(`DESCRIPTION:${description.replace(/\n/g, '\\n')}`);

    if (task.completed) {
      lines.push('STATUS:COMPLETED');
    } else {
      lines.push('STATUS:CONFIRMED');
    }

    if (task.priority === 'urgent' || task.priority === 'high') {
      lines.push('PRIORITY:1');
    } else if (task.priority === 'medium') {
      lines.push('PRIORITY:5');
    } else {
      lines.push('PRIORITY:9');
    }

    // Alarm / Reminder if configured
    if (task.reminderMinutesBefore >= 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Rappel: ${task.title.replace(/[\n\r]/g, ' ')}`);
      lines.push(`TRIGGER:-PT${task.reminderMinutesBefore}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Trigger file download in browser
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
