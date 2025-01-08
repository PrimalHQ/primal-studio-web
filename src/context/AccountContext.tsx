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
  updateStore('pubkey', '88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079');
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
