import type { Credentials, InstanceState } from '@/api';
import type { Chat, ConnectionStatus, Message, MessageStatus, SessionStatus } from './models';
import type { PersistedConversations } from './persistence';

export interface SessionState {
  status: SessionStatus;
  credentials: Credentials | null;
  instanceState: InstanceState | null;
  /** Ошибка входа — показывается на экране логина. */
  error: string | null;
  /** Текст текущего шага подключения: проверка состояния, настройка вебхуков. */
  progress: string | null;
}

export interface AppState {
  session: SessionState;
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  connection: ConnectionStatus;
  /** Эта вкладка ведёт опрос уведомлений (очередь одна на инстанс). */
  isPollingTab: boolean;
  /** Открыта хотя бы одна другая вкладка чата. */
  hasOtherTabs: boolean;
  /** Неблокирующая ошибка для тоста. */
  notice: string | null;
}

export const initialState: AppState = {
  session: {
    status: 'anonymous',
    credentials: null,
    instanceState: null,
    error: null,
    progress: null,
  },
  chats: {},
  messages: {},
  activeChatId: null,
  connection: 'idle',
  isPollingTab: false,
  hasOtherTabs: false,
  notice: null,
};

export type Action =
  | { type: 'session/connecting'; credentials: Credentials; progress: string }
  | { type: 'session/progress'; progress: string }
  | { type: 'session/failed'; error: string }
  | {
      type: 'session/ready';
      credentials: Credentials;
      instanceState: InstanceState;
      conversations: PersistedConversations | null;
    }
  | { type: 'session/instanceState'; instanceState: InstanceState }
  | { type: 'session/loggedOut' }
  | { type: 'connection/changed'; status: ConnectionStatus }
  | { type: 'tabs/leadership'; isPollingTab: boolean; hasOtherTabs: boolean }
  | { type: 'chats/created'; chat: Chat }
  | { type: 'chats/opened'; chatId: string }
  | { type: 'chats/closed' }
  | { type: 'chats/historyLoaded'; chatId: string; messages: Message[] }
  | { type: 'messages/queued'; message: Message }
  | { type: 'messages/sent'; chatId: string; tempId: string; idMessage: string }
  | { type: 'messages/sendFailed'; chatId: string; tempId: string; error: string }
  | { type: 'messages/received'; message: Message; senderName?: string }
  | { type: 'messages/statusChanged'; idMessage: string; status: MessageStatus; chatId?: string }
  | { type: 'notice/shown'; text: string }
  | { type: 'notice/dismissed' };

