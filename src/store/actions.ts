import type { Credentials } from '@/api';
import type { Message } from './models';

/** Контракт действий, доступных компонентам через useAppActions. */
export interface AppActions {
  login(credentials: Credentials): Promise<void>;
  logout(): void;
  createChat(phone: string): Promise<void>;
  openChat(chatId: string): void;
  closeChat(): void;
  sendMessage(chatId: string, text: string): Promise<void>;
  retryMessage(message: Message): Promise<void>;
  dismissNotice(): void;
  /** Забрать опрос уведомлений в эту вкладку. */
  claimPollingTab(): void;
}
