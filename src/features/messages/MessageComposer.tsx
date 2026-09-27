import { useLayoutEffect, useRef, useState } from 'react';
import { MAX_MESSAGE_LENGTH } from '@/api';
import { useAppActions } from '@/store/hooks';

/** Максимальная высота поля ввода до появления прокрутки. */
const MAX_TEXTAREA_HEIGHT_PX = 160;

/** За сколько символов до лимита показываем счётчик. */
const COUNTER_THRESHOLD = 200;

export function MessageComposer({ chatId }: { chatId: string }) {
  const { sendMessage } = useAppActions();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Авторост: высота по содержимому, но не выше предела.
  useLayoutEffect(() => {
    const node = textarea.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [text]);

  // При переключении чата черновик не переносим в другую переписку.
  useLayoutEffect(() => {
    setText('');
  }, [chatId]);

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !sending;
  const remaining = MAX_MESSAGE_LENGTH - trimmed.length;

  async function submit() {
    if (!canSend) return;
    // Поле очищаем сразу: сообщение уже видно в переписке как отправляющееся,
    // а при ошибке его можно повторить прямо из баббла.
    setText('');
    setSending(true);
    try {
      await sendMessage(chatId, trimmed);
    } finally {
      setSending(false);
      textarea.current?.focus();
    }
  }

  return (
    <div className="border-divider bg-panel border-t px-3 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textarea}
          className="input max-h-40 flex-1 resize-none"
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter отправляет, Shift+Enter переносит строку.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Напишите сообщение"
          aria-label="Текст сообщения"
          aria-describedby={remaining <= COUNTER_THRESHOLD ? 'composer-counter' : undefined}
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSend}
          className="btn-accent grid size-11 shrink-0 place-items-center rounded-full p-0"
          aria-label="Отправить сообщение"
        >
          <SendIcon />
        </button>
      </div>

      {remaining <= COUNTER_THRESHOLD && (
        <p
          id="composer-counter"
          className={`mt-1.5 text-right text-xs ${tooLong ? 'text-danger' : 'text-text-tertiary'}`}
        >
          {tooLong
            ? `Превышен лимит на ${-remaining} симв. (максимум ${MAX_MESSAGE_LENGTH})`
            : `Осталось ${remaining} симв.`}
        </p>
      )}
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2 9 15.5 2.5 9.5 16 8 10.5 2 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
