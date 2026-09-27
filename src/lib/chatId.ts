import { normalizePhone } from './phone';

/**
 * chatId в GREEN-API v3 для приватного чата принимает две формы:
 *   - числовой идентификатор пользователя мессенджера: "10000000"
 *   - номер телефона с суффиксом: "79991234567@c.us"
 * Групповые чаты начинаются с минуса: "-10000000000000" (в задании не нужны).
 * https://green-api.com/v3/docs/api/sending/SendMessage/
 */

const PRIVATE_SUFFIX = '@c.us';

/** Номер телефона → chatId. */
export function phoneToChatId(phone: string): string {
  return `${normalizePhone(phone)}${PRIVATE_SUFFIX}`;
}

/** chatId → номер телефона (пустая строка, если chatId числовой, без номера). */
export function chatIdToPhone(chatId: string): string {
  const [head] = chatId.split('@');
  return /^\d+$/.test(head) && chatId.includes('@') ? head : '';
}

export function isGroupChat(chatId: string): boolean {
  return chatId.startsWith('-') || chatId.includes('@g.us');
}

/** Заголовок чата: имя от GREEN-API, иначе отформатированный номер, иначе сам chatId. */
export function chatDisplayName(chatId: string, chatName?: string): string {
  if (chatName?.trim()) return chatName.trim();
  const phone = chatIdToPhone(chatId);
  return phone ? `+${phone}` : chatId;
}
