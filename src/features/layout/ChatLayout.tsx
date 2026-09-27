import { Banner } from '@/components/Banner';
import { Toast } from '@/components/Toast';
import { describeInstanceState } from '@/features/auth/instanceSetup';
import { ChatHeader } from '@/features/chats/ChatHeader';
import { ChatSidebar } from '@/features/chats/ChatSidebar';
import { MessageComposer } from '@/features/messages/MessageComposer';
import { MessageList } from '@/features/messages/MessageList';
import { useAppActions, useAppState } from '@/store/hooks';
import { selectActiveMessages } from '@/store/reducer';

/**
 * Раскладка чата.
 *
 * Десктоп — две панели: список чатов фиксированной ширины и переписка.
 * Мобильный — одна панель за раз: пока чат не выбран, видно список;
 * после выбора — переписка с кнопкой «назад» в шапке.
 */
export function ChatLayout() {
  const state = useAppState();
  const { closeChat, dismissNotice, claimPollingTab } = useAppActions();

  const activeChat = state.activeChatId ? state.chats[state.activeChatId] : null;
  const messages = selectActiveMessages(state);

  const instanceState = state.session.instanceState;
  // Инстанс мог «отвалиться» уже после входа — об этом сообщает stateInstanceChanged.
  const instanceProblem =
    instanceState && instanceState !== 'authorized' ? describeInstanceState(instanceState) : null;

  return (
    <div className="flex h-full flex-col">
      {instanceProblem && <Banner tone="danger">{instanceProblem}</Banner>}

      {state.session.status === 'ready' && !state.isPollingTab && state.hasOtherTabs && (
        <Banner tone="warning" action={{ label: 'Опрашивать здесь', onClick: claimPollingTab }}>
          Чат открыт в другой вкладке — новые сообщения приходят туда. Очередь уведомлений GREEN-API
          одна на инстанс, поэтому опрашивает только одна вкладка.
        </Banner>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1">
        <aside
          className={`border-divider w-full shrink-0 border-r md:block md:w-[340px] ${
            activeChat ? 'hidden' : 'block'
          }`}
        >
          <ChatSidebar />
        </aside>

        <main className={`min-w-0 flex-1 flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
          {!activeChat ? (
            <EmptyState />
          ) : (
            <>
              <ChatHeader chat={activeChat} onBack={closeChat} />
              <MessageList
                chatId={activeChat.chatId}
                messages={messages}
                historyLoading={!activeChat.historyLoaded && messages.length === 0}
              />
              <MessageComposer chatId={activeChat.chatId} />
            </>
          )}
        </main>
      </div>

      {state.notice && <Toast text={state.notice} onDismiss={dismissNotice} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid flex-1 place-items-center p-6">
      <div className="max-w-xs text-center">
        <div
          className="bg-panel text-text-tertiary mx-auto mb-4 grid size-16 place-items-center rounded-full text-2xl"
          aria-hidden="true"
        >
          💬
        </div>
        <p className="text-title font-medium">Выберите чат</p>
        <p className="text-text-secondary text-detail mt-1">
          Или создайте новый по номеру телефона получателя.
        </p>
      </div>
    </div>
  );
}
