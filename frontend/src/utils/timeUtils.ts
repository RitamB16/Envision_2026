/**
 * Formats any Date object, ISO string, or timestamp strictly into Indian Standard Time (IST / Asia/Kolkata).
 * Output Example: "25 Jul 2026, 05:08 PM IST"
 */
export function formatISTTimestamp(dateInput?: string | number | Date | null): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date()) + ' IST';
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date) + ' IST';
}
