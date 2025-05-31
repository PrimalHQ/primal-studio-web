import {
  EventFeedResult,
  FeedPaging,
  FeedRange,
  FeedResult,
  NostrEventContent,
} from "../primal";

import { primalAPI, sendMessage, subsTo } from "../utils/socket";
import { Kind } from "../constants";
import { emptyEventFeedPage, emptyFeedRange, pageResolve, updateFeedPage } from "src/utils/feeds";


export const getMegaFeed = (
  user_pubkey: string | undefined,
  spec: string,
  subid: string,
  until = 0,
  limit = 20,
  since = 0,
  offset = 0,
) => {

  let payload = { spec, limit, offset };

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  if (since > 0) {
    // @ts-ignore
    payload.since = since
  }

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["mega_feed_directive", payload]},
  ]));
}

export const getEvents = (
  user_pubkey: string | undefined,
  eventIds: string[],
  subid: string,
  extendResponse?: boolean,
) => {

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

export const fetchMegaFeed = (
  pubkey: string | undefined,
  specification: string,
  subId: string,
  paging?: FeedPaging,
) => {
  return new Promise<EventFeedResult>((resolve, reject) => {

    let page = { ...emptyEventFeedPage() };

    const until = paging?.until || 0;
    const since = paging?.since || 0;
    const limit = paging?.limit || 0;
    const offset = paging?.offset || 0;

    primalAPI({
      subId,
      action: () => getMegaFeed(pubkey, specification, subId, until, limit, since, offset),
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        resolve(pageResolve(page));
      },
      onNotice: () => {
        reject('failed_to_fetch_mega_feed');
      }
    });
  });
};

export const fetchEvents = (
  pubkey: string | undefined,
  eventIds: string[],
  subId: string,
) => {
    return new Promise<NostrEventContent[]>((resolve) => {
      let events: NostrEventContent[] = [];

      const unsub = subsTo(subId, {
        onEose: () => {
          unsub();
          resolve(events);
        },
        onEvent: (_, content) => {
          events.push(content);
        }
      });

      getEvents(pubkey, eventIds, subId, true);

    });
};


