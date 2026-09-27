import { useEffect, useRef, useState, type FormEvent } from 'react';
import { phoneToChatId } from '@/lib/chatId';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { useAppActions, useAppState } from '@/store/hooks';

/**
 * Создание чата по номеру телефона.
 * Номер нормализуется (8… → 7…, отбрасывается всё, кроме цифр) и переводится
 * в chatId вида 79991234567@c.us. Существующий чат не дублируется — открывается.
 */
export function NewChatDialog({ onClose }: { onClose: () => void }) {
  const { chats } = useAppState();
  const { createChat, openChat } = useAppActions();

  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Запоминаем, откуда пришёл фокус, чтобы вернуть его при закрытии:
    // иначе после Esc фокус улетает в начало документа.
    const returnTo = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => returnTo?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Esc закрывает диалог — ожидаемое поведение модального окна.
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Удерживаем фокус внутри диалога: без этого Tab уводит на фоновый
      // интерфейс, который для пользователя сейчас недоступен.
      if (event.key !== 'Tab' || !formRef.current) return;

      const focusable = formRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const valid = isValidPhone(phone);
  const existing = valid ? chats[phoneToChatId(phone)] : undefined;
  const error =
    touched && phone !== '' && !valid ? 'Введите номер в формате +7 999 123-45-67' : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid || busy) return;

    if (existing) {
      openChat(existing.chatId);
      onClose();
      return;
    }

    setBusy(true);
    try {
      await createChat(phone);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        className="bg-panel w-full max-w-sm rounded-(--radius-panel) p-5 shadow-xl"
      >
        <h2 id="new-chat-title" className="text-title font-semibold">
          Новый чат
        </h2>
        <p className="text-text-secondary text-detail mt-1 mb-4">
          Введите номер телефона получателя в Telegram.
        </p>

        <label className="grid gap-1.5" htmlFor="new-chat-phone">
          <span className="text-text-secondary text-detail">Номер телефона</span>
          <input
            id="new-chat-phone"
            ref={inputRef}
            className="input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="+7 999 123-45-67"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={error !== null}
            aria-describedby="new-chat-hint"
          />
        </label>

        <p id="new-chat-hint" className="text-text-tertiary mt-2 min-h-8 text-xs">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : valid ? (
            <>
              {formatPhone(phone)} · chatId <code>{normalizePhone(phone)}@c.us</code>
              {existing && (
                <span className="text-text-secondary block">Такой чат уже есть — откроем его.</span>
              )}
            </>
          ) : (
            'Код страны можно вводить как +7 или 8.'
          )}
        </p>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:bg-panel-hover rounded-(--radius-control) px-4 py-2.5 text-detail"
          >
            Отмена
          </button>
          <button type="submit" disabled={!valid || busy} className="btn-accent">
            {busy ? 'Создаём…' : existing ? 'Открыть' : 'Создать чат'}
          </button>
        </div>
      </form>
    </div>
  );
}
