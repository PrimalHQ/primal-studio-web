import { Kind } from "src/constants";
import { NostrEventContent, UserMetadataContent } from "src/primal";


export type LocalStore = {
  metadata: NostrEventContent | undefined,
};


export const emptyStorage: LocalStore = {
  metadata: undefined,
}


export const storageName = (pubkey?: string) => {
  if (!pubkey) {
    return 'anon';
  }

  return `store_${pubkey}`;
};

export const getStorage = (pubkey?: string) => {
  if (!pubkey) {
    return {} as LocalStore;
  }

  const name = storageName(pubkey);
  const storage = localStorage.getItem(name);

  return storage ?
    JSON.parse(storage) as LocalStore :
    { ...emptyStorage };
};

export const setStorage = (pubkey: string | undefined, data: LocalStore) => {
  if (!pubkey) {
    return;
  }

  const name = storageName(pubkey);
  const value = JSON.stringify(data);

  localStorage.setItem(name, value);
}

// ---------------------------------------------

export const readSecFromStorage = () => {
  return localStorage.getItem('primalSec') || undefined;
};

export const storeSec = (sec: string | undefined) => {
  if (!sec) {
    localStorage.removeItem('primalSec');
    return;
  }

  localStorage.setItem('primalSec', sec);
};

// ------------------------------------------------

export const readStoredProfile = (pubkey: string) => {
  const store = getStorage(pubkey)
  return store.metadata;
};

export const storeProfile = (profile: NostrEventContent) => {
  const store = getStorage(profile.pubkey);

  if (profile.kind !== Kind.Metadata) return;

  store.metadata = { ...profile };

  setStorage(profile.pubkey, store);
};
