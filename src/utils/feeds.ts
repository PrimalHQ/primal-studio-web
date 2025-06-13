import DOMPurify from "dompurify";
import { Kind } from "src/constants";
import { NostrEventContent, FeedRange, EventFeedPage, PrimalRepost, PrimalNote, PrimalUser, PrimalHighlight, PrimalArticle, PrimalZap, PrimalDraft, DMContact, TopZap, LegendCustomizationConfig, CohortInfo, EventFeedResult, LeaderboardInfo, PaginationInfo, UserStats } from "src/primal";
import { parseLinkPreviews } from "src/stores/LinkPreviewStore";
import { logError } from "./logger";
import { hexToNpub } from "./profile";
import { parseBolt11 } from "./zaps";
import { nip19 } from "./nTools";
import { v4 as uuidv4 } from 'uuid';
import { mentionStore } from "src/stores/MentionStore";

export const noActions = (id: string) => ({
  event_id: id,
  liked: false,
  replied: false,
  reposted: false,
  zapped: false,
});

export const parseRepost = (message: NostrEventContent, defaultKind = 1) => {
  try {
    return JSON.parse(message.content || '{}') as NostrEventContent;
  } catch (e) {
    return {
      kind: defaultKind,
      content: '',
      id: message.id,
      created_at: message.created_at,
      pubkey: message.pubkey,
      sig: message.sig,
      tags: message.tags,
    } as NostrEventContent;
  }
};

export const encodeCoordinate = (event: NostrEventContent, forceKind?: Kind) => {

  const identifier = ((event.tags || []).find(t => t[0] === 'd') || [])[1];
  const pubkey = event.pubkey || 'no-pubkey';
  const kind = forceKind || event.kind;

  const coordinate =  `${kind}:${pubkey}:${identifier}`;

  const naddr = nip19.naddrEncode({ kind, pubkey, identifier });

  return { coordinate, naddr };
}

export const emptyFeedRange = () => ({
  since: 0,
  until: 0,
  order_by: 'created_at',
  elements: [],
}) as FeedRange;


export const emptyStats = () => ({
  pubkey: '',
  follows_count: 0,
  followers_count: 0,
  note_count: 0,
  reply_count: 0,
  time_joined: 0,
  total_zap_count: 0,
  total_satszapped: 0,
  relay_count: 0,
  media_count: 0,
});

export const emptyEventFeedPage: () => EventFeedPage = () => ({
  eventIds: [],
  users: {},
  notes: [],
  reads: [],
  drafts: [],
  zaps: [],
  mentions: [],
  topicStats: {},
  noteStats: {},
  noteActions: {},
  relayHints: {},
  topZaps: {},
  wordCount: {},
  userStats: {},
  userFollowerCounts: {},
  userFollowerIncrease: {},
  since: 0,
  until: 0,
  sortBy: 'created_at',
  elements: [],
  dmContacts: {},
  encryptedMessages: [],
  legendCustomization: {},
  memberCohortInfo: {},
  leaderboard: [],
  studioNoteStats: {},
});

export const emptyPaging = (): PaginationInfo => ({
  since: 0,
  until: 0,
  sortBy: 'created_at',
  offset: 0,
  elements: [],
});

export const emptyEventFeedResults = () => ({
  users: [],
  notes: [],
  reads: [],
  drafts: [],
  zaps: [],
  topicStats: [],
  dmContacts: [],
  paging: { ...emptyPaging() },
  page: { ...emptyEventFeedPage() },
  encryptedMessages: [],
  legendCustomization: {},
  memberCohortInfo: {},
  leaderboard: [],
});

export const isRepostInCollection = (collection: NostrEventContent[], repost: NostrEventContent) => {

  const otherTags = collection.reduce((acc: string[][], m) => {
    if (m.kind !== Kind.Repost) return acc;

    const t = (m.tags || []).find(t => t[0] === 'e');

    return t ? [...acc, t] : acc;
  }, []);

  if (repost.kind === Kind.Repost) {
    const tag = (repost.tags || []).find(t => t[0] === 'e');

    return tag && !!otherTags.find(t => t[1] === tag[1]);
  }

  if (repost.kind === Kind.Text) {
    const id = repost.id;

    return !!otherTags.find(t => t[1] === id);
  }

  return false;

};

