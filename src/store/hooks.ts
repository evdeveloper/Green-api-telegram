import { useContext } from 'react';
import type { AppActions } from './actions';
import { ActionsContext, StateContext } from './contexts';
import type { AppState } from './reducer';

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useAppState вызван вне AppStoreProvider');
  return state;
}

export function useAppActions(): AppActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useAppActions вызван вне AppStoreProvider');
  return actions;
}
