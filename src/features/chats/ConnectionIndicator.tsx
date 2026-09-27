import { useAppState } from '@/store/hooks';

/**
 * Состояние long polling. Пользователю важно отличать «собеседник молчит»
 * от «мы вообще не получаем сообщения» — без этого индикатора обрыв связи
 * выглядит как тишина в чате.
 */
export function ConnectionIndicator() {
  const { connection, isPollingTab, hasOtherTabs } = useAppState();

  // В пассивной вкладке опрос выключен намеренно — «нет соединения»
  // здесь означало бы поломку и противоречило бы баннеру сверху.
  const idleLabel = !isPollingTab && hasOtherTabs ? 'Опрос в другой вкладке' : 'Нет соединения';

  const { label, dot } =
    connection === 'online'
      ? { label: 'На связи', dot: 'bg-success' }
      : connection === 'reconnecting'
        ? { label: 'Переподключение…', dot: 'bg-danger animate-pulse' }
        : { label: idleLabel, dot: 'bg-text-tertiary' };

  return (
    <p className="text-text-secondary flex items-center gap-2 text-xs" aria-live="polite">
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </p>
  );
}
