import { unwrap } from "solid-js/store";
import { accountStore, dequeUnsignedEvent, enqueUnsignedEvent, logout, refreshQueue } from "src/stores/AccountStore";
import {
  NostrExtension,
  NostrRelayConfig,
  NostrRelayEvent,
  NostrRelays,
  NostrRelaySignedEvent,
  NostrWindow,
  SendPaymentResponse,
  WebLnExtension,
 } from "src/primal";
import { PrimalNip46 } from "src/utils/primalNip46";
import { PrimalNostr } from "src/utils/primalNostr";
import { uuidv4 } from "./kyes";
import { closeConfirmDialog, closeSignerUnreachableDialog, openConfirmDialog, openSignerUnreachableDialog } from "src/stores/AppStore";


type QueueItem = {
  action: () => Promise<any>,
  resolve: (result: any) => void,
  reject: (reason: any) => void,
};

export class Queue {
  #items: QueueItem[];
  #pendingPromise: boolean;

  constructor() {
    this.#items = [];
    this.#pendingPromise = false;
  }

  enqueue<T>(action: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        this.#items.push({ action, resolve, reject });
        this.dequeue();
      }, 0)
    });
  }

  async dequeue() {
    if (this.#pendingPromise) return false;

    let item = this.#items.shift();

    if (!item) return false;

    try {
      this.#pendingPromise = true;

      let payload = await item.action();

      this.#pendingPromise = false;
      item.resolve(payload);
    } catch (e) {
      this.#pendingPromise = false;
      item.reject(e);
    } finally {
      this.dequeue();
    }

    return true;
  }

  abortCurrent() {
    return this.#items.shift();
  }

  get size() {
    return this.#items.length;
  }
}

const eventQueue = new Queue();

const enqueueWebLn = async <T>(action: (webln: WebLnExtension) => Promise<T>) => {
  const win = window as NostrWindow;
  const webln = win.webln;

  if (webln === undefined) {
    throw('no_webln_extension');
  }

  return await eventQueue.enqueue<T>(() => action(webln));
}

const enqueueNostr = async <T>(action: (nostr: NostrExtension) => Promise<T>) => {
  const loginType = accountStore.loginType;

  if (['none', 'guest', 'npub'].includes(loginType)) throw('no_login');


  let nostr: NostrExtension | undefined;

  if (loginType === 'extension') {
    const win = window as NostrWindow;
    nostr = win.nostr;

    if (nostr === undefined) {
      throw('no_nostr_extension');
    }
  }

  if (loginType === 'local') {
    nostr = PrimalNostr();

    if (nostr === undefined) {
      throw('no_nostr_local');
    }
  }

  if (loginType === 'nip46') {
    nostr = PrimalNip46();

    if (nostr === undefined) {
      throw('no_nostr_nip46');
    }
  }

  if (nostr === undefined) {
    throw('unknown_login');
  }

  return await eventQueue.enqueue<T>(() => action(nostr));
}

export const SIGN_TIMEOUT = 12_000;

export const timeoutPromise = (timeout = 8_000) => {
  return new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject('promise_timeout');
    }, timeout);
  });
}

export const timeoutPromiseResolve = (timeout = 8_000) => {
  return new Promise<undefined>((resolve, reject) => {
    setTimeout(() => {
      resolve(undefined);
    }, timeout);
  });
}

export const handleSignerFailure = (reason: any) => {
  if (reason === 'promise_timeout' && accountStore.loginType === 'nip46') {
    openSignerUnreachableDialog({
      title: 'Remote signer unreachable',
      description: 'Primal Studio can\'t reach the remote signer. Please make sure your signer is online and the Primal Studio session is active',
      confirmLabel: 'Retry',
      onConfirm: () => {
        refreshQueue();
        closeSignerUnreachableDialog();
      },
      abortLabel: 'Log out',
      onAbort: () => {
        logout();
        closeSignerUnreachableDialog();
      }
    });
  }

  if (reason === 'promise_timeout' && accountStore.loginType === 'extension') {
    openConfirmDialog({
      title: 'Cant find a nostr extension',
      description: 'Primal Studio was unable to find an active nostr extension. Please make sure an extension is available and active',
      confirmLabel: 'Retry',
      onConfirm: () => {
        refreshQueue();
        closeConfirmDialog();
      },
      abortLabel: 'Log out',
      onAbort: () => {
        logout();
        closeConfirmDialog();
      }
    });
  }
}

export const signEvent = async (event: NostrRelayEvent) => {
  const tempId = event.id || `${uuidv4()}`;
  try {
    return await enqueueNostr<NostrRelaySignedEvent>(async (nostr) => {
      try {
        const signed = await Promise.race([
          nostr.signEvent(unwrap(event)),
          timeoutPromise(),
        ]) as NostrRelaySignedEvent;
        // const signed = await nostr.signEvent(event);
        dequeUnsignedEvent(unwrap(event), tempId);
        closeSignerUnreachableDialog();
        return signed;
      } catch(reason) {
        throw(reason);
      }
    })
  } catch (reason: any) {
    eventQueue.abortCurrent();

    if (reason === 'user rejected' || reason?.message?.includes('denied') || reason?.message?.includes('reject')) {
      dequeUnsignedEvent(unwrap(event), tempId);
      throw(reason);
    }
    enqueUnsignedEvent(unwrap(event), tempId);

    handleSignerFailure(reason);

    throw(reason);
  }
};

export const getPublicKey = async () => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await Promise.race([
          nostr.getPublicKey(),
          timeoutPromise(),
        ]) as string;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const getRelays = async () => {
  try {
    return await enqueueNostr<NostrRelays>(async (nostr) => {
       try {
        return await Promise.race([
          nostr.getRelays(),
          timeoutPromise(),
        ]) as NostrRelayConfig;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const encrypt = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await Promise.race([
          nostr.nip04.encrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const decrypt = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await Promise.race([
          nostr.nip04.decrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};


export const encrypt44 = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await Promise.race([
          nostr.nip44.encrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const decrypt44 = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await Promise.race([
          nostr.nip44.decrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const enableWebLn = async () => {
  try {
    return await enqueueWebLn<void>(async (webln) => {
      try {
        return await Promise.race([
          webln.enable(),
          timeoutPromise(),
        ]) as void;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const sendPayment = async (paymentRequest: string) => {
  try {
    return await enqueueWebLn<SendPaymentResponse>(async (webln) => {
      try {
        return await Promise.race([
          webln.sendPayment(paymentRequest),
          timeoutPromise(),
        ]) as SendPaymentResponse;
      } catch(reason) {
        handleSignerFailure(reason);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};
