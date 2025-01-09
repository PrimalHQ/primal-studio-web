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
  offset?: number | number[],
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
