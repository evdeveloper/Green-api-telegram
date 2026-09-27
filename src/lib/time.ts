/** GREEN-API отдаёт timestamp в секундах — переводим в миллисекунды. */
export function toMillis(timestampSeconds: number): number {
  return timestampSeconds * 1000;
}

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});

/** Время в баббле сообщения: 14:05. */
export function formatTime(millis: number): string {
  return timeFormatter.format(millis);
}

/** Разделитель дат в переписке: «Сегодня» / «Вчера» / «5 марта». */
export function formatDayDivider(millis: number): string {
  const date = new Date(millis);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return 'Сегодня';
  if (isSameDay(date, yesterday)) return 'Вчера';
  return dayFormatter.format(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Время последней активности в списке чатов: время для сегодня, дата для прошлого. */
export function formatChatListTime(millis: number): string {
  const date = new Date(millis);
  return isSameDay(date, new Date()) ? formatTime(millis) : formatDayDivider(millis);
}
