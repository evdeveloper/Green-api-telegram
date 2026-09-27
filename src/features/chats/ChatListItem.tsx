import { Avatar } from '@/components/Avatar';
import { chatDisplayName } from '@/lib/chatId';
import { formatChatListTime } from '@/lib/time';
import type { Chat, Message } from '@/store/models';

/** Текст превью: для нетекстовых сообщений — тип, для исходящих — с префиксом «Вы:». */
function preview(message: Message | undefined): string {
  if (!message) return 'Нет сообщений';
  const body = message.unsupportedType ? 'Вложение' : message.text;
  return message.direction === 'out' ? `Вы: ${body}` : body;
}

interface Props {
  chat: Chat;
  lastMessage: Message | undefined;
  isActive: boolean;
  onSelect: () => void;
}

export function ChatListItem({ chat, lastMessage, isActive, onSelect }: Props) {
  const title = chatDisplayName(chat.chatId, chat.name);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          isActive ? 'bg-panel-active' : 'hover:bg-panel-hover'
        }`}
      >
        <Avatar seed={chat.chatId} label={chat.name ?? chat.chatId} />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-title min-w-0 flex-1 truncate font-medium">{title}</span>
            <span className="text-text-tertiary shrink-0 text-xs">
              {formatChatListTime(chat.lastMessageAt)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="text-text-secondary text-detail min-w-0 flex-1 truncate">
              {preview(lastMessage)}
            </span>
            {chat.unreadCount > 0 && (
              <span
                className="bg-badge grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-medium text-white"
                aria-label={`Непрочитанных: ${chat.unreadCount}`}
              >
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
