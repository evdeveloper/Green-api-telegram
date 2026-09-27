import type { ReactNode } from 'react';

/**
 * Баннер для состояний, которые нельзя просто показать тостом: они длятся,
 * пока причина не устранена (инстанс не авторизован, опрос ведёт другая
 * вкладка). Тост в таких случаях исчезает, и пользователь остаётся
 * с неработающим чатом без объяснения.
 */
export function Banner({
  tone,
  children,
  action,
}: {
  tone: 'warning' | 'danger';
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  const palette =
    tone === 'danger'
      ? 'bg-danger/12 text-danger border-danger/30'
      : 'bg-accent/10 text-text-primary border-accent/30';

  return (
    <div
      role="status"
      className={`text-detail flex items-center gap-3 border-b px-4 py-2.5 ${palette}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="border-current/40 shrink-0 rounded-(--radius-control) border px-3 py-1 font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
