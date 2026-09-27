import { useEffect } from 'react';

/**
 * Тост для неблокирующих ошибок (лимит длины, неудачная загрузка истории).
 * Блокирующие ошибки — состояние инстанса, неверные креды — показываются
 * на экране входа, а не здесь.
 */
export function Toast({
  text,
  onDismiss,
  timeoutMs = 6000,
}: {
  text: string;
  onDismiss: () => void;
  timeoutMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [text, onDismiss, timeoutMs]);

  return (
    <div
      role="status"
      className="bg-panel border-divider text-detail fixed bottom-5 left-1/2 z-50 flex max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-(--radius-control) border px-4 py-3 shadow-lg"
    >
      <span className="min-w-0">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Закрыть уведомление"
        className="text-text-tertiary hover:text-text-primary shrink-0 leading-none"
      >
        ✕
      </button>
    </div>
  );
}
