/**
 * Date manipulation and formatting helpers for deadlines and tracking.
 */

export function parseDate(dateStr: string | Date): Date {
  return typeof dateStr === "string" ? new Date(dateStr) : dateStr;
}

export function formatDate(date: string | Date, lang: "en" | "te" = "en"): string {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function addDays(date: string | Date, days: number): Date {
  const d = new Date(parseDate(date));
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const d1 = new Date(parseDate(from));
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(parseDate(to));
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function daysRemaining(targetDate: string | Date, fromDate: string | Date = new Date()): number {
  return daysBetween(fromDate, targetDate);
}

export function isPastDue(targetDate: string | Date, fromDate: string | Date = new Date()): boolean {
  return daysRemaining(targetDate, fromDate) < 0;
}

export type FollowupStatus = {
  followupDate: Date;
  daysRemaining: number;
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
};

export function getFollowupStatus(
  appliedOn: string,
  followupDays: number = 30,
  today: Date = new Date(),
): FollowupStatus {
  const followupDate = addDays(appliedOn, followupDays);
  const remaining = daysRemaining(followupDate, today);

  let label = "";
  if (remaining < 0) {
    const overdueDays = Math.abs(remaining);
    label = overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`;
  } else if (remaining === 0) {
    label = "Follow-up due today";
  } else if (remaining === 1) {
    label = "Follow-up due tomorrow";
  } else {
    label = `Follow-up in ${remaining} days`;
  }

  return {
    followupDate,
    daysRemaining: remaining,
    label,
    isOverdue: remaining < 0,
    isDueToday: remaining === 0,
  };
}
