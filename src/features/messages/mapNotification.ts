import {
  extractText,
  isIncomingMessage,
  isOutgoingMessage,
  isOutgoingStatus,
  isStateChanged,
  type ChatHistoryItem,
  type InstanceState,
  type Notification,
} from '@/api';
import { toMillis } from '@/lib/time';
import type { Message, MessageStatus } from '@/store/models';

/**
 * Перевод уведомлений GREEN-API в доменные события.
 * Здесь же отсекаются все типы сообщений, кроме текстовых (требование ТЗ):
 * они не игнорируются молча, а превращаются в плейсхолдер, иначе в переписке
 * появлялись бы необъяснимые «дырки».
 */

export type MappedEvent =
  | { kind: 'message'; message: Message; senderName?: string }
  | { kind: 'status'; idMessage: string; status: MessageStatus; chatId?: string }
  | { kind: 'instanceState'; state: InstanceState }
  /** Уведомление нам неинтересно, но подтвердить его всё равно нужно. */
  | { kind: 'ignored'; typeWebhook: string };

/** Статусы GREEN-API → статусы UI. 'pending' от API не приходит. */
function mapStatus(status: string): MessageStatus {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
    case 'failed':
    case 'noAccount':
      return status;
    default:
      return 'sent';
  }
}

export function mapNotification(notification: Notification): MappedEvent {
  if (isIncomingMessage(notification) || isOutgoingMessage(notification)) {
    const direction = isIncomingMessage(notification) ? 'in' : 'out';
    const text = extractText(notification.messageData);
    const typeMessage = notification.messageData.typeMessage;

    const message: Message = {
      id: notification.idMessage,
      chatId: notification.senderData.chatId,
      direction,
      text: text ?? '',
      timestamp: toMillis(notification.timestamp),
      // Исходящие из уведомления уже доставлены до GREEN-API.
      status: direction === 'out' ? 'sent' : 'delivered',
      ...(text === null ? { unsupportedType: typeMessage } : {}),
    };

    return {
      kind: 'message',
      message,
      senderName: notification.senderData.senderName ?? notification.senderData.chatName,
    };
  }

  if (isOutgoingStatus(notification)) {
    return {
      kind: 'status',
      idMessage: notification.idMessage,
      status: mapStatus(notification.status),
      chatId: notification.chatId,
    };
  }

  if (isStateChanged(notification)) {
    return { kind: 'instanceState', state: notification.stateInstance };
  }

  return { kind: 'ignored', typeWebhook: notification.typeWebhook };
}

/** Элемент истории чата → сообщение. Тот же отбор по типу, что и для уведомлений. */
export function mapHistoryItem(item: ChatHistoryItem): Message {
  const text = item.textMessage ?? item.extendedTextMessage?.text ?? null;
  const isText = item.typeMessage === 'textMessage' || item.typeMessage === 'extendedTextMessage';

  return {
    id: item.idMessage,
    chatId: item.chatId,
    direction: item.type === 'incoming' ? 'in' : 'out',
    text: text ?? '',
    timestamp: toMillis(item.timestamp),
    status: item.type === 'outgoing' ? mapStatus(item.statusMessage ?? 'sent') : 'delivered',
    ...(isText && text !== null ? {} : { unsupportedType: item.typeMessage }),
  };
}
