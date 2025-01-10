import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  useContext,
} from "solid-js";
import {
  isConnected,
  readData,
  refreshSocketListeners,
  removeSocketListeners,
  socket,
} from "../utils/socket";
import { NostrEOSE, NostrEvent, NostrEvents } from "../primal";
import { addEventsToStore, addEventToStore } from "../stores/EventStore";
import { accountStore, fetchNostrKey, PRIMAL_PUBKEY } from "../stores/AccountStore";


export type AppContextStore = {
  actions: {

  },
}

const initialData = {
};

export const AppContext = createContext<AppContextStore>();

export const AppProvider = (props: { children: JSXElement }) => {

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

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

// EFFECTS --------------------------------------

  createEffect(() => {
    if (accountStore.pubkey === PRIMAL_PUBKEY) {
      fetchNostrKey();
    }
  })

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
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
