import { createStore } from "solid-js/store";
import { NostrEventContent, NostrWindow } from "../primal";
import { logError, logInfo } from "../utils/logger";
import { readEmojiHistory, readPubkeyFromStorage, readSecFromStorage, readStoredProfile, storeEmojiHistory, storePubkey, storeRelaySettings } from "../utils/localStore";
import { Kind, pinEncodePrefix } from "../constants";

import { getPublicKey, nip19 } from "../utils/nTools";
import { getPublicKey as getNostrPublicKey } from "../utils/nostrApi";
import { primalAPI, subTo } from "src/utils/socket";
import { getUserMetadata } from "src/primal_api/profile";
import { APP_ID } from "src/App";
import { getReplacableEvent, triggerImportEvents } from "src/primal_api/events";
import { areUrlsSame } from "src/utils/blossom";
import { getDefaultBlossomServers } from "src/primal_api/settings";
import { sendBlossomEvent } from "src/primal_api/relays";
import { parseUserMetadata } from "src/utils/profile";
import { getMembershipStatus } from "src/primal_api/membership";
import { EmojiOption } from "src/components/EmojiPicker/EmojiPicker";

export const PRIMAL_PUBKEY = '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';

export const primalBlossom = 'https://blossom.primal.net';

export type MembershipStatus = {
  pubkey?: string,
  tier?: string,
  name?: string,
  rename?: string,
  nostr_address?: string,
  lightning_address?: string,
  primal_vip_profile?: string,
  used_storage?: number,
  expires_on?: number,
};

export type AccountStore = {
  pubkey: string;
  sec: string | undefined,
  metadata: NostrEventContent | undefined,
  blossomServers: string[],
  recomendedBlossomServers: string[],
  accountIsReady: boolean,
  membershipStatus: MembershipStatus,
  emojiHistory: EmojiOption[],
}

export const [accountStore, updateAccountStore] = createStore<AccountStore>({
  pubkey: PRIMAL_PUBKEY,
  sec: undefined,
  metadata: undefined,
  blossomServers: [],
  recomendedBlossomServers: [],
  accountIsReady: false,
  membershipStatus: {},
  emojiHistory: [],
});

let extensionAttempt = 0;

const logout = () => {
  updateAccountStore('sec', () => undefined);
  updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
  updateAccountStore('accountIsReady', () => false);
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
      console.log('PUBKEY CHANGED: ', pubkey, accountStore.pubkey);
      updateAccountStore('pubkey', () => pubkey);
      localStorage.setItem('pubkey', pubkey);
      checkMembershipStatus();
    }

    updateAccountStore('accountIsReady', () => true);

    // Read profile from storage

    // Fetch profile, maybe there is an update
  }

  console.error('BAD SEC: ', sec);
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

    updateAccountStore('accountIsReady', () => true);
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
    action: () => getUserMetadata([pubkey], subId),
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


export const activeUser = () => {
  if (!accountStore.metadata) return;
  return parseUserMetadata(accountStore.metadata);
}


  const openMembershipSocket = (onOpen: (memSocket: WebSocket) => void) => {
    const membershipSocket = new WebSocket('wss://wallet.primal.net/v1');

    membershipSocket.addEventListener('close', () => {
      logInfo('MEMBERSHIP SOCKET CLOSED');
    });

    membershipSocket.addEventListener('open', () => {
      logInfo('MEMBERSHIP SOCKET OPENED');
      onOpen(membershipSocket);
    });
  }

export const checkMembershipStatus = () => {
  openMembershipSocket((memSocket) => {
    if (!memSocket || memSocket.readyState !== WebSocket.OPEN) return;

    const subId = `ps_${APP_ID}`;

    let gotEvent = false;

    const unsub = subTo(memSocket, subId, (type, _, content) => {
      if (type === 'EVENT') {
        const status: MembershipStatus = JSON.parse(content?.content || '{}');

        gotEvent = true;
        updateAccountStore('membershipStatus', () => ({ ...status }));
      }

      if (type === 'EOSE') {
        unsub();
        memSocket?.close();

        if (!gotEvent) {
          updateAccountStore('membershipStatus', () => ({ tier: 'none' }));
        }
      }
    });

    getMembershipStatus(accountStore.pubkey, subId, memSocket);
  });
};

export const saveEmoji = (emoji: EmojiOption) => {
  const history = accountStore.emojiHistory;

  if (history.find(e => e.name === emoji.name)) {
    let sorted = [...history];
    sorted.sort((a, b) => a.name === emoji.name ? -1 : b.name === emoji.name ? 1 : 0);

    updateAccountStore('emojiHistory', () => [...sorted]);
    storeEmojiHistory(accountStore.pubkey, accountStore.emojiHistory);

    return;
  }

  updateAccountStore('emojiHistory', (h) => [emoji, ...h].slice(0, 40));
  storeEmojiHistory(accountStore.pubkey, accountStore.emojiHistory);
};

export const loadEmojiHistoryFromLocalStore = () => {
  updateAccountStore('emojiHistory', () => readEmojiHistory(accountStore.pubkey));
}
