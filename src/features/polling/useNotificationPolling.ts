import { useEffect, useRef } from 'react';
import { GreenApiError, type GreenApiClient, type Notification } from '@/api';
import type { ConnectionStatus } from '@/store/models';

/**
 * Приём сообщений через HTTP API (long polling).
 * https://green-api.com/v3/docs/api/receiving/technology-http-api/
 *
 * Цикл строго последовательный:
 *   receiveNotification  — GREEN-API держит соединение до ~20 с, ожидая уведомление
 *   обработка            — отдаём наверх
 *   deleteNotification   — ОБЯЗАТЕЛЬНО, иначе уведомление остаётся в очереди
 *                          и следующий receiveNotification вернёт то же самое
 *
 * Поэтому здесь while-цикл, а не setInterval: интервал накладывал бы запросы
 * друг на друга и ломал порядок подтверждений.
 *
 * Опрос сознательно НЕ останавливается при document.hidden: основной сценарий
 * ТЗ — пользователь уходит в Telegram отвечать (вкладка уходит в фон) и
 * возвращается. Пауза в фоне означала бы, что ответ появляется только после
 * возврата, а не в момент прихода.
 */

/** Задержки перед повторной попыткой после сетевой ошибки, мс. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 15_000];

interface Options {
  client: GreenApiClient | null;
  enabled: boolean;
  onNotification: (notification: Notification) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  /** Невосстановимая ошибка (неверные креды) — сессию нужно завершить. */
  onFatal: (error: GreenApiError) => void;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function useNotificationPolling({
  client,
  enabled,
  onNotification,
  onStatusChange,
  onFatal,
}: Options): void {
  // Колбэки держим в ref: иначе каждый рендер пересоздавал бы цикл опроса.
  const handlers = useRef({ onNotification, onStatusChange, onFatal });
  handlers.current = { onNotification, onStatusChange, onFatal };

  useEffect(() => {
    if (!client || !enabled) return;

    const controller = new AbortController();
    const { signal } = controller;
    let failures = 0;

    async function loop(): Promise<void> {
      // client проверен выше, но внутри замыкания TS об этом не знает.
      const api = client!;

      while (!signal.aborted) {
        try {
          const envelope = await api.receiveNotification(signal);
          if (signal.aborted) return;

          failures = 0;
          handlers.current.onStatusChange('online');

          if (!envelope) continue; // Очередь пуста — сразу следующий запрос.

          try {
            handlers.current.onNotification(envelope.body);
          } finally {
            // Подтверждаем даже при падении обработчика: иначе очередь встанет
            // на этом уведомлении и приём сообщений остановится полностью.
            await api.deleteNotification(envelope.receiptId).catch(() => {
              // Не удалось подтвердить — уведомление придёт снова,
              // дедупликация по idMessage не даст его продублировать в UI.
            });
          }
        } catch (error) {
          if (signal.aborted) return;

          if (error instanceof GreenApiError) {
            if (error.kind === 'aborted') return;
            if (error.isFatalForSession) {
              handlers.current.onFatal(error);
              return;
            }
          }

          handlers.current.onStatusChange('reconnecting');
          const wait = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)];
          failures += 1;
          await delay(wait, signal);
        }
      }
    }

    void loop();

    return () => controller.abort();
  }, [client, enabled]);

  // Останавливаем индикатор соединения, когда опрос выключен.
  useEffect(() => {
    if (!enabled) onStatusChange('idle');
    // onStatusChange стабилен у провайдера; в зависимости его не добавляем,
    // чтобы не дёргать состояние на каждый рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
