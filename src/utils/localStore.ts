import { EmojiOption } from "src/components/EmojiPicker/EmojiPicker";
import { Kind } from "src/constants";
import { GraphSpan } from "src/pages/Home/Home.data";
import { mediaSortOptions } from "src/pages/Media/Media.data";
import { NostrEventContent, NostrRelaySettings, PrimalTheme, UserMetadataContent } from "src/primal";

export type MediaPageConfig = {
  server?: string,
  sort?: typeof mediaSortOptions[number],
  listType?: 'grid' | 'list',
}

export type LocalStore = {
  metadata: NostrEventContent | undefined,
  theme: PrimalTheme | undefined,
  chooserTheme: PrimalTheme | undefined,
  useSystemDarkMode: boolean,
  relaySettings: NostrRelaySettings,
  proxyThroughPrimal: boolean,
  connectToPrimaryRelays: boolean,
  emojiHistory: EmojiOption[],
  graphSpans: Record<string, GraphSpan>,
  mediaPageConfig: MediaPageConfig,
};


export const emptyStorage: LocalStore = {
  metadata: undefined,
  theme: undefined,
  chooserTheme: undefined,
  useSystemDarkMode: false,
  relaySettings: {},
  proxyThroughPrimal: false,
  connectToPrimaryRelays: false,
  emojiHistory: [],
  graphSpans: {},
  mediaPageConfig: {}
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

  return {
    ...emptyStorage,
    ...(JSON.parse(storage || '{}') as LocalStore),
  }

  // return storage ?
  //   JSON.parse(storage) as LocalStore :
  //   { ...emptyStorage };
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
    return 'studio_light' as PrimalTheme;
  }

  const store = getStorage(pubkey);

  return (store.theme || 'studio_light') as PrimalTheme;
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
    return 'studio_light' as PrimalTheme;
  }

  const store = getStorage(pubkey);

  return (store.chooserTheme || 'studio_light') as PrimalTheme;
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

export const storeProxyThroughPrimal = (
  pubkey: string | undefined,
  shouldProxy: boolean,
) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.proxyThroughPrimal = shouldProxy;

  setStorage(pubkey, store);
}

export const readProxyThroughPrimal = (pubkey: string | undefined) => {
  if (!pubkey) return false;

  const store = getStorage(pubkey);

  return store.proxyThroughPrimal || false;
}


export const storeEmojiHistory = (
  pubkey: string | undefined,
  emojis: EmojiOption[],
) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.emojiHistory = emojis;

  setStorage(pubkey, store);
}

export const readEmojiHistory = (pubkey: string | undefined) => {
  if (!pubkey) return [];

  const store = getStorage(pubkey);

  return store.emojiHistory || [];
}

export const defaultSpans = (): Record<string, GraphSpan> => ({
  home: {
    name: '1m',
    until: Math.floor((new Date()).getTime() / 1_000),
    since: Math.floor((new Date()).getTime() / 1_000) - 30 * 24 * 60 * 60,
    resolution: 'day',
  },
  notes: {
    name: '3m',
    until: Math.floor((new Date()).getTime() / 1_000),
    since: Math.floor((new Date()).getTime() / 1_000) - 3 * 30 * 24 * 60 * 60,
    resolution: 'day',
  },
  articles: {
    name: 'all',
    until: Math.floor((new Date()).getTime() / 1_000),
    since: 0,
    resolution: 'month',
  },
})

export const storeGraphSpan = (
  pubkey: string | undefined,
  page: string,
  span: GraphSpan,
) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.graphSpans = {
    ...store.graphSpans,
    [page]: { ...span },
  }

  setStorage(pubkey, store);
}

export const readGraphSpan = (
  pubkey: string | undefined,
  page: string,
) => {
  if (!pubkey) return {};

  const store = getStorage(pubkey);

  return (store.graphSpans[page] || defaultSpans()[page] || {
    name: '1m',
    until: Math.floor((new Date()).getTime() / 1_000),
    since: Math.floor((new Date()).getTime() / 1_000) - 30 * 24 * 60 * 60,
    resolution: 'day',
  }) as GraphSpan;
}

export const storeMediaPageConfig = (
  pubkey: string | undefined,
  config: MediaPageConfig,
) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.mediaPageConfig = {
    ...store.mediaPageConfig,
    ...config,
  }

  setStorage(pubkey, store);
}

export const readMediaPageConfig  = (
  pubkey: string | undefined,
) => {
  if (!pubkey) return {};

  const store = getStorage(pubkey);

  return store.mediaPageConfig;
}
