import { createStore } from "solid-js/store";

export type AccountStore = {
  pubkey: string;
}

export const [accountStore, updateAccountStore] = createStore<AccountStore>({
  pubkey: '88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079',
});
