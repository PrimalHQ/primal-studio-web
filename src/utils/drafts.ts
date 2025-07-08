import { NostrEventContent, PrimalArticle, PrimalDraft, PrimalNote } from "src/primal";
import { decrypt44 } from "./nostrApi";
import { logError, logWarning } from "./logger";
import { emptyMentions, encodeCoordinate, extractReplyToFromTags, noActions } from "./feeds";
import { Kind } from "src/constants";
import DOMPurify from 'dompurify';
import { nip19 } from "./nTools";
import { accountStore } from "src/stores/AccountStore";
import { getUsers } from "src/primal_api/profile";
import { fetchArticles, fetchNotes } from "src/primal_api/events";
import { APP_ID } from "src/App";

export const parseDraftContent = async (drafts: PrimalDraft[]) => {
  let parsedDrafts: PrimalDraft[] = [];

  try {
    for (let i=0; i<drafts.length; i++) {
      let draft = { ...drafts[i] };

      const pubkey = accountStore.pubkey === draft.sender.pubkey ?
        draft.receiver.pubkey :
        draft.sender.pubkey;

      const decryptedContent = await decrypt44(pubkey, draft.content);

      if (!decryptedContent) continue;

      parsedDrafts.push({
        ...draft,
        plain: decryptedContent,
        draftedEvent: JSON.parse(decryptedContent),
      })
    }

    return parsedDrafts;

  } catch(e) {
    logError('failed-to-decrypt44: ', e);
    return parsedDrafts;
  }
}