export const parseEmptyReposts = (page: EventFeedPage) => {
  let reposts: Record<string, string> = {};

  page.notes.forEach(message => {
    if (message.kind === Kind.Repost && (message.content || '').length === 0) {
      const tag = (message.tags || []).find(t => t[0] === 'e');
      if (tag) {
        reposts[tag[1]] = message.id;
      }
    }
  });

  return reposts;
};

export const extractRepostInfo = (page: EventFeedPage, message: NostrEventContent): PrimalRepost => {

  return {
    user: getUserInPage(page, message.pubkey!),
    note: getNoteInPage(page, message.id),
  };
};

export const extractReplyToFromTags = (tags: string[][]) => {
  let replyTo: string[] = [];

  // Determine parent by finding the `e` tag with `reply` then `root` as `marker`
  // If both fail return the last `e` tag
  for (let i=0; i<tags.length; i++) {
    const tag = tags[i];

    if (!['e', 'a'].includes(tag[0])) continue;

    if (tag[3] === 'mention') continue;

    if (tag[3] === 'reply') {
      replyTo = [...tag];
      break;
    }

    if (tag[3] === 'root') {
      replyTo = [...tag];
      continue;
    }
  }

  if (!replyTo) {
    const eTags = tags.filter(t => t[0] === 'e' && t[3] !== 'mention');
    const aTags = tags.filter(t => t[0] === 'a' && t[3] !== 'mention');

    if (eTags.length === 1) {
      replyTo = [...eTags[0]];
    }
    else if (eTags.length > 1){
      replyTo = [...aTags[aTags.length - 1]];
    }
    else if (eTags.length > 1){
      replyTo = [...eTags[eTags.length - 1]];
    }
  }

  return replyTo;
}

