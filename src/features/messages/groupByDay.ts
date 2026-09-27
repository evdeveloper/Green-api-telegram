import { isSameDay } from '@/lib/time';
import type { Message } from '@/store/models';

export interface DayGroup {
  /** Начало дня в миллисекундах — ключ и значение для разделителя. */
  dayStart: number;
  messages: Message[];
}

/**
 * Группировка сообщений по дням для разделителей «Сегодня» / «Вчера» / дата.
 * Ожидает список, уже отсортированный по времени (этим занимается редьюсер).
 */
export function groupByDay(messages: Message[]): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const message of messages) {
    const date = new Date(message.timestamp);
    const last = groups.at(-1);

    if (last && isSameDay(new Date(last.dayStart), date)) {
      last.messages.push(message);
      continue;
    }

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    groups.push({ dayStart, messages: [message] });
  }

  return groups;
}

/**
 * Сообщение — последнее в серии от одного отправителя?
 * Хвостик у баббла и время рисуются только у последнего в серии,
 * иначе плотная переписка выглядит рваной.
 */
export function isLastInSeries(messages: Message[], index: number): boolean {
  const current = messages[index];
  const next = messages[index + 1];
  if (!next) return true;
  if (next.direction !== current.direction) return true;
  // Разрыв больше пяти минут — считаем началом новой серии.
  return next.timestamp - current.timestamp > 5 * 60 * 1000;
}
