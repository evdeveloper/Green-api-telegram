import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import {
  createGreenApiClient,
  GreenApiError,
  humanizeError,
  MAX_MESSAGE_LENGTH,
  type Credentials,
  type Notification,
} from '@/api';
import {
  describeInstanceState,
  ensureWebhookSettings,
  waitForAuthorized,
} from '@/features/auth/instanceSetup';
import { mapHistoryItem, mapNotification } from '@/features/messages/mapNotification';
import { useNotificationPolling } from '@/features/polling/useNotificationPolling';
import { useTabLeader } from '@/features/polling/useTabLeader';
import { chatIdToPhone, phoneToChatId } from '@/lib/chatId';
import type { AppActions } from './actions';
import { ActionsContext, StateContext } from './contexts';
import type { ConnectionStatus, Message } from './models';
import {
  clearConversations,
  clearCredentials,
  loadConversations,
  loadCredentials,
  saveConversations,
  saveCredentials,
} from './persistence';
import { initialState, reducer } from './reducer';

let tempIdSeq = 0;
function nextTempId(): string {
  tempIdSeq += 1;
  return `temp-${Date.now()}-${tempIdSeq}`;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const credentials = state.session.credentials;
  const isReady = state.session.status === 'ready';

  /** Клиент пересоздаётся только при смене кред. */
  const client = useMemo(
    () => (credentials && isReady ? createGreenApiClient(credentials) : null),
    [credentials, isReady],
  );

  /* ----------------------------------------------------------------- */
  /* Вход и выход                                                       */
  /* ----------------------------------------------------------------- */

  const login = useCallback(async (input: Credentials) => {
    dispatch({
      type: 'session/connecting',
      credentials: input,
      progress: 'Проверяем состояние инстанса…',
    });

    const probe = createGreenApiClient(input);

    try {
      const { stateInstance } = await probe.getStateInstance();

      if (stateInstance !== 'authorized') {
        dispatch({ type: 'session/failed', error: describeInstanceState(stateInstance) });
        return;
      }

      dispatch({ type: 'session/progress', progress: 'Настраиваем приём уведомлений…' });
      const { restarted } = await ensureWebhookSettings(probe);

      if (restarted) {
        // setSettings перезапускает инстанс — ждём, пока он снова авторизуется.
        dispatch({ type: 'session/progress', progress: 'Инстанс перезапускается…' });
        const settled = await waitForAuthorized(probe);
        if (settled !== 'authorized') {
          dispatch({ type: 'session/failed', error: describeInstanceState(settled) });
          return;
        }
      }

      saveCredentials(input);
      dispatch({
        type: 'session/ready',
        credentials: input,
        instanceState: 'authorized',
        conversations: loadConversations(),
      });
    } catch (error) {
      dispatch({ type: 'session/failed', error: humanizeError(error) });
    }
  }, []);

  const logout = useCallback(() => {
    clearCredentials();
    clearConversations();
    dispatch({ type: 'session/loggedOut' });
  }, []);

  /** Восстановление сессии при загрузке страницы. */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = loadCredentials();
    if (stored) void login(stored);
  }, [login]);

  /* ----------------------------------------------------------------- */
  /* Персист переписки                                                  */
  /* ----------------------------------------------------------------- */

  useEffect(() => {
    if (!isReady) return;
    saveConversations({
      chats: state.chats,
      messages: state.messages,
      activeChatId: state.activeChatId,
    });
  }, [isReady, state.chats, state.messages, state.activeChatId]);

  /* ----------------------------------------------------------------- */
  /* Чаты                                                              */
  /* ----------------------------------------------------------------- */

  const openChat = useCallback((chatId: string) => {
    dispatch({ type: 'chats/opened', chatId });
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: 'chats/closed' });
  }, []);

  /** Подтягивает историю, если по этому чату она ещё не запрашивалась. */
  const loadHistory = useCallback(
    async (chatId: string) => {
      if (!client) return;
      try {
        const items = await client.getChatHistory({ chatId });
        dispatch({
          type: 'chats/historyLoaded',
          chatId,
          messages: items.map(mapHistoryItem),
        });
      } catch (error) {
        // История — необязательное удобство: чат открывается и без неё,
        // но молчать об этом нельзя, иначе пустой чат выглядит как потеря переписки.
        dispatch({ type: 'chats/historyLoaded', chatId, messages: [] });
        dispatch({
          type: 'notice/shown',
          text: `Не удалось загрузить историю чата. ${humanizeError(error)}`,
        });
      }
    },
    [client],
  );

  const createChat = useCallback(
    async (phone: string) => {
      const chatId = phoneToChatId(phone);
      dispatch({
        type: 'chats/created',
        chat: {
          chatId,
          phone: chatIdToPhone(chatId),
          lastMessageAt: Date.now(),
          unreadCount: 0,
          historyLoaded: false,
        },
      });
      await loadHistory(chatId);
    },
    [loadHistory],
  );

  /* ----------------------------------------------------------------- */
  /* Отправка                                                          */
  /* ----------------------------------------------------------------- */

  const deliver = useCallback(
    async (chatId: string, text: string, tempId: string) => {
      if (!client) return;
      try {
        const { idMessage } = await client.sendMessage({ chatId, message: text });
        dispatch({ type: 'messages/sent', chatId, tempId, idMessage });
      } catch (error) {
        dispatch({ type: 'messages/sendFailed', chatId, tempId, error: humanizeError(error) });
        // Лимиты тарифа и троттлинг не очевидны из пометки на баббле —
        // про них говорим отдельно.
        if (
          error instanceof GreenApiError &&
          (error.kind === 'quotaExceeded' || error.kind === 'rateLimited')
        ) {
          dispatch({ type: 'notice/shown', text: humanizeError(error) });
        }
      }
    },
    [client],
  );

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        dispatch({
          type: 'notice/shown',
          text: `GREEN-API принимает не более ${MAX_MESSAGE_LENGTH} символов в сообщении.`,
        });
        return;
      }

      const tempId = nextTempId();
      // Оптимистичный рендер: сообщение появляется в переписке сразу.
      dispatch({
        type: 'messages/queued',
        message: {
          id: tempId,
          chatId,
          direction: 'out',
          text: trimmed,
          timestamp: Date.now(),
          status: 'pending',
        },
      });

      await deliver(chatId, trimmed, tempId);
    },
    [deliver],
  );

  /** Повтор для сообщения со статусом failed: переиспользуем ту же запись. */
  const retryMessage = useCallback(
    async (message: Message) => {
      dispatch({
        type: 'messages/queued',
        message: { ...message, status: 'pending', error: undefined },
      });
      await deliver(message.chatId, message.text, message.id);
    },
    [deliver],
  );

  const dismissNotice = useCallback(() => dispatch({ type: 'notice/dismissed' }), []);

  /* ----------------------------------------------------------------- */
  /* Приём уведомлений                                                  */
  /* ----------------------------------------------------------------- */

  const handleNotification = useCallback((notification: Notification) => {
    const event = mapNotification(notification);

    switch (event.kind) {
      case 'message':
        dispatch({
          type: 'messages/received',
          message: event.message,
          senderName: event.senderName,
        });
        break;
      case 'status':
        dispatch({
          type: 'messages/statusChanged',
          idMessage: event.idMessage,
          status: event.status,
          chatId: event.chatId,
        });
        break;
      case 'instanceState':
        dispatch({ type: 'session/instanceState', instanceState: event.state });
        break;
      case 'ignored':
        break;
    }
  }, []);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    dispatch({ type: 'connection/changed', status });
  }, []);

  const handleFatal = useCallback((error: GreenApiError) => {
    clearCredentials();
    dispatch({ type: 'session/failed', error: humanizeError(error) });
  }, []);

  const { isLeader, hasPeers, claim } = useTabLeader(isReady);

  useEffect(() => {
    dispatch({ type: 'tabs/leadership', isPollingTab: isLeader, hasOtherTabs: hasPeers });
  }, [isLeader, hasPeers]);

  useNotificationPolling({
    client,
    // Опрашивает только активная вкладка: очередь уведомлений одна на инстанс.
    enabled: isReady && isLeader,
    onNotification: handleNotification,
    onStatusChange: handleStatusChange,
    onFatal: handleFatal,
  });

  const actions = useMemo<AppActions>(
    () => ({
      login,
      logout,
      createChat,
      openChat,
      closeChat,
      sendMessage,
      retryMessage,
      dismissNotice,
      claimPollingTab: claim,
    }),
    [
      login,
      logout,
      createChat,
      openChat,
      closeChat,
      sendMessage,
      retryMessage,
      dismissNotice,
      claim,
    ],
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}
