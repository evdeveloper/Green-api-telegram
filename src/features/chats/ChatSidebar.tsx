import { useMemo, useState } from 'react';
import { chatDisplayName } from '@/lib/chatId';
import { useAppActions, useAppState } from '@/store/hooks';
import { selectLastMessage, selectOrderedChats } from '@/store/reducer';
import { ChatListItem } from './ChatListItem';
import { ConnectionIndicator } from './ConnectionIndicator';
import { NewChatDialog } from './NewChatDialog';

/** Левая панель: поиск по чатам, список, кнопка нового чата, выход. */
export function ChatSidebar() {
  const state = useAppState();
  const { openChat, logout } = useAppActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');

  const chats = useMemo(() => {
    const ordered = selectOrderedChats(state);
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    // Ищем и по имени, и по номеру: пользователь помнит либо одно, либо другое.
    return ordered.filter((chat) =>
      chatDisplayName(chat.chatId, chat.name).toLowerCase().includes(needle),
    );
  }, [state, query]);

  return (
    <div className="bg-panel flex h-full min-h-0 flex-col">
      <header className="border-divider border-b px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-title font-semibold">Чаты</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="btn-accent flex items-center gap-1.5 px-3 py-2"
            >
              <span aria-hidden="true" className="text-base leading-none">
                +
              </span>
              Новый
            </button>
          </div>
        </div>

        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          aria-label="Поиск по чатам"
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {chats.length === 0 ? (
          <p className="text-text-secondary text-detail px-4 py-8 text-center">
            {state.chats && Object.keys(state.chats).length > 0
              ? 'Ничего не найдено.'
              : 'Чатов пока нет. Нажмите «Новый», чтобы написать первому получателю.'}
          </p>
        ) : (
          <ul>
            {chats.map((chat) => (
              <ChatListItem
                key={chat.chatId}
                chat={chat}
                lastMessage={selectLastMessage(state, chat.chatId)}
                isActive={chat.chatId === state.activeChatId}
                onSelect={() => openChat(chat.chatId)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-divider flex items-center justify-between gap-2 border-t px-3 py-2.5">
        <ConnectionIndicator />
        <button
          type="button"
          onClick={logout}
          className="text-text-secondary hover:text-text-primary text-detail"
        >
          Выйти
        </button>
      </footer>

      {dialogOpen && <NewChatDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
