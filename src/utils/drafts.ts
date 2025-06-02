import { PrimalArticle, PrimalDraft, PrimalNote } from "src/primal";
import { decrypt44 } from "./nostrApi";
import { logError } from "./logger";
import { emptyMentions, extractReplyToFromTags, noActions } from "./feeds";
import { Kind } from "src/constants";
import DOMPurify from 'dompurify';
import { nip19 } from "./nTools";
import { accountStore } from "src/stores/AccountStore";

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


export const parseDraftedEvent = (
  draft: PrimalDraft,
): PrimalArticle | PrimalNote | undefined => {

  const event = draft.draftedEvent;

  if (!event) return;

  if ([Kind.LongForm].includes(draft.contentKind)) {
    // const { coordinate, naddr } = encodeCoordinate(event, Kind.LongForm);
    const sender = draft.sender;
    const tags = event.tags || [];
    const coordinate = '';
    const naddr = '';

    let {
      mentionedNotes,
      mentionedArticles,
      mentionedUsers,
      mentionedHighlights,
      mentionedZaps,
    } = emptyMentions();

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
        sentiment: "neutral"
      },
      relayHints: {},
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

    // Parse mentions
    let {
      mentionedNotes,
      mentionedArticles,
      mentionedUsers,
      mentionedHighlights,
      mentionedZaps,
    } = emptyMentions();

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
        sentiment: "neutral"
      },

      created_at: note.created_at || 0,
      sig: note.sig,
      kind: note.kind,

      nId: nip19.neventEncode(eventPointer),
      nIdShort: nip19.neventEncode(eventPointerShort),
      actions: noActions(note.id),
      relayHints: {},

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
