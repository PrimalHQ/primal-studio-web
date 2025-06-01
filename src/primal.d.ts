import { type ReactiveMap } from '@solid-primitives/map';
import { PageStore } from './stores/PageStore';
import { AccountStore } from './stores/AccountStore';
import { MediaStore } from './stores/MediaStore';
import { AppStore } from './stores/AppStore';
import { RelayStore } from './stores/RelayStore';
import { SettingsStore } from './stores/SettingsStore';

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
  pageStore: PageStore,
  accountStore: AccountStore,
  mediaStore: MediaStore,
  appStore: AppStore,
  relayStore: RelayStore,
  settingsStore: SettingsStore,
};

export type NostrEventType = "EVENT" | "EOSE" | "NOTICE";

export type NostrEventContent = {
  kind: number,
  pubkey?: string,
  content?: string,
  created_at?: number,
  sig?: string,
  id: string,
  tags?: string[][],
};

export type NostrAuxEventContent = {
  event_id: string,
  [key: string]: any,
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

export type AuxEvent = {
  kind: number,
  main_event_id: string,
  id: string,
}

export type FeedResult = {
  specification: string,
  mainEvents: string[],
  auxEvents: string[],
  range: FeedRange,
}

export type EventsResult = {
  mainEvents: string[],
  auxEvents: string[],
  mediaEvents: string[],
}

export type EventCoordinate = { pubkey: string, identifier: string, kind: number };

export type MediaSize = 'o' | 's' | 'm' | 'l';

export type MediaVariant = {
  s: MediaSize,
  a: 0 | 1,
  w: number,
  h: number,
  mt: string,
  media_url: string,
  dur?: number,
}

export type MediaEvent = {
  event_id: string,
  resources: { url: string, variants: MediaVariant[] }[],
  thumbnails?: Record<string, string>,
}

export type EventDisplayVariant = 'feed' | 'thread' | 'primary' | 'preview' | 'notification' | 'suggestion';

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
  nip44: {
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

export type EventStats = {
  event_id: string,
  likes: number,
  mentions: number,
  reposts: number,
  replies: number,
  zaps: number,
  satszapped: number,
  score: number,
  score24h: number,
  bookmarks: number,
};

export type NoteActions = {
  event_id: string,
  liked: boolean,
  replied: boolean,
  reposted: boolean,
  zapped: boolean,
};

export type TopicStats = Record<string, number>;

export type TopZap = {
  id: string,
  amount: number,
  pubkey: string,
  message: string,
  eventId: string,
}

export type FollowerIncrease = {
  increase: number,
  ratio: number,
  count: number,
}

export type SenderMessageCount = {
  cnt: number,
  latest_at: number,
  latest_event_id: string,
}

export type CohortInfo = {
  cohort_1: string,
  cohort_2: string,
  tier: string,
  expires_on: number,
  edited_shoutout?: string,
  legend_since?: number,
  premium_since?: number,
};

export type LegendCustomizationStyle = '' |
  'GOLD' |
  'AQUA' |
  'SILVER' |
  'PURPLE' |
  'PURPLEHAZE' |
  'TEAL' |
  'BROWN' |
  'BLUE' |
  'SUNFIRE';

export type LegendCustomizationConfig = {
  style: LegendCustomizationStyle,
  custom_badge: boolean,
  avatar_glow: boolean,
  in_leaderboard: boolean,
  current_shoutout?: string,
  edited_shoutout?: string,
};

export type LeaderboardInfo = {
  index: number,
  pubkey: string,
  donated_btc: number,
  last_donation: number,
  premium_since: number,
}

export type StudioNoteStats = {
  satszapped: number,
  score: number,
  sentiment: 'positive' | 'negative' | 'neutral',
}

export type EventFeedPage = {
  users: {
    [pubkey: string]: NostrEventContent,
  },
  eventIds: string[],
  notes: NostrEventContent[],
  reads: NostrEventContent[],
  drafts: NostrEventContent[],
  mentions: NostrEventContent[],
  noteStats: Record<string, EventStats>,
  zaps: NostrEventContent[],
  topicStats: TopicStats,
  noteActions: Record<string, NoteActions>,
  relayHints: Record<string, string>,
  topZaps: Record<string, TopZap[]>,
  since: number,
  until: number,
  sortBy: string,
  elements: string[],
  userStats: Record<string, UserStats>,
  userFollowerCounts: Record<string, number>,
  userFollowerIncrease: Record<string, FollowerIncrease>,
  wordCount: Record<string, number>,
  dmContacts: Record<string, SenderMessageCount>,
  encryptedMessages: NostrEventContent[],
  memberCohortInfo: Record<string, CohortInfo>,
  legendCustomization: Record<string, LegendCustomizationConfig>,
  leaderboard: LeaderboardInfo[],
  studioNoteStats: Record<string, StudioNoteStats>,
};

export type PaginationInfo = {
  since: number,
  until: number,
  sortBy: string,
  offset: number,
  elements: string[],
};

export type EventFeedResult = {
  eventIds: string[],
  users: PrimalUser[],
  notes: PrimalNote[],
  reads: PrimalArticle[],
  drafts: PrimalDraft[],
  zaps: PrimalZap[],
  topicStats: [string, number][],
  dmContacts: DMContact[],
  paging: PaginationInfo,
  page: EventFeedPage,
  encryptedMessages: NostrEventContent[],
  legendCustomization: Record<string, LegendCustomizationConfig>,
  memberCohortInfo: Record<string, CohortInfo>,
  leaderboard: LeaderboardInfo[],
  identifier: string,
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
  event?: NostrEventContent,
};

export type PrimalNote = {
  user: PrimalUser,
  repost?: PrimalRepost,
  event?: NostrEventContent,
  mentionedNotes?: Record<string, PrimalNote>,
  mentionedUsers?: Record<string, PrimalUser>,
  mentionedArticles?: Record<string, PrimalNote>,
  mentionedZaps?: Record<string, PrimalZap>,
  mentionedHighlights?: Record<string, any>,
  replyTo?: string,
  id: string,
  pubkey: string,
  sig?: string,
  kind: number,
  nId: string,
  nIdShort: string,
  tags: string[][],
  topZaps: TopZap[],
  content: string,
  relayHints?: Record<string, string>,
  stats: EventStats,
  studioStats: StudioNoteStats,
  actions: NoteActions,
  wordCount?: number,
  created_at: number,
};

export type PrimalArticle = PrimalNote & {
  title: string,
  summary: string,
  image: string,
  keywords: string[],
  published_at: number,
  coordinate: string,
  client?: string,
};

export type PrimalDraft = {
  id: string,
  kind: number,
  contentKind: number,
  content: string,
  plain: string,
  client: string,
  pubkey: string,
  created_at: number,
  tags: string[][],
  draftedEvent?: NostrEventContent,
  event?: NostrEventContent,
  nId: string,
  nIdShort: string,
  sender: PrimalUser,
  receiver: PrimalUser,
}

export type PrimalZap = {
  sender?: PrimalUser | string,
  reciver?: PrimalUser | string,
  created_at?: number,
  amount: number,
  message: string,
  id: string,
  zappedId?: string,
  zappedKind?: number,
};

export type PrimalRepost = {
  user?: PrimalUser,
  note?: PrimalNote,
};

export type PrimalHighlight = {
  user?: PrimalUser,
  event?: NostrEventContent,
};

export type DMContact = {
  pubkey: string,
  user: PrimalUser,
  dmInfo: SenderMessageCount,
}

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

export type PrimalTheme = 'studio_light' | 'studio_dark';

export type NostrRelaySettings = Record<string, { read: boolean, write: boolean }>;

export type SendNoteResult = {
  success: boolean,
  reasons?: string[],
  note?: NostrRelaySignedEvent,
};

export type VanityProfiles = { names: Record<string, string> };


export type NoteReactionsState = {
  bookmarks?: number,
  likes: number,
  liked: boolean,
  reposts: number,
  reposted: boolean,
  replies: number,
  replied: boolean,
  zapCount: number,
  satsZapped: number,
  zappedAmount: number,
  zapped: boolean,
  zappedNow: boolean,
  isZapping: boolean,
  showZapAnim: boolean,
  hideZapIcon: boolean,
  moreZapsAvailable: boolean,
  isRepostMenuVisible: boolean,
  topZaps: TopZap[],
  topZapsFeed: TopZap[],
  quoteCount: number,
};
