/** Доменные модели интерфейса — уже не «сырые» ответы GREEN-API. */

export type MessageDirection = 'in' | 'out';

export type MessageStatus =
  /** Оптимистично показано, ответ sendMessage ещё не получен. */
  | 'pending'
  /** GREEN-API принял сообщение (вернулся idMessage). */
  | 'sent'
  | 'delivered'
  | 'read'
  /** Отправка не удалась — показываем кнопку «Повторить». */
  | 'failed'
  /** У получателя нет аккаунта в мессенджере. */
  | 'noAccount';

export interface Message {
  /** idMessage от GREEN-API либо временный локальный id до ответа sendMessage. */
  id: string;
  chatId: string;
  direction: MessageDirection;
  text: string;
  /** Миллисекунды (GREEN-API отдаёт секунды — переводим на границе). */
  timestamp: number;
  status: MessageStatus;
  /** Заполнено для нетекстовых сообщений: показываем плейсхолдер вместо текста. */
  unsupportedType?: string;
  /** Текст ошибки отправки — для подсказки у сообщения со статусом failed. */
  error?: string;
}

export interface Chat {
  chatId: string;
  /** Имя из GREEN-API, если пришло в senderData. */
  name?: string;
  /** Номер телефона, если чат создан по номеру. */
  phone?: string;
  lastMessageAt: number;
  unreadCount: number;
  /** История через getChatHistory уже запрашивалась. */
  historyLoaded: boolean;
}

export type ConnectionStatus =
  /** Опроса нет: пользователь не вошёл. */
  | 'idle'
  /** Long polling работает. */
  | 'online'
  /** Запрос упал, ждём следующей попытки. */
  | 'reconnecting';

export type SessionStatus = 'anonymous' | 'connecting' | 'ready';
