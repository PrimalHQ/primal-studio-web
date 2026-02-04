import { createStore } from "solid-js/store";
import { LegendCustomizationConfig, NostrEventContent, NostrWindow } from "../primal";
import { logError, logInfo } from "../utils/logger";
import { getStorage, readEmojiHistory, readMembershipStatus, readPubkeyFromStorage, readSecFromStorage, readStoredProfile, storeEmojiHistory, storePubkey, storeRelaySettings } from "../utils/localStore";
import { Kind, pinEncodePrefix } from "../constants";

import { getPublicKey, nip19, nip46, SimplePool } from "../utils/nTools";
import { getPublicKey as getNostrPublicKey } from "../utils/nostrApi";
import { primalAPI, subTo } from "src/utils/socket";
import { getUserMetadata } from "src/primal_api/profile";
import { APP_ID } from "src/App";
import { getReplacableEvent, triggerImportEvents } from "src/primal_api/events";
import { areUrlsSame } from "src/utils/blossom";
import { getDefaultBlossomServers } from "src/primal_api/settings";
import { sendBlossomEvent } from "src/primal_api/relays";
import { parseUserMetadata } from "src/utils/profile";
import { getMembershipStatus, getPremiumStatus } from "src/primal_api/membership";
import { EmojiOption } from "src/components/EmojiPicker/EmojiPicker";
import { createEffect } from "solid-js";
import { getLicenceStatus, LicenseStatus } from "src/primal_api/studio";
import { updateAppStore } from "./AppStore";
import { isPhone } from "src/utils/ui";
import { appSigner, getAppSK, setAppSigner } from "src/utils/primalNip46";

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

  cohort_1?: string,
  cohort_2?: string,
  recurring?: boolean,
  renews_on?: number | null,
  edited_shoutout?: string,
  donated_btc?: string,
};

export type AccountStore = {
  pubkey: string;
  sec: string | undefined,
  metadata: NostrEventContent | undefined,
  blossomServers: string[],
  recomendedBlossomServers: string[],
  accountIsReady: boolean | undefined,
  membershipStatus: MembershipStatus,
  premiumStatus: MembershipStatus,
  emojiHistory: EmojiOption[],
  licenseStatus: LicenseStatus,
  legendConfig: LegendCustomizationConfig | undefined,
  loginType: LoginType,
  showPin: string,
}

export const [accountStore, updateAccountStore] = createStore<AccountStore>({
  pubkey: PRIMAL_PUBKEY,
  sec: undefined,
  metadata: undefined,
  blossomServers: [],
  recomendedBlossomServers: [],
  accountIsReady: undefined,
  membershipStatus: {},
  premiumStatus: {},
  emojiHistory: [],
  licenseStatus: {
    first_access: false,
    trial_remaining_sec: 0,
    licensed: false,
    valid_until: null,
  },
  legendConfig: undefined,
  loginType: 'none',
  showPin: '',
});

const LOGIN_TYPES = ['extension', 'local', 'npub', 'guest', 'nip46', 'none'] as const;

export type LoginType = (typeof LOGIN_TYPES)[number];

export const loadLicenseStatus = async () => {
  const status = await getLicenceStatus();

  updateAccountStore('licenseStatus', () => ({ ...status }));


  if (!accountStore.licenseStatus.licensed && accountStore.licenseStatus.trial_remaining_sec <= 0) {
    updateAppStore('showTrialExpiredDialog', () => true);
  }
}

export const setPublicKey = (pubkey: string | undefined) => {

  if (pubkey && pubkey.length > 0) {
    updateAccountStore('pubkey', () => pubkey);
    localStorage.setItem('pubkey', pubkey);
  }
  else {
    updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
    localStorage.removeItem('pubkey');
  }
};

// export const logout = () => {
//   updateAccountStore('sec', () => undefined);
//   updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
//   updateAccountStore('accountIsReady', () => false);
//   localStorage.removeItem('pubkey');
//   localStorage.removeItem('primalSec');
// };

export const setLoginType = (type: LoginType) => {
  localStorage.setItem('loginType', type);
  updateAccountStore('loginType', () => type);
}

export const logout = () => {
  updateAccountStore('sec', () => undefined);
  setPublicKey(undefined);
  updateAccountStore('accountIsReady', () => false);
  localStorage.removeItem('pubkey');
  localStorage.removeItem('primalSec');

  localStorage.removeItem('bunkerUrl');
  localStorage.removeItem('clientConnectionUrl');
  localStorage.removeItem('appNsec');
  localStorage.removeItem('appPubkey');

  setLoginType('guest');
};