export const extractMentions = (page: EventFeedPage, note: NostrEventContent) => {

  const mentionPubkeys = (note.tags || []).reduce((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);
  const wordCounts = page.wordCount || {};
  const topZaps = page.topZaps[note.id] || [];

  const pageUsers = getUsersInPage(page);

  let mentionedNotes: Record<string, PrimalNote> = {};
  let mentionedUsers: Record<string, PrimalUser> = {};
  let mentionedHighlights: Record<string, PrimalHighlight> = {};
  let mentionedArticles: Record<string, PrimalArticle> = {};
  let mentionedZaps: Record<string, PrimalZap> = {};

  for (let i=0; i<page.mentions.length; i++) {
    const mentionEvent = page.mentions[i];

    if ([Kind.Text].includes(mentionEvent.kind)) {
      const mention = getNoteInPage(page, mentionEvent, true);

      if (mention) mentionedNotes[mention.id] = { ...mention };
    }

    if ([Kind.LongForm, Kind.LongFormShell].includes(mentionEvent.kind)) {

      const mention = getArticleInPage(page, mentionEvent, true);

      if (mention) mentionedArticles[mention.id] = { ...mention };
    }

    if ([Kind.Highlight].includes(mentionEvent.kind)) {
      mentionedHighlights[mentionEvent.id] = {
        user: getUserInPage(page, mentionEvent.pubkey!),
        event: { ...mentionEvent },
      }
    }

    if ([Kind.Zap].includes(mentionEvent.kind)) {
      const mention = getZapInPage(page, mentionEvent);

      if (mention) mentionedZaps[mentionEvent.id] = { ...mention };
    }
  }

  if (mentionPubkeys && mentionPubkeys.length > 0) {
    for (let i = 0;i<mentionPubkeys.length;i++) {
      const pubkey = mentionPubkeys[i];
      const user = pageUsers.find(u => u.pubkey === pubkey);

      if (user) mentionedUsers[pubkey] = { ...user };
    }
  }

  // include senders of top zaps into mentioned users
  for(let i=0; i<topZaps.length; i++) {
    const topZap = topZaps[i];
    const pubkey = topZap.pubkey;

    if (mentionedUsers[pubkey]) continue;

    const user = pageUsers.find(u => u.pubkey === pubkey);

    if (user) mentionedUsers[topZap.pubkey] = { ...user };
  }

  return {
    mentionedNotes,
    mentionedArticles,
    mentionedUsers,
    mentionedHighlights,
    mentionedZaps,
  };
}

export const userStatsInPage = (page: EventFeedPage, pubkey: string) => {

  let stats = { ...(page.userStats || {}) };

  if (stats[pubkey]) {
    stats[pubkey].followers_count = page.userFollowerCounts[pubkey];
    stats[pubkey].followers_increase = page.userFollowerIncrease[pubkey];
  } else {
    stats[pubkey] = {
      pubkey: pubkey,
      followers_count: page.userFollowerCounts[pubkey] || 0,
      follows_count: 0,
      note_count: 0,
      reply_count: 0,
      time_joined: 0,
      total_zap_count: 0,
      total_satszapped: 0,
      relay_count: 0,
      media_count: 0,
      long_form_note_count: 0,
      followers_increase: page.userFollowerIncrease[pubkey],
    }
  }

  return stats;
}

export const getUsersInPage = (page: EventFeedPage) => {

  if (page === undefined) {
    return [];
  }

  const pubkeys = Object.keys(page.users);

  let users: PrimalUser[] = [];

  for (let i=0; i<pubkeys.length; i++) {
    users.push(getUserInPage(page, pubkeys[i]));
  }

  return users;
};

export const convertToUser = (user: NostrEventContent, pubkey: string, stats?: Record<string, UserStats>) => {
  if (!user) return emptyUser(pubkey);

  let userMeta: any = {};

  try {
    userMeta = JSON.parse(user.content || '{}');
  } catch (e) {
    logError('Error in user meta JSON: ', e);
    userMeta = {};
  }

  return {
    id: user.id,
    pubkey: user.pubkey,
    npub: hexToNpub(user.pubkey),
    name: (userMeta.name || '') as string,
    about: (userMeta.about || '') as string,
    picture: (userMeta.picture || '') as string,
    nip05: (userMeta.nip05 || '') as string,
    banner: (userMeta.banner || '') as string,
    displayName: (userMeta.display_name || '') as string,
    location: (userMeta.location || '') as string,
    lud06: (userMeta.lud06 || '') as string,
    lud16: (userMeta.lud16 || '') as string,
    website: (userMeta.website || '') as string,
    tags: user.tags,
    userStats: stats && user.pubkey ? { ...stats[user.pubkey] } : undefined,
  } as PrimalUser;
}

export const getUserInPage = (page: EventFeedPage, pubkey: string) => {
  const user = page.users[pubkey];
  const stats = userStatsInPage(page, pubkey);

  if (!user) {
    return emptyUser(pubkey);
  }

  let userMeta: any = {};

  try {
    userMeta = JSON.parse(user.content || '{}');
  } catch (e) {
    logError('Error in user meta JSON: ', e);
    userMeta = {};
  }

  return {
    id: user.id,
    pubkey: user.pubkey,
    npub: hexToNpub(user.pubkey),
    name: (userMeta.name || '') as string,
    about: (userMeta.about || '') as string,
    picture: (userMeta.picture || '') as string,
    nip05: (userMeta.nip05 || '') as string,
    banner: (userMeta.banner || '') as string,
    displayName: (userMeta.display_name || '') as string,
    location: (userMeta.location || '') as string,
    lud06: (userMeta.lud06 || '') as string,
    lud16: (userMeta.lud16 || '') as string,
    website: (userMeta.website || '') as string,
    tags: user.tags,
    userStats: stats ? { ...stats[user.pubkey!] } : undefined,
    event: { ...user },
  } as PrimalUser;
}

export const emptyUser = (pubkey: string) => {
  return {
    id: '',
    pubkey,
    npub: hexToNpub(pubkey),
    name: '',
    about: '',
    picture: '',
    nip05: '',
    banner: '',
    displayName: '',
    location: '',
    lud06: '',
    lud16: '',
    website: '',
    tags: [],
  } as PrimalUser;
};

export const getNotesInPage = (page: EventFeedPage) => {

  if (page === undefined) {
    return [];
  }

  let i = 0;

  let notes: PrimalNote[] = [];

  for (i=0;i<page.notes.length;i++) {
    const pageNote = page.notes[i];
    const newNote = getNoteInPage(page, pageNote);

    if (!newNote) continue;

    notes.push(newNote);
  }
  return notes;
};

export const emptyMentions = () => ({
  mentionedNotes: {},
  mentionedArticles: {},
  mentionedUsers: {},
  mentionedHighlights: {},
  mentionedZaps: {},
})

export const getNoteInPage = (
  page: EventFeedPage,
  eventOrId: string | NostrEventContent,
  ignoreMentions?: boolean,
) => {

  const pageNote = typeof eventOrId === 'string' ?
    page.notes.find(n => n.id === eventOrId) :
    eventOrId;

  if (!pageNote) return;

  // If this is a repost, parse it for the originsl note.
  const note = pageNote.kind === Kind.Repost ? parseRepost(pageNote) : pageNote;

  // if this is a repost extract repost info
  const repost = pageNote.kind === Kind.Repost ? extractRepostInfo(page, pageNote) : undefined;

  const author = getUserInPage(page, note.pubkey!);
  const stat = page.noteStats[note.id];
  const topZaps = page.topZaps[note.id] || [];
  const studioStats = page.studioNoteStats[note.id];

  const tags = note.tags || [];
  const replyTo = extractReplyToFromTags(tags);

  // Parse mentions
  let {
    mentionedNotes,
    mentionedArticles,
    mentionedUsers,
    mentionedHighlights,
    mentionedZaps,
  } = ignoreMentions ? emptyMentions() : extractMentions(page, note);

  const eventPointer: nip19.EventPointer = {
    id: note.id,
    author: note.pubkey,
    kind: note.kind,
    relays: tags.reduce((acc, t) => t[0] === 'r' && (t[1].startsWith('wss://' ) || t[1].startsWith('ws://')) ? [...acc, t[1]] : acc, []).slice(0, 2),
  };

  const eventPointerShort: nip19.EventPointer = {
    id: note.id,
  };

  return {
    user: author,
    stats: { ...stat },
    studioStats: { ...studioStats },

    created_at: note.created_at || 0,
    sig: note.sig,
    kind: note.kind,

    nId: nip19.neventEncode(eventPointer),
    nIdShort: nip19.neventEncode(eventPointerShort),
    actions: (page.noteActions && page.noteActions[note.id]) ?? noActions(note.id),
    relayHints: [page.relayHints[note.id]],

    repost,
    event: { ...note },

    mentionedNotes,
    mentionedUsers,
    mentionedHighlights,
    mentionedArticles,
    mentionedZaps,

    replyTo: replyTo && replyTo[1],
    tags: note.tags || [],
    id: note.id,

    pubkey: note.pubkey || '',
    topZaps,
    content: DOMPurify.sanitize(note.content || ''),
  } as PrimalNote;
}

export const getArticlesInPage = (page: EventFeedPage) => {
  if (page === undefined) {
    return [];
  }

  let i = 0;

  let reads: PrimalArticle[] = [];

  for (i=0;i<page.reads.length;i++) {
    const read = page.reads[i];
    const newRead = getArticleInPage(page, read);

    if (!newRead) continue;

    reads.push(newRead);
  }

  return reads;
};

export const getArticleInPage = (
  page: EventFeedPage,
  eventOrId: string | NostrEventContent,
  ignoreMention?: boolean,
) => {

  const read = typeof eventOrId === 'string' ?
    page.reads.find(n => n.id === eventOrId) :
    eventOrId;

  if (!read) return;

  const { coordinate, naddr } = encodeCoordinate(read, Kind.LongForm);
  const author = getUserInPage(page, read.pubkey!);
  const stat = page.noteStats[read.id];
  const studioStats = page.studioNoteStats[coordinate];
  const topZaps = page.topZaps[naddr] || page.topZaps[read.id] || [];
  const wordCount = (page.wordCount || {})[read.id] || 0;
  const tags = read.tags || [];
  const userMentionIds = tags.reduce((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);

  // include senders of top zaps into mentioned users
  for(let i=0; i<topZaps.length; i++) {
    if (userMentionIds.includes(topZaps[i].pubkey)) continue;
    userMentionIds.push(topZaps[i].pubkey);
  }

  // Parse mentions
  const {
    mentionedNotes,
    mentionedArticles,
    mentionedUsers,
    mentionedHighlights,
    mentionedZaps,
  } = ignoreMention ? emptyMentions() : extractMentions(page, read);

  let newRead: PrimalArticle = {
    id: read.id,
    pubkey: read.pubkey!,
    kind: Kind.LongForm,

    title: '',
    summary: '',
    image: '',
    keywords: [],
    published_at: read.created_at || 0,
    coordinate,

    tags,
    created_at: read.created_at || 0,
    content: DOMPurify.sanitize(read.content || ''),
    user: author,
    topZaps,
    nId: naddr,
    nIdShort: naddr,
    event: { ...read },

    mentionedNotes,
    mentionedUsers,
    mentionedHighlights,
    mentionedArticles,
    mentionedZaps,

    wordCount,
    actions: (page.noteActions && page.noteActions[read.id]) ?? noActions(read.id),
    stats: { ...stat },
    studioStats: { ...studioStats },
    relayHints: [page.relayHints[read.id]],
  };

  tags.forEach(tag => {
    switch (tag[0]) {
      case 't':
        newRead.keywords.push(tag[1]);
        break;
      case 'title':
        newRead.title = tag[1];
        break;
      case 'summary':
        newRead.summary = tag[1];
        break;
      case 'image':
        newRead.image = tag[1];
        break;
      case 'published_at':
        newRead.published_at = parseInt(tag[1]);
        break;
      case 'client':
        newRead.client = tag[1];
        break;
      default:
        break;
    }
  });

  return newRead;
}

export const getDraftsInPage = (page: EventFeedPage) => {
  if (page === undefined) {
    return [];
  }

  let i = 0;

  let drafts: PrimalDraft[] = [];

  for (i=0;i<page.drafts.length;i++) {
    const draft = page.drafts[i];

    const nId = nip19.neventEncode({
      id: draft.id,
      kind: Kind.Draft,
      author: draft.pubkey,
    });

    const nIdShort = nip19.neventEncode({
      id: draft.id,
    });
    const sender = getUserInPage(page, draft.pubkey!);

    const receiverPubkey = (draft.tags?.find(t => t[0] === 'p') || ['p', ''])[1];

    const receiver = receiverPubkey.length > 0 ?
      getUserInPage(page, receiverPubkey) :
      { ...sender };

    const newDraft: PrimalDraft = {
      id: draft.id,
      nId,
      nIdShort,
      kind: draft.kind,
      contentKind: parseInt((draft.tags?.find(t => t[0] === 'k') || ['k', '1'])[1]),
      content: draft.content || '',
      plain: '',
      client: ((draft.tags || []).find(t => t[0] === 'client') || ['cilent', 'unknown'])[1],
      pubkey: draft.pubkey || '',
      created_at: draft.created_at || 0,
      tags: draft.tags || [],
      sender,
      receiver: receiver || sender,
      event: { ...draft },
    }

    drafts.push(newDraft);
  }

  return drafts;
};

export const getZapsInPage = (page: EventFeedPage) => {
  const pageZaps = page.zaps;

  let zaps: PrimalZap[] = [];

  for (let i=0; i< pageZaps.length; i++) {
    const zapContent = pageZaps[i];
    const zap = getZapInPage(page, zapContent);

    if (zap && zaps.find(z => z.id === zap.id) === undefined) {
      zaps.push(zap);
    }
  }

  return zaps;
}

export const getZapInPage = (page: EventFeedPage, eventOrId: string | NostrEventContent) => {

  const zapContent = typeof eventOrId === 'string' ?
    page.zaps.find(n => n.id === eventOrId) :
    eventOrId;

  if (!zapContent) return;

  const tags = zapContent.tags || [];

  const bolt11 = (tags.find(t => t[0] === 'bolt11') || [])[1];
  const zapEvent = JSON.parse((tags.find(t => t[0] === 'description') || [])[1] || '{}');
  const senderPubkey = zapEvent.pubkey as string;
  const receiverPubkey = zapEvent.tags.find((t: string[]) => t[0] === 'p')[1] as string;

  let zappedId = '';
  let zappedKind: number = 0;

  const zapTagA = zapEvent.tags.find((t: string[]) => t[0] === 'a');
  const zapTagE = zapEvent.tags.find((t: string[]) => t[0] === 'e');

  if (zapTagA) {
    const [kind, pubkey, identifier] = zapTagA[1].split(':');

    zappedId = nip19.naddrEncode({ kind, pubkey, identifier });

    const article = page.reads.find(a => a.id === zappedId);
    zappedKind = article?.kind || 0;
  }
  else if (zapTagE) {
    zappedId = zapTagE[1];

    const article = page.reads.find(a => a.id === zappedId);
    const note = page.notes.find(n => n.id === zappedId);

    zappedKind = article?.kind || note?.kind || 0;
  }

  if (![Kind.Text, Kind.LongForm].includes(zappedKind)) return;

  const sender = page.users[senderPubkey] ? getUserInPage(page, senderPubkey) : senderPubkey;
  const reciver = page.users[receiverPubkey] ? getUserInPage(page, receiverPubkey) : receiverPubkey;

  const zap: PrimalZap = {
    id: zapContent.id,
    message: zapEvent.content || '',
    amount: parseBolt11(bolt11) || 0,
    sender,
    reciver,
    created_at: zapContent.created_at,
    zappedId,
    zappedKind,
  };

  return zap;
}

export const getTopicStatsInPage = (page: EventFeedPage) => {
  return Object.entries(page.topicStats);
}

export const getContactsInPage = (page: EventFeedPage) => {
  // const [keys, totalCount] = Object.entries(page.dmContacts).reduce<[string[], number]>((acc, [id, info]) => {
  //   return [[ ...acc[0], id ], acc[1] + info.cnt];
  // }, [[], 0]);

  const pubkeys = Object.keys(page.dmContacts);

  return pubkeys.map(pubkey => ({
    pubkey,
    user: getUserInPage(page, pubkey),
    dmInfo: page.dmContacts[pubkey],
  })) as DMContact[];
}

export const pageResolve = (
  page: EventFeedPage,
  opts?: {
    offset?: number,
  }): EventFeedResult => {

  const identifier = uuidv4();

  // If there are reposts that have empty content,
  // we need to add the content manualy
  const reposts = parseEmptyReposts(page);
  const repostIds = Object.keys(reposts);

  if (repostIds.length > 0) {
    repostIds.forEach(id => {
      const repostedNote = page.mentions.find(m => m.id === id);

      if (repostedNote) {
        const i = page.notes.findIndex(n => n.id === reposts[id]);
        page.notes[i].content = JSON.stringify(repostedNote);
      }
    })
  }

  const paging: PaginationInfo = {
    since: page.since,
    until: page.until,
    sortBy: page.sortBy,
    elements: [ ...page.elements ],
    offset: opts?.offset || 0,
  }

  const users = getUsersInPage(page);
  const notes = getNotesInPage(page);
  const reads = getArticlesInPage(page);
  const drafts = getDraftsInPage(page);
  const zaps = getZapsInPage(page);
  const topicStats = getTopicStatsInPage(page);
  const dmContacts = getContactsInPage(page);
  const encryptedMessages = [...page.encryptedMessages];
  const legendCustomization = { ...page.legendCustomization };
  const memberCohortInfo = { ...page.memberCohortInfo };
  const leaderboard = [ ...page.leaderboard ];

  return {
    eventIds: [ ...page.eventIds ],
    users,
    notes,
    reads,
    drafts,
    zaps,
    topicStats,
    dmContacts,
    encryptedMessages,
    legendCustomization,
    memberCohortInfo,
    leaderboard,
    paging,
    page,
    identifier,
  };
}

export const updateFeedPage = (page: EventFeedPage, content: NostrEventContent) => {
  if  (!content) return;

  if (!page.eventIds.includes(content.id)) {
    page.eventIds.push(content.id)
  }

  if (content.kind === Kind.FeedRange) {
    const feedRange: FeedRange = JSON.parse(content.content || '{}');

    page.since = feedRange.since;
    page.until = feedRange.until;
    page.sortBy = feedRange.order_by;
    page.elements = [...feedRange.elements];

    return;
  }

  if (content.kind === Kind.Metadata) {
    const user = content as NostrEventContent;

    page.users[user.pubkey!] = { ...user };
    return;
  }

  if ([Kind.Text, Kind.Repost].includes(content.kind)) {
    const message = content as NostrEventContent;

    let isAlreadyReposted = isRepostInCollection(page.notes, message);

    if (isAlreadyReposted) return;

    page.notes.push({ ...message });

    return;
  }

  if ([Kind.LongForm, Kind.LongFormShell].includes(content.kind)) {
    const message = content as NostrEventContent;

    // let isAlreadyReposted = isRepostInCollection(page.notes, message);

    // if (isAlreadyReposted) return;

    page.reads.push({ ...message });
    return;
  }

  if ([Kind.Draft].includes(content.kind)) {
      const message = content as NostrEventContent;

      page.drafts.push({ ...message });
      return;
    }

  if (content.kind === Kind.NoteStats) {
    const statistic = content as NostrEventContent;
    const stat = JSON.parse(statistic.content || '{}');

    page.noteStats[stat.event_id] = { ...stat };
    return;
  }

  if (content.kind === Kind.Mentions) {
    const mentionContent = content as NostrEventContent;
    const mention = JSON.parse(mentionContent.content || '{}');

    page.mentions.push({ ...mention });
    return;
  }

  if (content.kind === Kind.NoteActions) {
    const noteActionContent = content as NostrEventContent;
    const noteActions = JSON.parse(noteActionContent.content || '{}');

    page.noteActions[noteActions.event_id] = { ...noteActions };
    return;
  }

  if (content.kind === Kind.LinkMetadata) {
    parseLinkPreviews(JSON.parse(content.content || '{}'));
    return;
  }

  if (content.kind === Kind.Zap) {
    page.zaps.push(content);

    const zapTag = (content.tags || []).find(t => t[0] === 'description');

    if (!zapTag) return;

    const zapInfo = JSON.parse(zapTag[1] || '{}');

    let amount = '0';

    let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

    if (bolt11Tag) {
      try {
        amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
      } catch (e) {
        const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

        amount = amountTag ? amountTag[1] : '0';
      }
    }

    let eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e' || t[0] === 'a') || [])[1];

    if (eventId.includes(':')) {
      const [kind, pubkey, identifier] = eventId.split(':');

      eventId = nip19.naddrEncode({ kind, pubkey, identifier })
    }

    const topZap: TopZap = {
      id: zapInfo.id,
      amount: parseInt(amount || '0'),
      pubkey: zapInfo.pubkey,
      message: zapInfo.content,
      eventId,
    };

    const oldZaps = page.topZaps[eventId];

    if (oldZaps === undefined) {
      page.topZaps[eventId] = [{ ...topZap }];
      return;
    }

    if (oldZaps.find(i => i.id === topZap.id)) {
      return;
    }

    const newZaps = [ ...oldZaps, { ...topZap }].sort((a, b) => b.amount - a.amount);

    page.topZaps[eventId] = [ ...newZaps ];

    return;
  }

  if (content.kind === Kind.NoteTopicStat) {
    const topics = JSON.parse(content.content || '{}');

    page.topicStats = topics;
    return;
  }

  if (content.kind === Kind.UserStats) {
    let stats = JSON.parse(content.content || '{}');

    page.userStats[stats.pubkey] = { ...stats };
  }

  if (content.kind === Kind.UserFollowerCounts) {
    let stats = JSON.parse(content.content || '{}');

    page.userFollowerCounts = { ...stats };
  }

  if (content.kind === Kind.UserFollowerIncrease) {
    let stats = JSON.parse(content.content || '{}');

    page.userFollowerIncrease = { ...stats };
  }

  if (content?.kind === Kind.MesagePerSenderStats) {
    const senderCount = JSON.parse(content.content || '{}');

    page.dmContacts = { ...senderCount };
  }

  if (content?.kind === Kind.EncryptedDirectMessage) {
    page.encryptedMessages.push({ ...content });
  }

  if (content.kind === Kind.WordCount) {
    const count = JSON.parse(content.content || '{}');

    if (!page.wordCount) {
      page.wordCount = {};
    }

    page.wordCount[count.event_id] = count.words
    return;
  }

  if (content.kind === Kind.LegendCustomization) {
    const config = JSON.parse(content.content || '{}') as Record<string, LegendCustomizationConfig>;

    Object.entries(config).forEach(([pubkey, customization]) => {
      page.legendCustomization[pubkey] = { ...customization }
    });
    return;

  }

  if (content.kind === Kind.MembershipCohortInfo) {
    const config = JSON.parse(content.content || '{}') as Record<string, CohortInfo>;

    Object.entries(config).forEach(([pubkey, customization]) => {
      page.memberCohortInfo[pubkey] = { ...customization }
    });
    return;
  }

  if ([Kind.LegendLeaderboard, Kind.PremiumLeaderboard].includes(content.kind)) {
    let leaderboard = JSON.parse(content.content || '[]');

    leaderboard = leaderboard.map((l: any) => ({
      index: l.index,
      pubkey: l.pubkey,
      donated_btc: l.donated_btc ? parseFloat(l.donated_btc) : 0,
      last_donation: l.last_donation || 0,
      premium_since: l.premium_since || 0,
    }));

    page.leaderboard = [ ...leaderboard ];
    return;
  }

  if ([Kind.StudioNoteStats].includes(content.kind)) {
    page.studioNoteStats = JSON.parse(content.content || '{}');
  }
  if (content.kind === Kind.RelayHint) {
    page.relayHints = JSON.parse(content.content || '{}');
  }

  // if ([Kind.MediaInfo, Kind.EventZapInfo, Kind.Blossom, Kind.VerifiedUsersDict, Kind.RelayHint].includes(content.kind)) return;

  // console.log('EVENT: ', content.kind, JSON.parse(content.content || '{}'));

};

export const filterAndSortPageResults = (result: EventFeedResult) => {
  return {
    ...result,
    users: filterAndSortUsers(result.users, result.paging, result.page),
    notes: filterAndSortNotes(result.notes, result.paging),
    reads: filterAndSortReads(result.reads, result.paging),
    drafts: filterAndSortDrafts(result.drafts, result.paging),
    zaps:filterAndSortZaps(result.zaps, result.paging),
  }
}


export const filterAndSortNotes = (notes: PrimalNote[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalNote[]>(
    (acc, id) => {
      let note = notes.find(n => [n.id, n.repost?.note?.id].includes(id));

      return note ? [ ...acc, { ...note } ] : acc;
    },
    [],
  );
}

export const filterAndSortReads = (reads: PrimalArticle[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalArticle[]>(
    (acc, id) => {
      const read = reads.find(n => n.id === id);

      return read ? [ ...acc, { ...read } ] : acc;
    },
    [],
  );
}

export const filterAndSortDrafts = (drafts: PrimalDraft[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalDraft[]>(
    (acc, id) => {
      const read = drafts.find(n => n.id === id);

      return read ? [ ...acc, { ...read } ] : acc;
    },
    [],
  );
}

export const filterAndSortZaps = (zaps: PrimalZap[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalZap[]>(
    (acc, id) => {
      const zap = zaps.find(n => n.id === id);

      return zap ? [ ...acc, { ...zap } ] : acc;
    },
    [],
  );
}

export const filterAndSortUsers = (users: PrimalUser[], paging: PaginationInfo, page: EventFeedPage) => {
  return paging.elements.reduce<PrimalUser[]>((acc, pk) => {

    let f: PrimalUser | undefined = users.find(u => u.pubkey === pk);

    // If we encounter a user without a metadata event
    // construct a user object for them
    if (!f) {
      f = emptyUser(pk);
      const stats = { ...emptyStats() };

      f.userStats = {
        ...stats,
        followers_increase: page.userFollowerIncrease[pk],
        followers_count: page.userFollowerCounts[pk],
      };
    }

    return f ? [...acc, {...f}] : acc;
  } , []);
}


export const filterAndSortLeaderboard = (lb: LeaderboardInfo[], paging: PaginationInfo) => {
  return paging.elements.reduce<LeaderboardInfo[]>(
    (acc, id) => {
      let leader = lb.find(n => n.pubkey === id);

      return leader ? [ ...acc, { ...leader } ] : acc;
    },
    [],
  );
}


export const referencesToTags = (value: string) => {
  const regexHashtag = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;
  const regexMention =
    /\b(nostr:)?((note|npub|nevent|nprofile|naddr)1['qpzry9x8gf2tvdw0s3jn54khce6mua7l']+)\b|#\[(\d+)\]/g;
  const mentionRegexNostrless = /((note|nevent|naddr|nprofile|npub)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b/;

  let refs: string[] = [];
  let tags: string[][] = [];
  let match;

  // Parse hashtags to add to tags
  while((match = regexHashtag.exec(value)) != null) {
    tags.push(['t', match[0].trim().slice(1)]);
  }

  // Parse mentions to add to tags
  while((match = regexMention.exec(value)) !== null) {
    refs.push(match[0]);
  }

  refs.forEach((ref) => {
    let id = `${ref}`;

    const idStart = ref.search(mentionRegexNostrless);

    if (idStart > 0) {
      id = ref.slice(idStart);
    }

    const decoded = nip19.decode(id);

    if (decoded.type === 'npub') {
      tags.push(['p', decoded.data, '', 'mention'])
      return;
    }

    if (decoded.type === 'nprofile') {
      const relay = decoded.data.relays ? (decoded.data.relays[0] || '') : '';
      tags.push(['p', decoded.data.pubkey, relay, 'mention']);
      return;
    }

    if (decoded.type === 'note') {
      const relays = mentionStore.notes[decoded.data].relayHints;
      tags.push(['e', decoded.data, (relays && relays.length > 0) ? relays[0] : '', 'mention']);
      return;
    }

    if (decoded.type === 'nevent') {
      const relay = decoded.data.relays ? (decoded.data.relays[0] || '') : '';
      tags.push(['e', decoded.data.id, relay, 'mention']);
      return;
    }

    if (decoded.type === 'naddr') {
      const relay = decoded.data.relays ? (decoded.data.relays[0] || '') : '';
      tags.push(['a', `${decoded.data.kind}:${decoded.data.pubkey}:${decoded.data.identifier}`, relay, 'mention']);
      return;
    }
  });

  return tags;
};
