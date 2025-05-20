import { createStore } from "solid-js/store";
import { NostrEventContent, NostrWindow } from "../primal";
import { logError, logInfo } from "../utils/logger";
import { readPubkeyFromStorage, readSecFromStorage, readStoredProfile, storePubkey, storeRelaySettings } from "../utils/localStore";
import { Kind, pinEncodePrefix } from "../constants";

import { getPublicKey, nip19 } from "../utils/nTools";
import { getPublicKey as getNostrPublicKey } from "../utils/nostrApi";
import { primalAPI } from "src/utils/socket";
import { getUserProfiles } from "src/primal_api/profile";
import { APP_ID } from "src/App";
import { getReplacableEvent, triggerImportEvents } from "src/primal_api/events";
import { areUrlsSame } from "src/utils/blossom";
import { getDefaultBlossomServers } from "src/primal_api/settings";
import { sendBlossomEvent } from "src/primal_api/relays";

export const PRIMAL_PUBKEY = '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';

export const primalBlossom = 'https://blossom.primal.net';

export type AccountStore = {
  pubkey: string;
  sec: string | undefined,
  metadata: NostrEventContent | undefined,
  blossomServers: string[],
  recomendedBlossomServers: string[],
}

export const [accountStore, updateAccountStore] = createStore<AccountStore>({
  pubkey: PRIMAL_PUBKEY,
  sec: undefined,
  metadata: undefined,
  blossomServers: [],
  recomendedBlossomServers: [],
});

let extensionAttempt = 0;

const logout = () => {
  updateAccountStore('sec', () => undefined);
  updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
  localStorage.removeItem('pubkey');
  localStorage.removeItem('primalSec');
};

const setSec = (sec: string | undefined, force?: boolean) => {
  if (!sec) {
    logout();
    return;
  }

  const decoded = nip19.decode(sec);

  if (decoded.type === 'nsec' && decoded.data) {
    updateAccountStore('sec', () => sec);
    localStorage.setItem('primalSec', sec);

    const pubkey = getPublicKey(decoded.data);

    if (pubkey !== accountStore.pubkey || force) {
      updateAccountStore('pubkey', () => pubkey);
      localStorage.setItem('pubkey', pubkey);
    }

    // Read profile from storage

    // Fetch profile, maybe there is an update
  }
}

export const loadStoredPubkey = () => {
  const pubkey = readPubkeyFromStorage();

  if (!pubkey) return;

  updateAccountStore('pubkey', () => pubkey);
};

export const fetchNostrKey = async () => {
  const storedKey = localStorage.getItem('pubkey');

  if (storedKey) {
    updateAccountStore('pubkey', storedKey);

    // Read profile from storage
    const storedUser = readStoredProfile(storedKey);

    if (storedUser) {
      // If it exists, set it as active user
      updateAccountStore('metadata', () => ({...storedUser}));
    }
  }

  const win = window as NostrWindow;
  const nostr = win.nostr;

  // Nostr extension not found
  if (nostr === undefined) {
    logError('Nostr extension not found');
    // Try again after one second if extensionAttempts are not exceeded
    if (extensionAttempt < 4) {
      extensionAttempt += 1;
      logInfo('Nostr extension retry attempt: ', extensionAttempt)
      setTimeout(fetchNostrKey, 250);
      return;
    }

    const sec = readSecFromStorage();

    if (!sec) {
      updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
      localStorage.removeItem('pubkey');
      return;
    }

    if (sec.startsWith(pinEncodePrefix)) {
      // display enter pin modal
      return
    }

    setSec(sec);
    return;
  }

  updateAccountStore('sec', () => undefined);

  try {
    const key = await getNostrPublicKey();

    updateAccountStore('pubkey', () => key);
    storePubkey(key);

    // Read profile from storage
    const storedUser = readStoredProfile(key);

    if (storedUser) {
      // If it exists, set it as active user
      updateAccountStore('metadata', () => ({...storedUser}));
    }

    // Fetch it anyway, maybe there is an update
    updateAccountProfile(key);
  } catch (e: any) {
    updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
    localStorage.removeItem('pubkey');
    logError('error fetching public key: ', e);
  }
}

export const updateAccountProfile = (pubkey: string) => {
  if (pubkey !== accountStore.pubkey) return;

  const subId = `user_profile_${APP_ID}`;

  primalAPI({
    subId,
    action: () => getUserProfiles([pubkey], subId),
    onEvent: (content: NostrEventContent) => {
      if (content.kind !== Kind.Metadata) return;

      updateAccountStore('metadata', () => content);
    },
  });
};

// Blossom Servers --------------------------------------


export const fetchBlossomServers = (pubkey: string) => {
  const subId = `blossom_${APP_ID}`;

  primalAPI({
    subId,
    action: () => getReplacableEvent(pubkey, Kind.Blossom, subId),
    onEvent: (content) => {
      const servers = ((content as NostrEventContent).tags || []).reduce((acc, t) => {
        if (t[0] !== 'server') return acc;

        return [...acc, t[1]];
      }, []);

      console.log('LOAD: ', servers)
      updateAccountStore('blossomServers', () => [...servers]);
    }
  });
}


export const addBlossomServers = (url: string, append?: boolean) => {
  if (append) {
    appendBlossomServers(url);
    return;
  }

  if (accountStore.blossomServers.find(u => areUrlsSame(u, url))) {
    updateAccountStore('blossomServers', (servers) => [url, ...servers.filter(s => !areUrlsSame(s, url))]);
    updateBlossomEvent();
    return;
  }

  updateAccountStore('blossomServers', (servers) => [url, ...servers]);
  updateBlossomEvent();
}

export const appendBlossomServers = (url: string) => {
  console.log('APPEND: ', url, [...accountStore.blossomServers])
  if (accountStore.blossomServers.find(u => areUrlsSame(u, url))) {
    updateAccountStore('blossomServers', (servers) => [...servers.filter(s => !areUrlsSame(s, url)), url]);
    updateBlossomEvent();
    return;
  }

  updateAccountStore('blossomServers', (servers) => [...servers, url]);
  updateBlossomEvent();
}

export const removeBlossomServers = (url: string) => {
  if (!accountStore.blossomServers.includes(url)) return;

  updateAccountStore('blossomServers', (servers) => servers.filter(s => s !== url));
  updateBlossomEvent();
}

export const removeBlossomMirrors = (then?: () => void) => {
  const main = accountStore.blossomServers[0] || primalBlossom;
  updateAccountStore('blossomServers', () => [main]);
  updateBlossomEvent(then);
}

export const setBlossomServers = (urls: string[]) => {
  updateAccountStore('blossomServers', () => [ ...urls ]);
  // updateBlossomEvent();
}

export const updateBlossomEvent = async (then?: () => void) => {
  const { success, note } = await sendBlossomEvent(accountStore.blossomServers);

  if (!success || !note) {
    // toast?.sendWarning('Failed to send server list');
    return;
  }
  triggerImportEvents([note]);
}


export const getRecomendedBlossomServers = async () => {
  const subId = `recommended_blossom_${APP_ID}`;

  const list = await getDefaultBlossomServers(subId);

  updateAccountStore('recomendedBlossomServers', () => [ ...list ]);
};
