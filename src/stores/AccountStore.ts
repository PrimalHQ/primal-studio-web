import { createStore } from "solid-js/store";
import { NostrWindow } from "../primal";
import { logError, logInfo } from "../utils/logger";
import { readSecFromStorage } from "../utils/localStore";
import { pinEncodePrefix } from "../constants";

import { getPublicKey, nip19 } from "../utils/nTools";
import { getPublicKey as getNostrPublicKey } from "../utils/nostrApi";

export const PRIMAL_PUBKEY = '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';

export type AccountStore = {
  pubkey: string;
  sec: string | undefined,
}

export const [accountStore, updateAccountStore] = createStore<AccountStore>({
  pubkey: PRIMAL_PUBKEY,
  sec: undefined,
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

export const fetchNostrKey = async () => {

  const storedKey = localStorage.getItem('pubkey');

  if (storedKey) {
    updateAccountStore('pubkey', storedKey);

    // Read profile from storage
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
    localStorage.setItem('pubkey', key);

    // Read profile from storage

    // Fetch it anyway, maybe there is an update
  } catch (e: any) {
    updateAccountStore('pubkey', () => PRIMAL_PUBKEY);
    localStorage.removeItem('pubkey');
    logError('error fetching public key: ', e);
  }
}
