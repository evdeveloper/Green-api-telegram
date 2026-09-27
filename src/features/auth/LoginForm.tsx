import { useState, type FormEvent } from 'react';
import { useAppActions, useAppState } from '@/store/hooks';

/**
 * Экран входа. Учётные данные берутся из личного кабинета GREEN-API.
 * Вход разрешаем только при stateInstance === 'authorized' — иначе
 * отправка всё равно не сработает, и лучше сказать об этом сразу.
 */
export function LoginForm() {
  const { session } = useAppState();
  const { login } = useAppActions();

  const [idInstance, setIdInstance] = useState(
    () => session.credentials?.idInstance ?? import.meta.env.VITE_DEV_ID_INSTANCE ?? '',
  );
  const [apiTokenInstance, setApiToken] = useState(
    () =>
      session.credentials?.apiTokenInstance ?? import.meta.env.VITE_DEV_API_TOKEN_INSTANCE ?? '',
  );
  const [touched, setTouched] = useState(false);

  const connecting = session.status === 'connecting';
  const idError = touched && !/^\d+$/.test(idInstance.trim()) ? 'Только цифры' : null;
  const tokenError =
    touched && apiTokenInstance.trim().length < 10 ? 'Слишком короткий токен' : null;
  const canSubmit =
    !connecting && /^\d+$/.test(idInstance.trim()) && apiTokenInstance.trim().length >= 10;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    void login({
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    });
  }

  return (
    <div className="grid min-h-full place-items-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-panel w-full max-w-sm rounded-(--radius-panel) p-6 shadow-sm"
        noValidate
      >
        <div
          className="bg-accent mx-auto mb-4 grid size-12 place-items-center rounded-2xl text-xl text-white"
          aria-hidden="true"
        >
          💬
        </div>

        <h1 className="text-center text-xl font-semibold">Вход в чат</h1>
        <p className="text-text-secondary text-detail mt-1 mb-6 text-center">
          Укажите учётные данные инстанса из личного кабинета GREEN-API.
        </p>

        <label className="mb-4 grid gap-1.5" htmlFor="idInstance">
          <span className="text-text-secondary text-detail">idInstance</span>
          <input
            id="idInstance"
            name="idInstance"
            className="input"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="1101000001"
            inputMode="numeric"
            autoComplete="off"
            disabled={connecting}
            aria-invalid={idError !== null}
          />
          {idError && <span className="text-danger text-xs">{idError}</span>}
        </label>

        <label className="mb-6 grid gap-1.5" htmlFor="apiTokenInstance">
          <span className="text-text-secondary text-detail">apiTokenInstance</span>
          <input
            id="apiTokenInstance"
            name="apiTokenInstance"
            className="input"
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiToken(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="d75b3a66c9e14d0e9c69b6…"
            autoComplete="off"
            disabled={connecting}
            aria-invalid={tokenError !== null}
          />
          {tokenError && <span className="text-danger text-xs">{tokenError}</span>}
        </label>

        {session.error && (
          <p role="alert" className="text-danger text-detail mb-4">
            {session.error}
          </p>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-accent w-full">
          {connecting ? (session.progress ?? 'Подключаемся…') : 'Войти'}
        </button>

        <p className="text-text-tertiary mt-4 text-xs">
          Токен сохраняется в localStorage этого браузера, чтобы не вводить его заново. Выход
          удаляет его вместе с историей чатов.
        </p>
      </form>
    </div>
  );
}