export const parseDraftedEvent = async (
  draft: PrimalDraft,
): Promise<PrimalArticle | PrimalNote | undefined> => {
  if (!draft) return;

  const event = draft.draftedEvent;

  if (!event) return;


  const mentions = await parseEventForMentions(event);

  if ([Kind.LongForm].includes(draft.contentKind)) {
    // const { coordinate, naddr } = encodeCoordinate(event, Kind.LongForm);
    const sender = draft.sender;
    const tags = event.tags || [];
    const coordinate = '';
    const naddr = '';

    const relayHints = tags.reduce<string[]>((acc, t) => t[0] === 'r' ? [...acc, t[1]] : acc, []);

    let {
      mentionedNotes,
      mentionedArticles,
      mentionedUsers,
      mentionedHighlights,
      mentionedZaps,
    } = emptyMentions();

    mentionedUsers = [...mentions.users];
    mentionedNotes = [...mentions.users];
    mentionedArticles = [...mentions.users];

    let newRead = {
      id: event.id,
      pubkey: event.pubkey!,
      kind: Kind.LongForm,

      title: '',
      summary: '',
      image: '',
      keywords: [],
      published_at: event.created_at || 0,
      coordinate,

      tags,
      created_at: event.created_at || 0,
      content: DOMPurify.sanitize(event.content || ''),
      user: sender,
      topZaps: [],
      nId: naddr,
      nIdShort: naddr,
      event: { ...event },

      mentionedNotes,
      mentionedUsers,
      mentionedHighlights,
      mentionedArticles,
      mentionedZaps,

      actions: noActions(event.id),
      stats: {
        event_id: "",
        likes: 0,
        mentions: 0,
        reposts: 0,
        replies: 0,
        zaps: 0,
        satszapped: 0,
        score: 0,
        score24h: 0,
        bookmarks: 0
      },
      studioStats: {
        satszapped: 0,
        score: 0,
        sentiment: "neutral",
        zaps: 0,
        quotes: 0,
        replies: 0,
        replies_long: 0,
        replies_short: 0,
        replies_medium: 0,
        reposts: 0,
        bookmarks: 0,
        reactions: 0,
      },
      relayHints,
    } as PrimalArticle;

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

  if ([Kind.Text].includes(draft.contentKind)) {

    // If this is a repost, parse it for the originsl note.
    const note = event;

    const author = draft.sender;

    const tags = note.tags || [];
    const replyTo = extractReplyToFromTags(tags);
    const relayHints = tags.reduce<string[]>((acc, t) => t[0] === 'r' ? [...acc, t[1]] : acc, []);

    // Parse mentions
    let {
      mentionedNotes,
      mentionedArticles,
      mentionedUsers,
      mentionedHighlights,
      mentionedZaps,
    } = emptyMentions();

    mentionedUsers = [...mentions.users];
    mentionedNotes = [...mentions.users];
    mentionedArticles = [...mentions.users];

    const eventPointer: nip19.EventPointer = {
      id: note.id,
      author: note.pubkey,
      kind: note.kind,
      relays: tags.reduce((acc, t) => t[0] === 'r' && (t[1].startsWith('wss://' ) || t[1].startsWith('ws://')) ? [...acc, t[1]] : acc, []).slice(0, 2),
    };


    const eventPointerShort: nip19.EventPointer = {
      id: note.id,
    };

    let nId = '';
    let nIdShort = '';

    try {
      nId = nip19.neventEncode(eventPointer);
      nIdShort = nip19.neventEncode(eventPointerShort);
    } catch (e) {
      logWarning('bad id');
    }

    return {
      user: author,
      stats: {
        event_id: "",
        likes: 0,
        mentions: 0,
        reposts: 0,
        replies: 0,
        zaps: 0,
        satszapped: 0,
        score: 0,
        score24h: 0,
        bookmarks: 0
      },
      studioStats: {
        satszapped: 0,
        score: 0,
        sentiment: "neutral",
        zaps: 0,
        quotes: 0,
        replies: 0,
        replies_long: 0,
        replies_short: 0,
        replies_medium: 0,
        reposts: 0,
        bookmarks: 0,
        reactions: 0,
      },

      created_at: note.created_at || 0,
      sig: note.sig,
      kind: note.kind,

      nId,
      nIdShort,
      actions: noActions(note.id),
      relayHints,

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
      topZaps: [],
      content: DOMPurify.sanitize(note.content || ''),
    } as PrimalNote;
  }

  return;

}

export const parseEventForMentions = async (event: NostrEventContent) => {

  let pubkeys: string[] = [];
  let eventIds: string[] = [];
  let adresses: string[] = [];

  // Get ids from tags
  pubkeys = (event.tags || []).reduce((acc, t) => {
    if (t[0] === 'p') return [...acc, t[1]];

    return acc;
  }, []);

  eventIds = (event.tags || []).reduce((acc, t) => {
    if (t[0] === 'e') return [...acc, t[1]];

    return acc;
  }, []);

  adresses = (event.tags || []).reduce((acc, t) => {
    if (t[0] === 'a') {
      const [kind, pubkey, identifier] = t[1].split(':');

      const naddr = nip19.naddrEncode({ kind: parseInt(kind), pubkey, identifier });

      return [...acc, naddr];
    }

    return acc;
  }, []);

  // get ids from content, just in case
  const content = event.content || '';

  const patterns = {
    npub: /npub1[a-zA-Z0-9]+/g,
    nprofile: /nprofile1[a-zA-Z0-9]+/g,
    note: /note1[a-zA-Z0-9]+/g,
    nevent: /nevent1[a-zA-Z0-9]+/g,
    naddr: /naddr1[a-zA-Z0-9]+/g
  };

  for (const pattern of Object.values(patterns)) {
    const matches = content.match(pattern);
    if (!matches) continue;

    for (let i =0; i< matches.length; i++) {
      const decoded = nip19.decode(matches[i]);

      if (decoded.type === 'npub' && !pubkeys.includes(decoded.data)) {
        pubkeys.push(decoded.data);
        continue;
      }

      if (decoded.type === 'nprofile' && !pubkeys.includes(decoded.data.pubkey)) {
        pubkeys.push(decoded.data.pubkey);
        continue;
      }

      if (decoded.type === 'nevent' && !eventIds.includes(decoded.data.id)) {
        eventIds.push(decoded.data.id);
        continue;
      }

      if (decoded.type === 'note' && !eventIds.includes(decoded.data)) {
        eventIds.push(decoded.data);
        continue;
      }

      if (decoded.type === 'naddr') {
        const naddr = nip19.naddrEncode({
          kind: decoded.data.kind,
          identifier: decoded.data.identifier,
          pubkey: decoded.data.pubkey,
          relays: decoded.data.relays,
        })
        !adresses.includes(naddr) && adresses.push(naddr);
        continue;
      }
    }

  }

  const users = await getUsers(pubkeys);
  const notes = await fetchNotes(accountStore.pubkey, eventIds, `get_notes_${APP_ID}`);
  const articles = await fetchArticles(adresses, `get_articles_${APP_ID}`);

  return  { users, notes, articles };

}
