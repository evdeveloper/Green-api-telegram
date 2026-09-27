import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatDayDivider } from '@/lib/time';
import type { Message } from '@/store/models';
import { groupByDay, isLastInSeries } from './groupByDay';
import { MessageBubble } from './MessageBubble';

/** Насколько близко к низу считаем, что пользователь «смотрит последние сообщения». */
const AT_BOTTOM_THRESHOLD_PX = 80;

interface Props {
  chatId: string;
  messages: Message[];
  historyLoading: boolean;
}

export function MessageList({ chatId, messages, historyLoading }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  /** Был ли пользователь внизу до того, как пришло новое сообщение. */
  const wasAtBottom = useRef(true);
  const [showJumpButton, setShowJumpButton] = useState(false);

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    wasAtBottom.current = true;
    setShowJumpButton(false);
  }

  // Смена чата — сразу вниз, без анимации.
  useLayoutEffect(() => {
    scrollToBottom('auto');
  }, [chatId]);

  /*
   * Новое сообщение: доскролливаем только если пользователь и так был внизу.
   * Иначе он читает историю, и рывок вниз сбил бы ему чтение — вместо этого
   * показываем кнопку перехода к новым сообщениям.
   */
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (wasAtBottom.current) {
      scrollToBottom('smooth');
    } else {
      setShowJumpButton(true);
    }
  }, [messages.length]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;

    function handleScroll() {
      const distance = node!.scrollHeight - node!.scrollTop - node!.clientHeight;
      const atBottom = distance <= AT_BOTTOM_THRESHOLD_PX;
      wasAtBottom.current = atBottom;
      if (atBottom) setShowJumpButton(false);
    }

    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, []);

  const groups = groupByDay(messages);

  return (
    <div className="relative min-h-0 flex-1">
      {/*
        Внутренняя обёртка с min-h-full + justify-end прижимает короткую
        переписку к низу: в мессенджере лента растёт снизу вверх, а не
        висит у верхнего края.
      */}
      <div ref={scroller} className="scroll-thin h-full overflow-y-auto px-4 py-4">
        <div className="flex min-h-full flex-col justify-end">
          {historyLoading && <HistorySkeleton />}

          {!historyLoading && messages.length === 0 && (
            <p className="text-text-secondary text-detail py-10 text-center">
              Сообщений пока нет. Напишите первым — сообщение уйдёт получателю в Telegram.
            </p>
          )}

          {/*
          aria-live на контейнере: новые входящие сообщения проговариваются
          скринридером, иначе они появляются молча.
        */}
          <div aria-live="polite" aria-relevant="additions">
            {groups.map((group) => (
              <section key={group.dayStart}>
                <h3 className="my-3 flex justify-center">
                  <span className="bg-panel/80 text-text-secondary rounded-full px-3 py-1 text-xs backdrop-blur">
                    {formatDayDivider(group.dayStart)}
                  </span>
                </h3>

                <ul className="grid gap-1">
                  {group.messages.map((message, index) => (
                    <li
                      key={message.id}
                      className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                    >
                      <MessageBubble
                        message={message}
                        isLastInSeries={isLastInSeries(group.messages, index)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      {showJumpButton && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="bg-panel border-divider absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full border shadow-lg"
          aria-label="Перейти к последним сообщениям"
        >
          <span aria-hidden="true">↓</span>
        </button>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`bg-panel-active h-10 animate-pulse rounded-(--radius-bubble) ${
            index % 2 === 0 ? 'w-48' : 'ml-auto w-64'
          }`}
        />
      ))}
    </div>
  );
}