/** Сортировка по времени: порядок прихода уведомлений не гарантирован. */
function sortByTime(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Вставка с дедупликацией по id.
 * Одно и то же сообщение приходит дважды: как ответ sendMessage и как
 * уведомление outgoingAPIMessageReceived. Побеждает уже имеющаяся запись —
 * у неё актуальнее статус доставки.
 */
function upsertMessage(existing: Message[] | undefined, message: Message): Message[] {
  const list = existing ?? [];
  const index = list.findIndex((m) => m.id === message.id);
  if (index === -1) return sortByTime([...list, message]);

  const merged: Message = {
    ...message,
    ...list[index],
    // Текст берём из более свежего источника, если в сохранённой записи он пуст.
    text: list[index].text || message.text,
  };
  const next = [...list];
  next[index] = merged;
  return sortByTime(next);
}

function patchMessage(
  messages: Record<string, Message[]>,
  chatId: string,
  predicate: (m: Message) => boolean,
  patch: (m: Message) => Message,
): Record<string, Message[]> {
  const list = messages[chatId];
  if (!list) return messages;
  let changed = false;
  const next = list.map((m) => {
    if (!predicate(m)) return m;
    changed = true;
    return patch(m);
  });
  return changed ? { ...messages, [chatId]: next } : messages;
}

function touchChat(
  chats: Record<string, Chat>,
  chatId: string,
  patch: Partial<Chat>,
): Record<string, Chat> {
  const existing = chats[chatId];
  if (!existing) return chats;
  return { ...chats, [chatId]: { ...existing, ...patch } };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'session/connecting':
      return {
        ...state,
        session: {
          status: 'connecting',
          credentials: action.credentials,
          instanceState: null,
          error: null,
          progress: action.progress,
        },
      };

    case 'session/progress':
      return { ...state, session: { ...state.session, progress: action.progress } };

    case 'session/failed':
      return {
        ...state,
        session: { ...state.session, status: 'anonymous', error: action.error, progress: null },
        connection: 'idle',
      };

    case 'session/ready':
      return {
        ...state,
        session: {
          status: 'ready',
          credentials: action.credentials,
          instanceState: action.instanceState,
          error: null,
          progress: null,
        },
        chats: action.conversations?.chats ?? state.chats,
        messages: action.conversations?.messages ?? state.messages,
        activeChatId: action.conversations?.activeChatId ?? state.activeChatId,
      };

    case 'session/instanceState':
      return { ...state, session: { ...state.session, instanceState: action.instanceState } };

    case 'session/loggedOut':
      return initialState;

    case 'connection/changed':
      return { ...state, connection: action.status };

    case 'tabs/leadership':
      if (
        state.isPollingTab === action.isPollingTab &&
        state.hasOtherTabs === action.hasOtherTabs
      ) {
        return state;
      }
      return { ...state, isPollingTab: action.isPollingTab, hasOtherTabs: action.hasOtherTabs };

    case 'chats/created': {
      if (state.chats[action.chat.chatId]) {
        // Чат уже есть — просто открываем его, дубликат не создаём.
        return { ...state, activeChatId: action.chat.chatId };
      }
      return {
        ...state,
        chats: { ...state.chats, [action.chat.chatId]: action.chat },
        messages: {
          ...state.messages,
          [action.chat.chatId]: state.messages[action.chat.chatId] ?? [],
        },
        activeChatId: action.chat.chatId,
      };
    }

    case 'chats/opened':
      return {
        ...state,
        activeChatId: action.chatId,
        chats: touchChat(state.chats, action.chatId, { unreadCount: 0 }),
      };

    case 'chats/closed':
      return { ...state, activeChatId: null };

    case 'chats/historyLoaded': {
      let merged = state.messages[action.chatId] ?? [];
      for (const message of action.messages) {
        merged = upsertMessage(merged, message);
      }
      const last = merged.at(-1);
      return {
        ...state,
        messages: { ...state.messages, [action.chatId]: merged },
        chats: touchChat(state.chats, action.chatId, {
          historyLoaded: true,
          ...(last ? { lastMessageAt: last.timestamp } : {}),
        }),
      };
    }

    case 'messages/queued':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.message.chatId]: upsertMessage(
            state.messages[action.message.chatId],
            action.message,
          ),
        },
        chats: touchChat(state.chats, action.message.chatId, {
          lastMessageAt: action.message.timestamp,
        }),
      };

    /** Ответ sendMessage: подменяем временный id на настоящий idMessage. */
    case 'messages/sent':
      return {
        ...state,
        messages: patchMessage(
          state.messages,
          action.chatId,
          (m) => m.id === action.tempId,
          (m) => ({ ...m, id: action.idMessage, status: 'sent', error: undefined }),
        ),
      };

    case 'messages/sendFailed':
      return {
        ...state,
        messages: patchMessage(
          state.messages,
          action.chatId,
          (m) => m.id === action.tempId,
          (m) => ({ ...m, status: 'failed', error: action.error }),
        ),
      };

    case 'messages/received': {
      const { message, senderName } = action;
      const chatId = message.chatId;
      const isIncoming = message.direction === 'in';
      const isActive = state.activeChatId === chatId;

      // Чата может не быть: получатель написал первым либо сообщение
      // отправлено с телефона. Создаём чат на лету.
      const existingChat = state.chats[chatId];
      const chat: Chat = existingChat
        ? {
            ...existingChat,
            name: existingChat.name ?? senderName,
            lastMessageAt: Math.max(existingChat.lastMessageAt, message.timestamp),
            unreadCount:
              isIncoming && !isActive ? existingChat.unreadCount + 1 : existingChat.unreadCount,
          }
        : {
            chatId,
            name: senderName,
            lastMessageAt: message.timestamp,
            unreadCount: isIncoming && !isActive ? 1 : 0,
            historyLoaded: false,
          };

      return {
        ...state,
        chats: { ...state.chats, [chatId]: chat },
        messages: {
          ...state.messages,
          [chatId]: upsertMessage(state.messages[chatId], message),
        },
      };
    }

    case 'messages/statusChanged': {
      // chatId в уведомлении о статусе есть не всегда — тогда ищем по всем чатам.
      const chatIds = action.chatId ? [action.chatId] : Object.keys(state.messages);
      let messages = state.messages;
      for (const chatId of chatIds) {
        messages = patchMessage(
          messages,
          chatId,
          (m) => m.id === action.idMessage && m.direction === 'out',
          (m) => ({ ...m, status: action.status }),
        );
      }
      return messages === state.messages ? state : { ...state, messages };
    }

    case 'notice/shown':
      return { ...state, notice: action.text };

    case 'notice/dismissed':
      return { ...state, notice: null };

    default:
      return state;
  }
}

/** Чаты в порядке последней активности — для списка слева. */
export function selectOrderedChats(state: AppState): Chat[] {
  return Object.values(state.chats).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export function selectActiveMessages(state: AppState): Message[] {
  return state.activeChatId ? (state.messages[state.activeChatId] ?? []) : [];
}

/** Последнее сообщение чата — для превью в списке слева. */
export function selectLastMessage(state: AppState, chatId: string): Message | undefined {
  return state.messages[chatId]?.at(-1);
}

export function selectTotalUnread(state: AppState): number {
  return Object.values(state.chats).reduce((sum, chat) => sum + chat.unreadCount, 0);
}
