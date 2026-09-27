import { formatTime } from '@/lib/time';
import { useAppActions } from '@/store/hooks';
import type { Message } from '@/store/models';
import { MessageStatusMark } from './MessageStatusMark';

interface Props {
  message: Message;
  /** Последнее в серии от этого отправителя — рисуем скошенный угол. */
  isLastInSeries: boolean;
}

export function MessageBubble({ message, isLastInSeries }: Props) {
  const { retryMessage } = useAppActions();
  const isOut = message.direction === 'out';

  const corner = isOut
    ? isLastInSeries
      ? 'rounded-br-sm'
      : ''
    : isLastInSeries
      ? 'rounded-bl-sm'
      : '';

  return (
    <div
      className={`max-w-[min(32rem,78%)] rounded-(--radius-bubble) px-3 py-2 ${corner} ${
        isOut
          ? 'bg-bubble-out text-bubble-out-text'
          : 'bg-bubble-in border-divider text-text-primary border'
      } ${message.status === 'failed' ? 'ring-danger ring-1' : ''}`}
    >
      {message.unsupportedType ? (
        <p className={`text-detail italic ${isOut ? 'opacity-80' : 'text-text-secondary'}`}>
          Сообщение типа «{message.unsupportedType}» — поддерживается только текст
        </p>
      ) : (
        <p className="text-body break-words whitespace-pre-wrap">{message.text}</p>
      )}

      <span
        className={`mt-1 flex items-center justify-end gap-1 text-xs ${
          isOut ? 'text-white/90' : 'text-text-tertiary'
        }`}
      >
        <time dateTime={new Date(message.timestamp).toISOString()}>
          {formatTime(message.timestamp)}
        </time>
        {isOut && <MessageStatusMark status={message.status} />}
      </span>

      {isOut && message.status === 'noAccount' && (
        <span className="mt-1 block text-xs text-white/90">
          У получателя нет аккаунта в Telegram с этим номером.
        </span>
      )}

      {isOut && message.status === 'failed' && (
        <span className="mt-1 flex items-center justify-end gap-2 text-xs">
          <span className="text-white/90">{message.error}</span>
          <button
            type="button"
            onClick={() => void retryMessage(message)}
            className="rounded bg-white/20 px-2 py-0.5 font-medium text-white hover:bg-white/30"
          >
            Повторить
          </button>
        </span>
      )}
    </div>
  );
}
