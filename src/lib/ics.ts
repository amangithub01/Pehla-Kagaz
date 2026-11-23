import { createEvents, type EventAttributes } from "ics";

export type CalendarReminder = {
  title: string;
  description: string;
  targetDate: string | Date;
  url?: string;
};

/**
 * Creates an iCalendar (.ics) string from a list of reminders.
 */
export function generateIcs(reminders: CalendarReminder[]): Promise<string> {
  const events: EventAttributes[] = reminders.map((r) => {
    const d = typeof r.targetDate === "string" ? new Date(r.targetDate) : r.targetDate;
    return {
      title: r.title,
      description: r.description,
      start: [d.getFullYear(), d.getMonth() + 1, d.getDate(), 9, 0],
      duration: { hours: 1 },
      url: r.url,
      status: "CONFIRMED",
      busyStatus: "BUSY",
    };
  });

  return new Promise((resolve, reject) => {
    createEvents(events, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

/**
 * Triggers a browser download of the .ics file.
 */
export function downloadIcs(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
