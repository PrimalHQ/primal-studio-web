import { type ReactiveMap } from '@solid-primitives/map';

export type EventRegistry = Record<string, NostrEventContent>;

export type EventStore = ReactiveMap<string, NostrEventContent>;

export type PrimalWindow = Window & typeof globalThis & {
  loadPrimalStores: () => void,
  primal?: any,
  onPrimalComponentMount?: (data: any) => void,
  onPrimalComponentCleanup?: (data: any) => void,
  onPrimalCacheServerConnected?: (url: string, ws: WebSocket | undefined) => void,
  onPrimalUploadServerConnected?: (url: string, ws: WebSocket | undefined) => void,
  onPrimalCacheServerMessageReceived?: (url: string, data: any) => void,
  onPrimalCacheServerMessageSent?: (url: string, data: any) => void,
  eventStore: EventStore,
};

export type NostrEventType = "EVENT" | "EOSE" | "NOTICE";

export type NostrEventContent = {
  kind: number,
  pubkey?: string,
  content?: string,
  created_at?: number,
  id: string,
  tags?: string[][],
};

export type NostrEvent = [
  type: "EVENT",
  subkey: string,
  content: NostrEventContent,
];

export type NostrEvents = [
  type: "EVENTS",
  subkey: string,
  content: NostrEventContent[],
];

export type NostrEOSE = [
  type: "EOSE",
  subkey: string,
];

export type NostrNotice = [
  type: "NOTICE",
  subkey: string,
  reason: string,
];

export type FeedPaging = {
  limit?: number,
  until?: number,
  since?: number,
  offset?: number,
}

export type FeedRange = {
  order_by: string,
  since: number,
  until: number,
  elements: string[],
};

export type FeedResult = {
  specification: string,
  mainEvents: string[],
  auxEvents: string[],
  range: FeedRange,
}

export type EventsResult = {
  mainEvents: string[],
  auxEvents: string[],
}

export type EventDisplayVariant = 'feed' | 'thread' | 'primary' | 'preview' | 'notification';

export type UserMetadata = {
  id: string,
  pubkey: string,
  name?: string,
  username?: string,
  about?: string,
  picture?: string,
  nip05?: string,
  banner?: string,
  display_name?: string,
  displayName?: string,
  lud06: string,
  lud16: string,
  website: string,
  tags: string[][],
  bot: boolean,
};

export type NostrRelayConfig = Record<string, { read: boolean, write: boolean }>;

export type NostrRelayEvent = {
  kind: number,
  content: any,
  created_at: number,
  tags: string[][],
};

export type NostrRelaySignedEvent = NostrRelayEvent & {
  id: string,
  pubkey: string,
  sig: string,
};

interface SendPaymentResponse {
  preimage: string;
}

export type NostrExtension = {
  getPublicKey: () => Promise<string>,
  getRelays: () => Promise<NostrRelayConfig>,
  signEvent: (event: NostrRelayEvent) => Promise<NostrRelaySignedEvent>,
  nip04: {
    encrypt: (pubkey: string, message: string) => Promise<string>,
    decrypt: (pubkey: string, message: string) => Promise<string>,
  },
};

export type WebLnExtension = {
  enable: () => Promise<void>,
  sendPayment: (req: string) => Promise<SendPaymentResponse>;
};

export type NostrWindow = Window & typeof globalThis & {
  nostr?: NostrExtension,
  webln?: WebLnExtension,
  walletStore: any,
};

export type UserStats = {
  pubkey: string,
  follows_count: number,
  followers_count: number,
  note_count: number,
  reply_count: number,
  time_joined: number,
  total_zap_count: number,
  total_satszapped: number,
  relay_count: number,
  media_count: number,
  long_form_note_count?: number,
  followers_increase?: {
    increase: number,
    ratio: number,
    count: number,
  },
};

export type PrimalUser = {
  id: string,
  pubkey: string,
  npub: string,
  name: string,
  about: string,
  picture: string,
  nip05: string,
  banner: string,
  displayName: string,
  location: string,
  lud06: string,
  lud16: string,
  website: string,
  tags: string[][],
  userStats?: UserStats,
  event: NostrEventContent,
};

export type UserMetadataContent = {
  name?: string,
  about?: string,
  picture?: string,
  displayName?: string,
  display_name?: string,
  website?: string,
  lud06?: string,
  lud16?: string,
  nip05?: string,
  banner?: string
  bot?: string,
  birthday?: string,
  location?: string,
}

export type PrimalTheme = 'sunrise' | 'sunset' | 'midnight' | 'ice';
