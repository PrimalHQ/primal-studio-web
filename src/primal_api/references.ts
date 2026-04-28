import { NostrEventContent, PrimalArticle, PrimalNote, PrimalUser, PrimalUserPoll, PrimalZap } from "src/primal";
import { convertToUser, convertToUserPoll, emptyUser, encodeCoordinate } from "src/utils/feeds";
import { nip19 } from "src/utils/nTools";
import { getUsers } from "./profile";
import { Kind } from "src/constants";
import { fetchArticles, fetchEvents, fetchNostrEvents, fetchNotes } from "./events";
import { accountStore } from "src/stores/AccountStore";
import { APP_ID } from "src/App";


export type EventReference = {
  pk?: string,
  kind?: number,
  event?: PrimalUser | PrimalNote | PrimalArticle | PrimalZap | PrimalUserPoll | NostrEventContent | undefined,
  error?: string,
  reference?: string,
  uuid?: string,
  updated_at?: number;
}

export const fetchEventsFromReference = async (reference: string): Promise<EventReference> => {
  const ref = reference.startsWith('nostr:') ?
    reference.slice(6) :
    reference;

  try {
    const decoded = nip19.decode(ref);

    let pk = ref;
    let kind = -1;

    switch (decoded.type) {
      case 'npub':
        pk = decoded.data;
        kind = Kind.Metadata;
        break;
      case 'nprofile':
        pk = decoded.data.pubkey;
        kind = Kind.Metadata;
        break;
      case 'note':
        pk = decoded.data;
        kind = Kind.Text;
        break;
      case 'nevent':
        pk = decoded.data.id;
        kind = decoded.data.kind || Kind.Text;
        break;
      case 'naddr':
        pk = `${decoded.data.kind}:${decoded.data.pubkey}:${decoded.data.identifier}`;
        kind = decoded.data.kind || Kind.LongForm;
        break;
    }

    switch (kind) {
      case Kind.Metadata:
        const users = await getUsers([pk], `user_ref_${pk}_${APP_ID}`);

        let user = users[0];

        if (!user) {
          user = emptyUser(pk);
        }

        return {
          pk,
          kind,
          event: user,
          reference,
        };
      case Kind.Text:
        const notes = await fetchNotes(
          accountStore.pubkey,
          [pk],
          `note_ref_${pk}_${APP_ID}`,
          true,
        );

        let note = notes[0];

        if (!note) {
          throw 'note-not-found';
        }

        return {
          pk,
          kind,
          event: note,
          reference
        };
      case Kind.LongForm:
        const articles = await fetchArticles(
          [ref],
          `article_ref_${pk}_${APP_ID}`,
        );

        let article = articles[0];

        if (!article) {
          throw 'note-not-found';
        }

        return {
          pk,
          kind,
          event: article,
          reference
        }
      case Kind.UserPoll:
      case Kind.ZapPoll: {
        const page = await fetchNostrEvents(
          [pk],
          kind,
          `event_ref_${pk}_${APP_ID}`,
        );

        const pollEvent = page.events.find(e => e.id === pk);

        if (!pollEvent) {
          throw 'poll-not-found';
        }

        const authorPubkey = pollEvent.pubkey || '';
        const author = page.metadata.find(m => m.pubkey === authorPubkey);
        const authorUser = author ? convertToUser(author, authorPubkey) : undefined;

        return {
          pk,
          kind,
          event: convertToUserPoll(pollEvent, authorUser),
          reference,
        };
      }
      default:
        const page = await fetchNostrEvents(
          [pk],
          kind,
          `event_ref_${pk}_${APP_ID}`,
        );

        let event = page.events.find(e => e.id === pk);

        if (!event) {
          event = page.addressable.find(e => {
            const { coordinate } = encodeCoordinate(e);

            return coordinate === pk;
          })
        }

        return {
          pk,
          kind,
          event,
          reference,
        }
    }
  }
  catch (error: any) {
    return { error, reference };
  }
}


export const fetchEventsFromId = async (id: string, isPubkey?: boolean): Promise<EventReference | undefined> => {

  try {

    if (isPubkey) {
      const users = await getUsers([id], `user_ref_${id}_${APP_ID}`);

      let user = users[0];

      if (!user) {
        user = emptyUser(id);
      }

      return {
        pk: id,
        kind: Kind.Metadata,
        event: user,
        reference: id,
      };
    }

    const events = await fetchEvents(
      accountStore.pubkey,
      [id],
      `event_ref_${id}_${APP_ID}`,
      true,
    );

    let event: PrimalNote | PrimalArticle | PrimalZap | undefined = events.notes.find(n => n.id === id);

    if (!event) {
      event = events.reads.find(r => r.id === id);
    }

    if (!event) {
      event = events.zaps.find(r => r.id === id);
    }

    if (!event) {
      return undefined;
    }

    return {
      pk: id,
      kind: event.kind,
      event,
      reference: id
    };
  }
  catch (error: any) {
    return { error, reference: id };
  }
}
