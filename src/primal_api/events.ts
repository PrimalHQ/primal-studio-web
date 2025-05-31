import { APP_ID } from "src/App";
import { EventCoordinate, NostrRelaySignedEvent, PrimalArticle, PrimalNote, PrimalUser } from "src/primal";
import { emptyEventFeedPage, pageResolve, updateFeedPage } from "src/utils/feeds";
import { decodeIdentifier } from "src/utils/kyes";
import { primalAPI, sendMessage, subsTo } from "src/utils/socket";

export const getReplacableEvent = (pubkey: string, kind: number, subId: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["replaceable_event", { pubkey, kind, }]},
  ]));
};

export const getParametrizedEvent = (pubkey: string, identifier: string, kind: number, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["parametrized_replaceable_event", { pubkey, kind, identifier, extended_response: true }]},
  ]));
};


export const getParametrizedEvents = (events: EventCoordinate[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["parametrized_replaceable_events", { events, extended_response: true }]},
  ]));
};


export const getEvents = (user_pubkey: string | undefined, eventIds: string[], subid: string, extendResponse?: boolean) => {

  let payload:  {event_ids: string[], user_pubkey?: string, extended_response?: boolean } =
    { event_ids: eventIds } ;

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  if (extendResponse) {
    payload.extended_response = extendResponse;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["events", payload]},
  ]));

};

export const importEvents = (events: NostrRelaySignedEvent[], subId: string) => {

  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["import_events", { events }]},
  ]));
};

export const triggerImportEvents = (
  events: NostrRelaySignedEvent[],
  subId?: string
): Promise<boolean> => {
  const sub = subId || `import_events_${APP_ID}`;

  return new Promise((resolve) => {
    const unsub = subsTo(sub, {
      onEose: () => {
        unsub();
        resolve(true);
      }
    });

    importEvents(events, sub);
  })
};


export const fetchArticles = (noteIds: string[], subId: string) => {
  return new Promise<PrimalArticle[]>((resolve, reject) => {

    let page = { ...emptyEventFeedPage() };

    const events = noteIds.reduce<EventCoordinate[]>((acc, id) => {
      const d = decodeIdentifier(id);

      if (!d.data || d.type !== 'naddr' || typeof d.data === 'string') return acc;

      const { pubkey, identifier, kind } = d.data;

      return [
        ...acc,
        { identifier, pubkey, kind },
      ]

    }, []);

    primalAPI({
      subId,
      action: () => getParametrizedEvents(events, subId),
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        const { reads } = pageResolve(page)
        resolve(reads);
      },
      onNotice: () => {
        reject('failed_to_fetch_articles');
      }
    });
  });
};

export const fetchNotes = (pubkey: string | undefined, noteIds: string[], subId: string) => {
  return new Promise<PrimalNote[]>((resolve, reject) => {

    let page = { ...emptyEventFeedPage() };

    primalAPI({
      subId,
      action: () => getEvents(pubkey, noteIds, subId),
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        const { notes } = pageResolve(page)
        resolve(notes);
      },
      onNotice: () => {
        reject('failed_to_fetch_notes');
      }
    });
  });
};
