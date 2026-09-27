/**
 * Типы GREEN-API v3.
 * Источники:
 *  - https://green-api.com/v3/docs/api/sending/SendMessage/
 *  - https://green-api.com/v3/docs/api/receiving/technology-http-api/
 *  - https://green-api.com/v3/docs/api/receiving/notifications-format/
 */

export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
}

/* ------------------------------------------------------------------ */
/* Состояние и настройки инстанса                                      */
/* ------------------------------------------------------------------ */

export type InstanceState =
  'authorized' | 'notAuthorized' | 'blocked' | 'sleepMode' | 'starting' | 'yellowCard';

export interface StateInstanceResponse {
  stateInstance: InstanceState;
}

export type YesNo = 'yes' | 'no';

/** Полезное подмножество настроек инстанса. */
export interface InstanceSettings {
  webhookUrl: string;
  webhookUrlToken?: string;
  incomingWebhook: YesNo;
  outgoingWebhook: YesNo;
  outgoingAPIMessageWebhook?: YesNo;
  outgoingMessageWebhook?: YesNo;
  stateWebhook: YesNo;
  markIncomingMessagesReaded?: YesNo;
}

export interface SetSettingsResponse {
  saveSettings: boolean;
}

/* ------------------------------------------------------------------ */
/* Отправка                                                            */
/* ------------------------------------------------------------------ */

export interface SendMessagePayload {
  chatId: string;
  message: string;
  quotedMessageId?: string;
  /** 1000–20000 мс, имитация набора текста. */
  typingTime?: number;
}

export interface SendMessageResponse {
  idMessage: string;
}

/** Ограничение GREEN-API на длину текстового сообщения. */
export const MAX_MESSAGE_LENGTH = 4000;

/* ------------------------------------------------------------------ */
/* Уведомления (входящие/исходящие)                                    */
/* ------------------------------------------------------------------ */

export interface InstanceData {
  idInstance: number;
  wid: string;
  typeInstance: string;
}

export interface SenderData {
  chatId: string;
  chatName?: string;
  chatType?: string;
  sender: string;
  senderName?: string;
  senderType?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

export interface TextMessageData {
  textMessage: string;
  isForwarded?: boolean;
  forwardingScore?: number;
}

export interface ExtendedTextMessageData {
  text: string;
  description?: string;
  title?: string;
}

/**
 * messageData различается по typeMessage, но набор типов у GREEN-API широкий
 * (image/video/document/location/poll/...), и он расширяется. По ТЗ нужен только
 * текст, поэтому текстовые полезные нагрузки описаны опциональными полями,
 * а всё остальное отбрасывается в extractText.
 */
export interface MessageData {
  typeMessage: string;
  textMessageData?: TextMessageData;
  extendedTextMessageData?: ExtendedTextMessageData;
}

interface WebhookBase {
  instanceData: InstanceData;
  timestamp: number;
}

export interface IncomingMessageReceived extends WebhookBase {
  typeWebhook: 'incomingMessageReceived';
  idMessage: string;
  senderData: SenderData;
  messageData: MessageData;
}

/** Сообщение, отправленное с телефона в обход API. */
export interface OutgoingMessageReceived extends WebhookBase {
  typeWebhook: 'outgoingMessageReceived';
  idMessage: string;
  senderData: SenderData;
  messageData: MessageData;
}

/** Эхо сообщения, отправленного нами через sendMessage. */
export interface OutgoingAPIMessageReceived extends WebhookBase {
  typeWebhook: 'outgoingAPIMessageReceived';
  idMessage: string;
  senderData: SenderData;
  messageData: MessageData;
}

export type SendStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount' | 'pending';

export interface OutgoingMessageStatus extends WebhookBase {
  typeWebhook: 'outgoingMessageStatus';
  chatId?: string;
  idMessage: string;
  status: SendStatus;
  sendByApi?: boolean;
  description?: string;
}

export interface StateInstanceChanged extends WebhookBase {
  typeWebhook: 'stateInstanceChanged';
  stateInstance: InstanceState;
}

export interface UnknownWebhook extends WebhookBase {
  typeWebhook: string;
  [key: string]: unknown;
}

export type Notification =
  | IncomingMessageReceived
  | OutgoingMessageReceived
  | OutgoingAPIMessageReceived
  | OutgoingMessageStatus
  | StateInstanceChanged
  | UnknownWebhook;

/** Ответ receiveNotification: либо конверт с receiptId, либо null (очередь пуста). */
export interface NotificationEnvelope {
  receiptId: number;
  body: Notification;
}

/* ------------------------------------------------------------------ */
/* История чата                                                        */
/* ------------------------------------------------------------------ */

export interface ChatHistoryPayload {
  chatId: string;
  count?: number;
}

export interface ChatHistoryItem {
  type: 'incoming' | 'outgoing';
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  chatId: string;
  textMessage?: string;
  extendedTextMessage?: ExtendedTextMessageData;
  statusMessage?: SendStatus;
  sendByApi?: boolean;
}

/* ------------------------------------------------------------------ */
/* Сужающие предикаты                                                  */
/* ------------------------------------------------------------------ */

export function isIncomingMessage(n: Notification): n is IncomingMessageReceived {
  return n.typeWebhook === 'incomingMessageReceived';
}

export function isOutgoingMessage(
  n: Notification,
): n is OutgoingMessageReceived | OutgoingAPIMessageReceived {
  return (
    n.typeWebhook === 'outgoingMessageReceived' || n.typeWebhook === 'outgoingAPIMessageReceived'
  );
}

export function isOutgoingStatus(n: Notification): n is OutgoingMessageStatus {
  return n.typeWebhook === 'outgoingMessageStatus';
}

export function isStateChanged(n: Notification): n is StateInstanceChanged {
  return n.typeWebhook === 'stateInstanceChanged';
}

/** Достаёт текст из messageData, если сообщение текстовое. Иначе null. */
export function extractText(messageData: MessageData): string | null {
  if (messageData.typeMessage === 'textMessage') {
    return messageData.textMessageData?.textMessage ?? null;
  }
  if (messageData.typeMessage === 'extendedTextMessage') {
    return messageData.extendedTextMessageData?.text ?? null;
  }
  return null;
}
