// Convert "HH:MM" local time in a given timezone to a UTC Date for today
export function localTimeToUtcToday(timeStr: string, timezone: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDateStr = formatter.format(now); // "YYYY-MM-DD"

  const localIso = `${localDateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  const localDate = new Date(
    new Date(localIso + 'Z').toLocaleString('en-US', { timeZone: 'UTC' }),
  );

  const utcDate = new Date(
    new Date(localIso + 'Z').toLocaleString('en-US', { timeZone: timezone }),
  );
  const offsetMs = localDate.getTime() - utcDate.getTime();

  return new Date(new Date(localIso + 'Z').getTime() + offsetMs);
}
