import { createStore } from "solid-js/store";

export type AppContextStore = {
  isInactive: boolean,
  appState: 'sleep' | 'waking' | 'woke',
};

export const emptyAppStore = (): AppContextStore => ({
  isInactive: false,
  appState: 'woke',
});

export const [appStore, updateAppStore] = createStore<AppContextStore>(emptyAppStore());
