import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Выбор активной вкладки.
 *
 * Очередь уведомлений у GREEN-API одна на инстанс, а receiveNotification
 * забирает сообщение из неё безвозвратно (после deleteNotification). Если
 * опрос ведут две вкладки, они делят поток между собой: часть сообщений
 * приходит в одну, часть — в другую, и обе выглядят «сломанными».
 *
 * Поэтому опрашивает только одна вкладка — самая старая из открытых.
 * Остальные показывают баннер с кнопкой «Опрашивать здесь», которая
 * передаёт роль принудительно.
 *
 * Координация через BroadcastChannel: он работает между вкладками одного
 * origin и не требует сервера. Если API недоступен (старый браузер), вкладка
 * считает себя активной — поведение не хуже, чем без этого механизма.
 */

const CHANNEL_NAME = 'greenapi-chat-tabs';
const HEARTBEAT_MS = 2000;
/** Пир считается закрытым, если молчит дольше трёх ударов сердца. */
const PEER_TTL_MS = HEARTBEAT_MS * 3;
/** Пауза на обнаружение соседей до первого решения — чтобы две вкладки не начали опрос одновременно. */
const DISCOVERY_MS = 400;

interface PeerInfo {
  startedAt: number;
  seenAt: number;
}

type TabMessage =
  | { type: 'hello' | 'here' | 'bye'; id: string; startedAt: number }
  | { type: 'takeover'; id: string; startedAt: number };

export interface TabLeadership {
  /** Эта вкладка ведёт опрос. */
  isLeader: boolean;
  /** Открыта хотя бы одна другая вкладка. */
  hasPeers: boolean;
  /** Забрать опрос себе. */
  claim: () => void;
}

export function useTabLeader(enabled: boolean): TabLeadership {
  const [isLeader, setIsLeader] = useState(false);
  const [hasPeers, setHasPeers] = useState(false);
  const claimRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) {
      setIsLeader(false);
      setHasPeers(false);
      return;
    }

    if (typeof BroadcastChannel === 'undefined') {
      setIsLeader(true);
      return;
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const peers = new Map<string, PeerInfo>();

    /** Вкладка, которой роль передали вручную. Перебивает выбор по возрасту. */
    let forcedLeaderId: string | null = null;
    let discovered = false;

    function recompute() {
      if (!discovered) return;

      const now = Date.now();
      for (const [peerId, info] of peers) {
        if (now - info.seenAt > PEER_TTL_MS) peers.delete(peerId);
      }
      setHasPeers(peers.size > 0);

      if (forcedLeaderId) {
        setIsLeader(forcedLeaderId === id);
        return;
      }

      // Ведёт самая старая вкладка; при равенстве времени — меньший id.
      let leaderId = id;
      let leaderStartedAt = startedAt;
      for (const [peerId, info] of peers) {
        const older = info.startedAt < leaderStartedAt;
        const sameAgeButSmaller = info.startedAt === leaderStartedAt && peerId < leaderId;
        if (older || sameAgeButSmaller) {
          leaderId = peerId;
          leaderStartedAt = info.startedAt;
        }
      }
      setIsLeader(leaderId === id);
    }

    channel.onmessage = (event: MessageEvent<TabMessage>) => {
      const message = event.data;
      if (!message || message.id === id) return;

      if (message.type === 'bye') {
        peers.delete(message.id);
        if (forcedLeaderId === message.id) forcedLeaderId = null;
        recompute();
        return;
      }

      peers.set(message.id, { startedAt: message.startedAt, seenAt: Date.now() });

      if (message.type === 'takeover') {
        forcedLeaderId = message.id;
      } else if (message.type === 'hello') {
        // Представляемся новичку, чтобы он сразу узнал о нас.
        channel.postMessage({ type: 'here', id, startedAt } satisfies TabMessage);
      }

      recompute();
    };

    claimRef.current = () => {
      forcedLeaderId = id;
      channel.postMessage({ type: 'takeover', id, startedAt } satisfies TabMessage);
      recompute();
    };

    channel.postMessage({ type: 'hello', id, startedAt } satisfies TabMessage);

    const discoveryTimer = setTimeout(() => {
      discovered = true;
      recompute();
    }, DISCOVERY_MS);

    const heartbeat = setInterval(() => {
      channel.postMessage({ type: 'here', id, startedAt } satisfies TabMessage);
      recompute();
    }, HEARTBEAT_MS);

    return () => {
      channel.postMessage({ type: 'bye', id, startedAt } satisfies TabMessage);
      clearTimeout(discoveryTimer);
      clearInterval(heartbeat);
      channel.close();
    };
  }, [enabled]);

  return { isLeader, hasPeers, claim: useCallback(() => claimRef.current(), []) };
}
