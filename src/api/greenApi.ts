import { buildUrl, redactUrl, type ApiMethod } from './endpoints';
import { GreenApiError, kindFromStatus } from './errors';
import type {
  ChatHistoryItem,
  ChatHistoryPayload,
  Credentials,
  InstanceSettings,
  NotificationEnvelope,
  SendMessagePayload,
  SendMessageResponse,
  SetSettingsResponse,
  StateInstanceResponse,
} from './types';

/** Обычные запросы. receiveNotification держит соединение дольше — см. LONG_POLL_TIMEOUT_MS. */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * receiveNotification — long polling: GREEN-API держит соединение до ~20 с,
 * ожидая появления уведомления. Берём запас, чтобы не рвать соединение самим.
 */
const LONG_POLL_TIMEOUT_MS = 35_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** Доп. сегменты пути после токена (например, receiptId). */
  segments?: (string | number)[];
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface GreenApiClient {
  readonly credentials: Credentials;
  getStateInstance(signal?: AbortSignal): Promise<StateInstanceResponse>;
  getSettings(signal?: AbortSignal): Promise<InstanceSettings>;
  setSettings(
    settings: Partial<InstanceSettings>,
    signal?: AbortSignal,
  ): Promise<SetSettingsResponse>;
  sendMessage(payload: SendMessagePayload, signal?: AbortSignal): Promise<SendMessageResponse>;
  receiveNotification(signal?: AbortSignal): Promise<NotificationEnvelope | null>;
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<void>;
  getChatHistory(payload: ChatHistoryPayload, signal?: AbortSignal): Promise<ChatHistoryItem[]>;
}

export function createGreenApiClient(credentials: Credentials): GreenApiClient {
  async function request<T>(method: ApiMethod, options: RequestOptions = {}): Promise<T> {
    const {
      method: httpMethod = 'GET',
      body,
      segments = [],
      signal,
      timeoutMs = DEFAULT_TIMEOUT_MS,
    } = options;

    const url = buildUrl(credentials, method, segments);

    // Таймаут и внешняя отмена объединяются: сработавший первым прерывает запрос.
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    let response: Response;
    try {
      response = await fetch(url, {
        method: httpMethod,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: combined,
      });
    } catch (cause) {
      // Отличаем нашу отмену от таймаута: у внешнего signal есть aborted.
      if (signal?.aborted) {
        throw new GreenApiError({ kind: 'aborted', method, message: 'Запрос отменён', cause });
      }
      if (timeoutSignal.aborted) {
        throw new GreenApiError({
          kind: 'timeout',
          method,
          message: `Таймаут ${timeoutMs} мс: ${method}`,
          cause,
        });
      }
      // fetch падает с TypeError и на сетевых сбоях, и на CORS — различить их нельзя.
      throw new GreenApiError({
        kind: 'network',
        method,
        message: `Сетевая ошибка при вызове ${method}`,
        cause,
      });
    }

    const raw = await response.text();

    if (!response.ok) {
      throw new GreenApiError({
        kind: kindFromStatus(response.status),
        method,
        status: response.status,
        body: raw,
        message: `${method} → HTTP ${response.status}: ${raw.slice(0, 200)}`,
      });
    }

    // receiveNotification при пустой очереди отдаёт пустое тело или null.
    if (!raw || raw === 'null') return null as T;

    try {
      return JSON.parse(raw) as T;
    } catch (cause) {
      throw new GreenApiError({
        kind: 'unknown',
        method,
        body: raw,
        message: `Не удалось разобрать ответ ${method}: ${redactUrl(url, credentials)}`,
        cause,
      });
    }
  }

  return {
    credentials,

    getStateInstance: (signal) => request<StateInstanceResponse>('getStateInstance', { signal }),

    getSettings: (signal) => request<InstanceSettings>('getSettings', { signal }),

    setSettings: (settings, signal) =>
      request<SetSettingsResponse>('setSettings', {
        method: 'POST',
        body: settings,
        signal,
      }),

    sendMessage: (payload, signal) =>
      request<SendMessageResponse>('sendMessage', {
        method: 'POST',
        body: payload,
        signal,
      }),

    receiveNotification: (signal) =>
      request<NotificationEnvelope | null>('receiveNotification', {
        signal,
        timeoutMs: LONG_POLL_TIMEOUT_MS,
      }),

    /**
     * Подтверждение обработки. Без этого вызова уведомление остаётся в очереди
     * и receiveNotification будет бесконечно возвращать одно и то же сообщение.
     */
    deleteNotification: async (receiptId, signal) => {
      await request<unknown>('deleteNotification', {
        method: 'DELETE',
        segments: [receiptId],
        signal,
      });
    },

    getChatHistory: async (payload, signal) => {
      const result = await request<ChatHistoryItem[] | null>('getChatHistory', {
        method: 'POST',
        body: { count: 50, ...payload },
        signal,
      });
      return result ?? [];
    },
  };
}
