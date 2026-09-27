import { createContext } from 'react';
import type { AppActions } from './actions';
import type { AppState } from './reducer';

/**
 * Контексты вынесены из файла с провайдером: иначе react-refresh теряет
 * быстрое обновление, потому что модуль экспортирует не только компоненты.
 */
export const StateContext = createContext<AppState | null>(null);
export const ActionsContext = createContext<AppActions | null>(null);