export const logUserIn = () => {
  const storedLoginType = (localStorage.getItem('loginType') || 'none') as LoginType;

  let type = accountStore.loginType;

  if (LOGIN_TYPES.includes(storedLoginType)) {
    setLoginType(storedLoginType);
    type = storedLoginType;
  }

  const storedPk = fetchNostrKey();

  switch (type) {
    case 'npub':
      loginUsingNpub();
      break;
    case 'extension':
      if (storedPk) {
        doAfterLogin(storedPk);
      }
      loginUsingExtension();
      break;
    case 'local':
      loginUsingLocalNsec();
      break;
    case 'nip46':
      loginUsingNip46(storedPk);
      break;
    case 'guest':
      loginGuest();
      break;
    default:
      findActiveLogin();
      break;
  }
}

export const findActiveLogin = (extensionAttempt = 0) => {
  const sec = readSecFromStorage();

  if (sec) {
    loginUsingLocalNsec(sec);
    return;
  }

  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (!nostr && extensionAttempt < 4) {
    setTimeout(() => {
      findActiveLogin(extensionAttempt + 1);
    }, 500);
    return;
  }

  if (nostr) {
    loginUsingExtension();
    return;
  }

  loginGuest();
}

export const loginGuest = () => {
  setPublicKey(undefined);
  updateAccountStore('metadata', () => undefined);
  updateAccountStore('loginType', () => 'guest');
  updateAccountStore('accountIsReady', () => true);
};

export const loginUsingExtension = async (extensionAttempt = 0) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  updateAccountStore('accountIsReady', () => false);

  if (!nostr) {
    if (extensionAttempt > 4) {
      logInfo('Nostr extension not found');
      return;
    }

    logInfo('Nostr extension retry attempt: ', extensionAttempt)
    setTimeout(() => loginUsingExtension(extensionAttempt + 1), 250);
    return;
  }

  try {
    setLoginType('extension');
    const key = await getNostrPublicKey();

    if (key === undefined) {
      setTimeout(() => {
        loginUsingExtension(extensionAttempt + 1);
      }, 250);
    }
    else {
      setPublicKey(key);

      // Read profile from storage
      const storedUser = readStoredProfile(key);

      if (storedUser) {
        // If it exists, set it as active user
        updateAccountStore('metadata', () => ({...storedUser}));
      }

      doAfterLogin(key);
    }
  } catch (e: any) {
    setLoginType('guest');
    setPublicKey(undefined);
    localStorage.removeItem('pubkey');
    logError('error fetching public key: ', e);
  }
};

export const loginUsingLocalNsec = (oSec?: string) => {
  const sec = oSec || readSecFromStorage();

  if (!sec) return;

  setLoginType('local');

  if (sec.startsWith(pinEncodePrefix)) {
    updateAccountStore('showPin', () => sec);
  }
  else {
    setSec(sec);
    accountStore.pubkey && doAfterLogin(accountStore.pubkey)
  }
};

export const loginUsingNpub = (npub?: string) => {
  setLoginType('npub');

  if (npub) {
    const decoded = nip19.decode(npub);

    if (decoded.type !== 'npub') return;

    const pk = decoded.data;

    setPublicKey(pk);
    doAfterLogin(pk);
    return;
  }


  let pk = localStorage.getItem('pubkey');

  if (!pk) return;
    setPublicKey(pk);
  doAfterLogin(pk);
};

export const loginUsingNip46 = async (pk?: string) => {
  setLoginType('nip46');

  const sec = getAppSK();
  const bunkerUrl = localStorage.getItem('bunkerUrl');

  if (!sec || !bunkerUrl) {
    setLoginType('guest');
    return;
  }

  const bunkerPointer = await nip46.parseBunkerInput(bunkerUrl)

  if (!bunkerPointer) {
    setLoginType('guest');
    return;
  }

  const pool = new SimplePool();

  setAppSigner(nip46.BunkerSigner.fromBunker(sec, bunkerPointer, { pool }))

  if (!appSigner) {
    setLoginType('guest');
    return;
  }

  const pubkey = pk || await appSigner.getPublicKey()

  setPublicKey(pubkey);
  doAfterLogin(pubkey);
};

