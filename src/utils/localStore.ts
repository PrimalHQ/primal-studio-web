import { Kind } from "src/constants";
import { NostrEventContent, NostrRelaySettings, PrimalTheme, UserMetadataContent } from "src/primal";


export type LocalStore = {
  metadata: NostrEventContent | undefined,
  theme: PrimalTheme | undefined,
  chooserTheme: PrimalTheme | undefined,
  useSystemDarkMode: boolean,
  relaySettings: NostrRelaySettings,
};


export const emptyStorage: LocalStore = {
  metadata: undefined,
  theme: undefined,
  chooserTheme: undefined,
  useSystemDarkMode: false,
  relaySettings: {},
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


export const readPubkeyFromStorage = () => {
  return localStorage.getItem('pubkey') || undefined;
};

export const storePubkey = (pubkey: string | undefined) => {
  if (!pubkey) {
    localStorage.removeItem('pubkey');
    return;
  }

  localStorage.setItem('pubkey', pubkey);
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

// ------------------------------------------------

export const storeTheme = (pubkey: string | undefined, theme: PrimalTheme) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.theme = theme;

  setStorage(pubkey, store);
};

export const readTheme = (pubkey: string | undefined) => {
  if (!pubkey) {
    return 'sunrise' as PrimalTheme;
  }

  const store = getStorage(pubkey);

  return (store.theme || 'sunrise') as PrimalTheme;
}


export const storeChooserTheme = (pubkey: string | undefined, theme: PrimalTheme) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.chooserTheme = theme;

  setStorage(pubkey, store);
};

export const readChooserTheme = (pubkey: string | undefined) => {
  if (!pubkey) {
    return 'sunrise' as PrimalTheme;
  }

  const store = getStorage(pubkey);

  return (store.chooserTheme || 'sunrise') as PrimalTheme;
}

export const storeSystemDarkMode = (pubkey: string | undefined, flag: boolean) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.useSystemDarkMode = flag;

  setStorage(pubkey, store);
};

export const readSystemDarkMode = (pubkey: string | undefined) => {
  if (!pubkey) {
    return false;
  }

  const store = getStorage(pubkey);

  return store.useSystemDarkMode || false;
}

//  Relays ---------------------------------------

export const storeRelaySettings = (
  pubkey: string | undefined,
  settings: NostrRelaySettings,
) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.relaySettings = { ...settings };

  setStorage(pubkey, store);
}

export const readRelaySettings = (pubkey: string | undefined) => {
  if (!pubkey) return {};

  const store = getStorage(pubkey);

  return store.relaySettings || {};
}
