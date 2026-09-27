import { Avatar } from '@/components/Avatar';
import { chatDisplayName, chatIdToPhone } from '@/lib/chatId';
import { formatPhone } from '@/lib/phone';
import type { Chat } from '@/store/models';

interface Props {
  chat: Chat;
  /** Кнопка «назад» нужна только в мобильной раскладке, где панель одна. */
  onBack: () => void;
}

export function ChatHeader({ chat, onBack }: Props) {
  const title = chatDisplayName(chat.chatId, chat.name);
  const phone = chat.phone ?? chatIdToPhone(chat.chatId);
  // Не дублируем номер во второй строке, если он и есть заголовок.
  const subtitle = phone && title !== formatPhone(phone) ? formatPhone(phone) : 'Telegram';

  return (
    <header className="border-divider bg-panel flex items-center gap-3 border-b px-3 py-2.5">
      <button
        type="button"
        onClick={onBack}
        className="text-text-secondary hover:bg-panel-hover -ml-1 grid size-9 place-items-center rounded-full md:hidden"
        aria-label="Назад к списку чатов"
      >
        <span aria-hidden="true">←</span>
      </button>

      <Avatar seed={chat.chatId} label={chat.name ?? chat.chatId} size="sm" />

      <div className="min-w-0">
        <h2 className="text-title truncate font-medium">{title}</h2>
        <p className="text-text-secondary truncate text-xs">{subtitle}</p>
      </div>
    </header>
  );
}