export const doAfterLogin = async (pubkey: string) => {
  // const storage = getStorage(pubkey);

// ===========================================

  // const eventQueue = readAccountStoreKey(pubkey, 'eventQueue');

  // updateAccountStore('eventQueue', () => [ ...eventQueue]);

  // if (eventQueue.length > 0) {
  //   startEventQueueMonitor();
  // }

  updateAccountStore('accountIsReady', true);

// ===========================================

  updateAccountProfile(pubkey);

// ===========================================

  checkMembershipStatus();

  // const bks = readBookmarks(pubkey);
  // updateAccountStore('bookmarks', () => [...bks]);
  // fetchBookmarks();

// ===============================================

  // let nwcActive = storage.nwcActive;
  // nwcActive && setActiveNWC(nwcActive);

// ===============================================

  // if (accountStore.followingSince < storage.followingSince) {
  //   updateAccountStore('following', () => ({ ...storage.following }));
  //   updateAccountStore('followingSince', () => storage.followingSince);
  // }

  // updateContactsList();
  // updateAccountStore('emojiHistory', () => readEmojiHistory(pubkey))

// ==================================================

  // if (accountStore.mutedSince < storage.mutedSince) {
  //   updateAccountStore('muted', () => ({ ...storage.muted }));
  //   updateAccountStore('mutedSince', () => storage.mutedSince);
  //   updateAccountStore('mutedPrivate', () => storage.mutedPrivate);
  // }

  // const mutelistId = `mutelist_${APP_ID}`;

  // handleSubscription(
  //   mutelistId,
  //   () => getProfileMuteList(pubkey, mutelistId),
  //   handleMuteListEvent,
  // );

// ==================================================

  // if (accountStore.mutedSince < storage.mutedSince) {
  //   updateAccountStore('streamMuted', () => ({ ...storage.streamMuted }));
  //   updateAccountStore('streamMutedSince', () => storage.streamMutedSince);
  //   updateAccountStore('streamMutedPrivate', () => storage.streamMutedPrivate);
  // }

  // const streamMuteListid = `streammutelist_${APP_ID}`;

  // handleSubscription(
  //   streamMuteListid,
  //   () => getReplacableEvent(pubkey, Kind.StreamMuteList, streamMuteListid),
  //   handleStreamMuteListEvent,
  // );

// ==================================================

  // getFilterLists(pubkey);
  // getAllowList(pubkey);

// ==================================================

  // fetchBookmarks();


// ==================================================

}

export const setSec = (sec: string | undefined, force?: boolean) => {
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
      setPublicKey(pubkey);
    }

    updateAccountStore('accountIsReady', () => true);

    // Read profile from storage

    // Fetch profile, maybe there is an update
  }

  logError('BAD SEC: ', sec);
  updateAccountStore('accountIsReady', () => false);
}

export const loadStoredPubkey = () => {
  const pubkey = readPubkeyFromStorage();

  if (!pubkey) return;

  setPublicKey(pubkey);
};

export const fetchNostrKey = () => {
  const storedKey = localStorage.getItem('pubkey');

  if (!storedKey) return undefined;

  setPublicKey(storedKey);

  // Read profile from storage
  const storedUser = readStoredProfile(storedKey);

  if (storedUser) {
    // If it exists, set it as active user
    updateAccountStore('metadata', () => ({...storedUser}));
  }

  const membershipStatus = readMembershipStatus(storedKey);

  if (membershipStatus) {
    updateAccountStore('membershipStatus', () => ({ ...membershipStatus }));
  }

  // Fetch it anyway, maybe there is an update
  updateAccountProfile(storedKey);

  return storedKey;

};

export const updateAccountProfile = (pubkey: string) => {
  if (pubkey !== accountStore.pubkey) return;

  const subId = `user_profile_${APP_ID}`;

  primalAPI({
    subId,
    action: () => getUserMetadata([pubkey], subId),
    onEvent: (content: NostrEventContent) => {

      if (content.kind === Kind.LegendCustomization) {
        const config = JSON.parse(content.content || '{}');

        updateAccountStore('legendConfig', () => config[pubkey]);

      }

      if (content.kind === Kind.Metadata) {
        updateAccountStore('metadata', () => content);
      }

    },
  });
};

// Blossom Servers --------------------------------------


export const fetchBlossomServers = (pubkey: string) => {
  return new Promise<string[]>((resolve) => {
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

        resolve(servers);
      }
    });
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
  return parseUserMetadata(accountStore.metadata, accountStore.legendConfig);
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

    const subIdMemStatus = `member_status_${APP_ID}`;

    let gotMemStatusEvent = false;

    const unsubMemStatus = subTo(memSocket, subIdMemStatus, (type, _, content) => {
      if (type === 'EVENT') {
        const status: MembershipStatus = JSON.parse(content?.content || '{}');

        gotMemStatusEvent = true;
        updateAccountStore('membershipStatus', () => ({ ...status }));
      }

      if (type === 'EOSE') {
        unsubMemStatus();
        if (gotMemStatusEvent && gotPremStatusEvent) {
          memSocket?.close();
        }

        if (!gotMemStatusEvent) {
          updateAccountStore('membershipStatus', () => ({ tier: 'none' }));
        }
      }
    });

    getMembershipStatus(accountStore.pubkey, subIdMemStatus, memSocket);

    const subIdPremStatus = `premium_status_${APP_ID}`;

    let gotPremStatusEvent = false;

    const unsubPremStatus = subTo(memSocket, subIdPremStatus, (type, _, content) => {
      if (type === 'EVENT') {
        const status: MembershipStatus = JSON.parse(content?.content || '{}');

        gotPremStatusEvent = true;
        updateAccountStore('premiumStatus', () => ({ ...status }));
      }

      if (type === 'EOSE') {
        unsubPremStatus();
        if (gotMemStatusEvent && gotPremStatusEvent) {
          memSocket?.close();
        }

        if (!gotPremStatusEvent) {
          updateAccountStore('premiumStatus', () => ({ tier: 'none' }));
        }
      }
    });

    getPremiumStatus(accountStore.pubkey, subIdPremStatus, memSocket);

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

