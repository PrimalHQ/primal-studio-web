import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  on,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import {
  connect,
  disconnect,
  isConnected,
  readData,
  refreshSocketListeners,
  removeSocketListeners,
  socket,
} from "../utils/socket";
import { NostrEOSE, NostrEvent, NostrEvents } from "../primal";
import { addEventsToStore, addEventToStore } from "../stores/EventStore";
import { accountStore, fetchBlossomServers, fetchNostrKey, getRecomendedBlossomServers, loadEmojiHistoryFromLocalStore, loadStoredPubkey, PRIMAL_PUBKEY } from "../stores/AccountStore";
import { appStore, updateAppStore } from "../stores/AppStore";
import { logInfo } from "../utils/logger";
import { MINUTE } from "../constants";
import { loadContentImportSettings, loadDefaults, loadInboxPermissionSettings, loadSettings, loadStoredSettings, settingsStore } from "src/stores/SettingsStore";
import { updateRelays } from "src/stores/RelayStore";


export type AppContextStore = {
  actions: {

  },
}

const initialData = {
};

export const AppContext = createContext<AppContextStore>();

export const AppProvider = (props: { children: JSXElement }) => {

  //  Monitor user's inactivity ------------------------------------------------

  let inactivityCounter = 0;

  const monitorActivity = () => {
    clearTimeout(inactivityCounter);

    if (appStore.isInactive) {
      updateAppStore('isInactive', () => false);
    }

    inactivityCounter = setTimeout(() => {
      updateAppStore('isInactive', () => true);
    }, 5 * MINUTE);
  };

  onMount(() => {
    document.addEventListener('mousemove', monitorActivity);
    document.addEventListener('scroll', monitorActivity);
    document.addEventListener('keydown', monitorActivity);
  });

  onCleanup(() => {
    document.removeEventListener('mousemove', monitorActivity);
    document.removeEventListener('scroll', monitorActivity);
    document.removeEventListener('keydown', monitorActivity);
  });

  let wakingTimeout = 0;

  createEffect(() => {
    const html: HTMLElement | null = document.querySelector('html');
    html?.setAttribute('data-theme', settingsStore.theme);
  });
  createEffect(() => {
    if (appStore.isInactive) {
      updateAppStore('appState', () => 'sleep');
      clearTimeout(wakingTimeout);
      return;
    }
    // Set this state in order to make sure that we reload page
    // when user requests future notes because we didn't fetch them yet
    updateAppStore('appState', () => 'waking');

    // Give time for future notes fetching to fire before changing state
    wakingTimeout = setTimeout(() => {
      updateAppStore('appState', () => 'woke');
    }, 36_000);
  });

  // Handle main socket connect/disconnect based on user's activity ------------

  createEffect(() => {
    if (appStore.appState === 'sleep') {
      logInfo(
        'Disconnected from Primal socket due to inactivity at: ',
        (new Date()).toLocaleTimeString(),
      );
      disconnect(false);
      return;
    }

    if (appStore.appState === 'waking' && socket()?.readyState === WebSocket.CLOSED) {
      logInfo(
        'Reconnected to Primal socket at: ',
        (new Date()).toLocaleTimeString(),
      );
      connect();
    }
  })

  // Event handling ------------------------------------------------------------

  const onMessage = async (event: MessageEvent) => {
    const data = await readData(event);
    const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

    const [type, _, content] = message;

    if (type === 'EVENTS') {
      addEventsToStore(content);
    }

    if (type === 'EVENT') {
      addEventToStore(content);
    }
  };

  // Load default settings -----------------------------------------------------

  onMount(() => {
    loadDefaults();
    loadStoredSettings();
    loadStoredPubkey();

    fetchNostrKey();

    getRecomendedBlossomServers();

    loadEmojiHistoryFromLocalStore();
  })

  // Handle fetching users identity --------------------------------------------

  createEffect(on(() => accountStore.pubkey, (pubkey, prev) => {
    if (!pubkey || pubkey.length === 0 || pubkey === prev) return;

    setTimeout(() => {
      loadSettings(accountStore.pubkey);
      updateRelays();
      fetchBlossomServers(pubkey);
      loadInboxPermissionSettings();
      loadContentImportSettings();
    }, 100)
  }));

  // Handle main socket reconnection -------------------------------------------

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

// STORES ---------------------------------------

  const [store, updateStore] = createStore<AppContextStore>({
    ...initialData,
    actions: {

    },
  });

  return (
      <AppContext.Provider value={store}>
        {props.children}
      </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
