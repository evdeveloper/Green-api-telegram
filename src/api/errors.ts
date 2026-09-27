/** Классифицированная ошибка GREEN-API — на её основе UI выбирает сообщение. */
export type GreenApiErrorKind =
  | 'unauthorized' // 401/403 — неверные idInstance/apiTokenInstance
  | 'notFound' // 404 — неверный метод или инстанс не существует
  | 'rateLimited' // 429 — слишком частые запросы
  | 'quotaExceeded' // 466 — превышен лимит очереди/тарифа
  | 'badRequest' // 400 — некорректные параметры (например, chatId)
  | 'server' // 5xx
  | 'network' // сеть недоступна / CORS / DNS
  | 'timeout' // превышен таймаут запроса
  | 'aborted' // запрос отменён нами (unmount, выход)
  | 'unknown';

export class GreenApiError extends Error {
  readonly kind: GreenApiErrorKind;
  readonly status?: number;
  readonly method: string;
  readonly body?: unknown;

  constructor(params: {
    kind: GreenApiErrorKind;
    method: string;
    message: string;
    status?: number;
    body?: unknown;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'GreenApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.method = params.method;
    this.body = params.body;
  }

  /** Ошибки, при которых имеет смысл повторить запрос. */
  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'server' ||
      this.kind === 'rateLimited'
    );
  }

  /** Ошибки, требующие вернуть пользователя на экран входа. */
  get isFatalForSession(): boolean {
    return this.kind === 'unauthorized';
  }
}

export function kindFromStatus(status: number): GreenApiErrorKind {
  if (status === 400) return 'badRequest';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'notFound';
  if (status === 429) return 'rateLimited';
  if (status === 466) return 'quotaExceeded';
  if (status >= 500) return 'server';
  return 'unknown';
}

const MESSAGES: Record<GreenApiErrorKind, string> = {
  unauthorized: 'Неверные idInstance или apiTokenInstance.',
  notFound: 'Инстанс не найден. Проверьте idInstance.',
  rateLimited: 'Слишком много запросов к GREEN-API. Повторяем через секунду.',
  quotaExceeded: 'Превышен лимит сообщений на тарифе GREEN-API.',
  badRequest: 'GREEN-API отклонил запрос: проверьте номер получателя и текст сообщения.',
  server: 'GREEN-API временно недоступен.',
  network: 'Нет связи с GREEN-API. Проверьте интернет-соединение.',
  timeout: 'GREEN-API не ответил за отведённое время.',
  aborted: 'Запрос отменён.',
  unknown: 'Неизвестная ошибка при обращении к GREEN-API.',
};

/** Текст ошибки для показа пользователю. */
export function humanizeError(error: unknown): string {
  if (error instanceof GreenApiError) return MESSAGES[error.kind];
  if (error instanceof Error) return error.message;
  return MESSAGES.unknown;
}
