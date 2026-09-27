import type { Credentials } from '@/api';
import type { Chat, Message } from './models';

/**
 * Персист в localStorage.
 *
 * Зачем: GREEN-API не отдаёт список чатов — историю можно получить только
 * по уже известному chatId. Без локального сохранения при перезагрузке
 * страницы пользователь теряет все свои чаты.
 *
 * Каждое обращение обёрнуто в try/catch: в приватном режиме и при
 * запрете на site data доступ к localStorage бросает исключение.
 */

const CREDENTIALS_KEY = 'greenapi.credentials.v1';
const CONVERSATIONS_KEY = 'greenapi.conversations.v1';

/** Сколько сообщений на чат храним локально. Дальше — getChatHistory. */
const MAX_PERSISTED_MESSAGES = 200;

export interface PersistedConversations {
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
  activeChatId: string | null;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Переполнение квоты или запрет на storage — работаем без персиста.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Игнорируем: удалять нечего или storage недоступен.
  }
}

/**
 * ВНИМАНИЕ: apiTokenInstance хранится в localStorage в открытом виде.
 * Это осознанное упрощение для тестового задания — так пользователь не вводит
 * креды при каждой перезагрузке. В продакшене токен не должен покидать бэкенд:
 * браузер обращался бы к своему серверу, а тот — к GREEN-API.
 */
export function loadCredentials(): Credentials | null {
  const stored = readJson<Partial<Credentials>>(CREDENTIALS_KEY);
  if (!stored?.idInstance || !stored?.apiTokenInstance) return null;
  return { idInstance: stored.idInstance, apiTokenInstance: stored.apiTokenInstance };
}

export function saveCredentials(credentials: Credentials): void {
  writeJson(CREDENTIALS_KEY, credentials);
}

export function clearCredentials(): void {
  remove(CREDENTIALS_KEY);
}

export function loadConversations(): PersistedConversations | null {
  const stored = readJson<PersistedConversations>(CONVERSATIONS_KEY);
  if (!stored || typeof stored.chats !== 'object' || typeof stored.messages !== 'object') {
    return null;
  }
  return {
    chats: stored.chats ?? {},
    messages: stored.messages ?? {},
    activeChatId: stored.activeChatId ?? null,
  };
}

export function saveConversations(data: PersistedConversations): void {
  const trimmed: Record<string, Message[]> = {};
  for (const [chatId, messages] of Object.entries(data.messages)) {
    trimmed[chatId] = messages.slice(-MAX_PERSISTED_MESSAGES);
  }
  writeJson(CONVERSATIONS_KEY, { ...data, messages: trimmed });
}

export function clearConversations(): void {
  remove(CONVERSATIONS_KEY);
}
