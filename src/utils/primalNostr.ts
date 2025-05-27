import {
  generatePrivateKey,
  getPublicKey,
  nip04,
  nip19,
  finalizeEvent,
  verifyEvent,
  generateNsec,
} from './nTools';
import {
  NostrExtension,
  NostrRelayEvent,
  NostrRelayConfig,
  NostrRelaySignedEvent,
} from '../primal';
import { readSecFromStorage } from './localStore';
import { base64 } from '@scure/base';
import { Kind, pinEncodeIVSeparator, pinEncodePrefix } from '../constants';
import { createSignal } from 'solid-js';
import { logError } from './logger';
import { signEvent } from './nostrApi';


export const [currentPin, setCurrentPin] = createSignal('');

export const [tempNsec, setTempNsec] = createSignal<string | undefined>();

export const generateKeys = () => {
  const sec = generatePrivateKey();
  const pubkey = getPublicKey(sec);

  return { sec, pubkey };
};

export const encryptWithPin = async (pin: string, text: string) => {
  try {
    const crypto = window.crypto;

    if (!crypto) {
      throw('not-secure-env');
    }

    const utf8Encoder = new TextEncoder();

    const key = await crypto.subtle.digest('SHA-256', utf8Encoder.encode(pin));

    let iv = Uint8Array.from(crypto.getRandomValues(new Uint8Array(16)));
    let plaintext = utf8Encoder.encode(text)
    let cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['encrypt'])
    let ciphertext = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, plaintext)
    let ctb64 = base64.encode(new Uint8Array(ciphertext))
    let ivb64 = base64.encode(new Uint8Array(iv.buffer))

    return `${pinEncodePrefix}${ctb64}${pinEncodeIVSeparator}${ivb64}`
  } catch(e) {
    logError('Failed to encrypt with PIN: ', e);
    return '';
  }
};

export const decryptWithPin = async (pin: string, cipher: string) => {
  try {
    if (!cipher.startsWith(pinEncodePrefix)) {
      throw('bad-cipher');
    }

    const crypto = window.crypto;

    if (!crypto) {
      throw('not-secure-env');
    }
    const utf8Encoder = new TextEncoder();
    const utf8Decoder = new TextDecoder('utf-8');

    const data = cipher.slice(pinEncodePrefix.length);
    const key = await crypto.subtle.digest('SHA-256', utf8Encoder.encode(pin));

    let [ctb64, ivb64] = data.split(pinEncodeIVSeparator)

    let cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt'])
    let ciphertext = base64.decode(ctb64)
    let iv = base64.decode(ivb64)

    let plaintext = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ciphertext)

    let text = utf8Decoder.decode(plaintext)
    return text
  } catch(e) {
    logError('Failed to decrypt with PIN: ', e);
    return '';
  }
};

export const PrimalNostr: (pk?: string) => NostrExtension = (pk?: string) => {

  const getSec = async () => {
    let sec: string = pk || readSecFromStorage() || tempNsec() || generateNsec();

    if (sec.startsWith(pinEncodePrefix)) {
      sec = await decryptWithPin(currentPin(), sec);
    }

    const decoded = nip19.decode(sec);

    if (decoded.type !== 'nsec' || !decoded.data) {
      throw('invalid-nsec');
    }

    const secArray = decoded.data;

    return secArray.length > 0 ? secArray : undefined;
  }

  const gPk: () => Promise<string> = async () => {
    const sec = await getSec();
    if (!sec) throw('pubkey-no-nsec');

    return getPublicKey(sec);
  };

  const gRl: () => Promise<NostrRelayConfig> = () => new Promise<NostrRelayConfig>((resolve) => {resolve({})});

  const encrypt: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      const sec = await getSec();
      if (!sec) throw('encrypt-no-nsec');

      return await nip04.encrypt(sec, pubkey, message);
    };

  const decrypt: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      const sec = await getSec();
      if (!sec) throw('decrypt-no-nsec');

      return await nip04.decrypt(sec, pubkey, message);
    };

  const signEvent = async (event: NostrRelayEvent) => {
    const sec = await getSec();
    if (!sec) throw('sign-no-nsec');

    let evt = finalizeEvent({ ...event }, sec);

    const isVerified = verifyEvent(evt);
    if (!isVerified) throw('event-sig-not-verified');

    return evt as NostrRelaySignedEvent;
  };

  return {
    getPublicKey: gPk,
    getRelays: gRl,
    nip04: {
      encrypt,
      decrypt,
    },
    signEvent,
  };
};


export const userSignedEvent = async (content: string, opts?: {
  kind?: Kind,
  tags?: string[][],
  created_at?: number,
}) => {
  try {
    const event = {
      kind: opts?.kind || Kind.Settings,
      tags: opts?.tags || [],
      created_at: opts?.created_at || Math.floor((new Date()).getTime() / 1000),
      content,
    };

    return await signEvent(event);

  } catch (e) {
    return;
  }
}
