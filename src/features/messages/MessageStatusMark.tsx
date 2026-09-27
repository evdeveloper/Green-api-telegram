import type { MessageStatus } from '@/store/models';

/**
 * Статус исходящего сообщения. Иконки, а не текст: так они не спорят
 * со временем отправки за место в баббле.
 *
 * pending — ждём ответа sendMessage
 * sent — GREEN-API принял (вернулся idMessage)
 * delivered / read — из уведомления outgoingMessageStatus
 */
const LABELS: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  noAccount: 'У получателя нет аккаунта',
};

export function MessageStatusMark({ status }: { status: MessageStatus }) {
  const label = LABELS[status];

  if (status === 'pending') {
    return (
      <span title={label} aria-label={label} className="opacity-70">
        <Clock />
      </span>
    );
  }

  if (status === 'failed' || status === 'noAccount') {
    return (
      <span title={label} aria-label={label} className="text-danger font-semibold">
        !
      </span>
    );
  }

  return (
    <span title={label} aria-label={label}>
      <Ticks double={status === 'delivered' || status === 'read'} />
    </span>
  );
}

function Clock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 3.4V6l1.8 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Ticks({ double }: { double: boolean }) {
  return (
    <svg
      width={double ? 16 : 11}
      height="11"
      viewBox={double ? '0 0 16 11' : '0 0 11 11'}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 6.2 3.4 8.6 8.6 2.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {double && (
        <path
          d="M6.4 6.2 8.8 8.6 14 2.6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
