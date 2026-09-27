import type { GreenApiClient, InstanceSettings, InstanceState } from '@/api';

/**
 * Подготовка инстанса к приёму сообщений через HTTP API.
 *
 * Ключевой момент: webhookUrl ДОЛЖЕН быть пустым. Если он задан, GREEN-API
 * отправляет уведомления POST-запросом на этот адрес и НЕ кладёт их в очередь,
 * из которой читает receiveNotification. Приём в интерфейсе при этом молча
 * не работает — самая частая причина «сообщения не приходят».
 * https://green-api.com/v3/docs/api/receiving/technology-http-api/
 */

const REQUIRED: Partial<InstanceSettings> = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  stateWebhook: 'yes',
};

/** Человекочитаемое объяснение состояния инстанса для экрана входа. */
export function describeInstanceState(state: InstanceState): string {
  switch (state) {
    case 'authorized':
      return 'Инстанс авторизован.';
    case 'notAuthorized':
      return 'Инстанс не авторизован. Привяжите аккаунт в личном кабинете GREEN-API.';
    case 'blocked':
      return 'Инстанс заблокирован. Проверьте тариф и статус в личном кабинете GREEN-API.';
    case 'sleepMode':
      return 'Инстанс в спящем режиме. Откройте мессенджер на телефоне и повторите вход.';
    case 'starting':
      return 'Инстанс запускается. Повторите попытку через несколько секунд.';
    case 'yellowCard':
      return 'Инстанс ограничен из-за подозрительной активности. Повторите позже.';
    default:
      return 'Инстанс недоступен.';
  }
}

function needsUpdate(current: InstanceSettings): boolean {
  return (Object.keys(REQUIRED) as (keyof InstanceSettings)[]).some(
    (key) => current[key] !== REQUIRED[key],
  );
}

export interface SetupResult {
  /** setSettings действительно вызывался — значит инстанс перезапускается. */
  restarted: boolean;
}

/**
 * Приводит настройки к нужным, но только если они отличаются:
 * каждый вызов setSettings перезапускает инстанс (~несколько секунд простоя),
 * так что дёргать его на каждом входе не стоит.
 */
export async function ensureWebhookSettings(
  client: GreenApiClient,
  signal?: AbortSignal,
): Promise<SetupResult> {
  const current = await client.getSettings(signal);
  if (!needsUpdate(current)) return { restarted: false };

  await client.setSettings(REQUIRED, signal);
  return { restarted: true };
}

/**
 * Ожидание готовности инстанса после перезапуска.
 * Возвращает последнее увиденное состояние — вызывающий решает, пускать ли дальше.
 */
export async function waitForAuthorized(
  client: GreenApiClient,
  options: { attempts?: number; intervalMs?: number; signal?: AbortSignal } = {},
): Promise<InstanceState> {
  const { attempts = 10, intervalMs = 2_000, signal } = options;
  let last: InstanceState = 'starting';

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal?.aborted) return last;
    const { stateInstance } = await client.getStateInstance(signal);
    last = stateInstance;
    if (stateInstance === 'authorized') return stateInstance;
    // Из этих состояний ожидание не поможет — выходим сразу.
    if (stateInstance === 'blocked' || stateInstance === 'notAuthorized') return stateInstance;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return last;
}
