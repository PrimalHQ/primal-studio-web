import { createStore } from "solid-js/store";
import {
  createContext,
  JSXElement,
  onMount,
  useContext
} from "solid-js";

export type AccountContextStore = {
  pubkey: string | undefined,
  actions: {

  },
}

const initialData = {
  pubkey: undefined,
};

export const AccountContext = createContext<AccountContextStore>();

export const AccountProvider = (props: { children: JSXElement }) => {

// SOCKET HANDLERS ------------------------------

// EFFECTS --------------------------------------

onMount(() => {
  updateStore('pubkey', 'npub13rxpxjc6vh65aay2eswlxejsv0f7530sf64c4arydetpckhfjpustsjeaf');
})

// STORES ---------------------------------------

  const [store, updateStore] = createStore<AccountContextStore>({
    ...initialData,
    actions: {

    },
  });

  return (
      <AccountContext.Provider value={store}>
        {props.children}
      </AccountContext.Provider>
  );
}

export const useAccountContext = () => useContext(AccountContext);
