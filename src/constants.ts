export const THEMES = ['studio_dark', 'studio_light'];


export enum Kind  {
  Metadata = 0,
  Text = 1,
  RecommendRelay = 2,
  Contacts = 3,
  EncryptedDirectMessage = 4,
  EventDeletion = 5,
  Repost = 6,
  Reaction = 7,
  Image = 20,
  ChannelCreation = 40,
  ChannelMetadata = 41,
  ChannelMessage = 42,
  ChannelHideMessage = 43,
  ChannelMuteUser = 44,

  ReportContent = 1_984,

  Subscribe = 7_001,
  Unsubscribe = 7_002,
  Highlight = 9_802,
  Zap = 9_735,

  MuteList = 10_000,
  RelayList = 10_002,
  Bookmarks = 10_003,
  Blossom = 10_063,
  TierList = 17_000,

  CategorizedPeople = 30_000,
  LongForm = 30_023,
  Settings = 30_078,
  LiveEvent = 30_311,

  Draft = 31_234,
  DVM = 31_990,
  Tier = 37_001,

  ACK = 10_000_098,
  NoteStats = 10_000_100,
  NetStats = 10_000_101,
  LegendStats = 10_000_102,
  UserStats = 10_000_105,
  OldestEvent = 10_000_106,
  Mentions = 10_000_107,
  UserScore = 10_000_108,
  Notification = 10_000_110,
  Timestamp = 10_000_111,
  NotificationStats = 10_000_112,
  FeedRange = 10_000_113,
  NoteActions = 10_000_115,
  MessageStats = 10_000_117,
  MesagePerSenderStats = 10_000_118,
  MediaInfo = 10_000_119,
  Upload = 10_000_120,
  Uploaded = 10_000_121,
  Releases = 10_000_124,
  ImportResponse = 10_000_127,
  LinkMetadata = 10_000_128,
  EventZapInfo = 10_000_129,
  FilteringReason = 10_000_131,
  UserFollowerCounts = 10_000_133,
  SuggestedUsersByCategory = 10_000_134,
  UploadChunk = 10_000_135,
  UserRelays=10_000_139,
  RelayHint=10_000_141,
  NoteQuoteStats=10_000_143,
  WordCount=10_000_144,
  FeaturedAuthors=10_000_148,
  DVMFollowsActions=10_000_156,
  UserFollowerIncrease=10_000_157,
  VerifiedUsersDict=10_000_158,
  DVMMetadata=10_000_159,
  NoteTopicStat=10_000_160,
  MediaStats=10_000_163,
  MediaList=10_000_164,
  ContentStats=10_000_166,
  BroadcastStatus=10_000_167,
  LegendCustomization=10_000_168,
  MembershipCohortInfo = 10_000_169,
  LegendLeaderboard=10_000_170,
  PremiumLeaderboard=10_000_171,
  ArticlesStats=10_000_174,
  StudioNoteStats=10_000_905,

  WALLET_OPERATION = 10_000_300,
  WALLET_NWC_ACTIVE = 10_000_802,
  WALLET_NWC_CONNECTION = 10_000_803,
  ExchangeRate = 10_000_305,

  OrderHistory = 10_000_605,

  LongFormShell = 10_030_023,
}

export const FEED_LIMIT = 20;

export const profileRegex = /((nostr:)?(npub|nprofile)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/;
export const profileRegexG = /((nostr:)?(npub|nprofile)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/g;
export const noteRegex = /((nostr:)?(note|nevent)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/;
export const noteRegexG = /((nostr:)?(note|nevent)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/g;

export const pinEncodePrefix = 'prpec';
export const pinEncodeIVSeparator = '?iv=';

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 24 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const YEAR = 365 * DAY;


export const minKnownProfiles: {"names": Record<string,string>} = {
  "names": {
    "miljan": "d61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a",
    "marko": "123afae7d187ba36d6ddcd97dbf4acc59aeffe243f782592ff8f25ed579df306",
    "essguess": "0b13870379cf18ae6b6d516d9f0833e0273c7a6758652a698e11f04c9c1a0d29",
    "pr": "dd9b989dfe5e0840a92538f3e9f84f674e5f17ab05932efbacb4d8e6c905f302",
    "marija": "b8a518a60fab9f3969b62238860f4643003b6437b75d60860dd8de34fb21c931",
    "moysie": "2a55ed52ed31f85f8bdef3bdd165aa74265d82c952193d7b76fb4c76cccc4231",
    "nikola": "97b988fbf4f8880493f925711e1bd806617b508fd3d28312288507e42f8a3368",
    "princfilip": "29c07b40860f06df7c1ada6af2cc6b4c541b76a720542d7ee645c20c9452ffd2",
    "highlights": "9a500dccc084a138330a1d1b2be0d5e86394624325d25084d3eca164e7ea698a",
    "primal": "532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb",
    "andi": "5fd8c6a375c431729a3b78e2080ffff0a1dc63f52e2a868a801151190a31f955",
    "rockstar": "91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832",
    "qa": "88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079",
    "jack": "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
  }
};
