import type { Credentials } from './types';

/**
 * Сборка URL запроса к GREEN-API.
 *
 * Схема (v3): {apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}
 * Путь waInstance един для всех мессенджеров платформы — Telegram в том числе.
 * https://green-api.com/v3/docs/api/sending/SendMessage/
 */

const INSTANCE_PREFIX = 'waInstance';

/** При VITE_USE_PROXY=true запросы идут через dev-прокси Vite (см. vite.config.ts). */
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

const DIRECT_BASE = (import.meta.env.VITE_GREEN_API_URL ?? 'https://api.green-api.com').replace(
  /\/+$/,
  '',
);

export const API_BASE = USE_PROXY ? '/green-api' : DIRECT_BASE;

export type ApiMethod =
  | 'getStateInstance'
  | 'getSettings'
  | 'setSettings'
  | 'sendMessage'
  | 'receiveNotification'
  | 'deleteNotification'
  | 'getChatHistory'
  | 'checkWhatsapp'
  | 'logout';

export function buildUrl(
  credentials: Credentials,
  method: ApiMethod,
  segments: (string | number)[] = [],
): string {
  const { idInstance, apiTokenInstance } = credentials;
  const tail = segments.length ? `/${segments.map(encodeURIComponent).join('/')}` : '';
  return `${API_BASE}/${INSTANCE_PREFIX}${encodeURIComponent(idInstance)}/${method}/${encodeURIComponent(apiTokenInstance)}${tail}`;
}

/**
 * Скрывает apiTokenInstance в строке URL — для безопасного логирования.
 * Токен не должен попадать в консоль, скриншоты и баг-репорты.
 */
export function redactUrl(url: string, credentials: Credentials): string {
  if (!credentials.apiTokenInstance) return url;
  return url.replaceAll(credentials.apiTokenInstance, '***');
}
