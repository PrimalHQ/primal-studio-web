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


export const profileLink = (pubkey: string | undefined) => {
  if (!pubkey) return '/';

  return `/p/${pubkey}`

  // let pk = `${pubkey}`;

  // if (pk.startsWith('npub')) {
  //   // @ts-ignore
  //   pk = nip19.decode(pk).data;
  // }

  // const verifiedUser: string = store.verifiedUsers[pk];

  // if (verifiedUser) return `/${verifiedUser}`;

  // try {
  //   const npub = nip19.nprofileEncode({ pubkey: pk });
  //   return `/p/${npub}`;
  // } catch (e) {
  //   return `/p/${pk}`;
  // }

}
