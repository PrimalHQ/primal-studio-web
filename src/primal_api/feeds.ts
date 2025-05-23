import { FeedPaging, FeedRange, FeedResult, MediaEvent, NostrEventContent } from "../primal";
import { sendMessage, subsTo } from "../utils/socket";
import { Kind } from "../constants";


export const emptyFeedRange = () => ({
  since: 0,
  until: 0,
  order_by: 'created_at',
  elements: [],
}) as FeedRange;

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
  kind: number,
  specification: string,
  subId: string,
  paging?: FeedPaging,
) => {
    return new Promise<FeedResult>((resolve) => {
      let range = emptyFeedRange();
      let mainEvents: string[] = [];
      let auxEvents: string[] = [];

      const unsub = subsTo(subId, {
        onEose: () => {
          unsub();
          resolve({
            specification,
            mainEvents,
            auxEvents,
            range,
          });
        },
        onEvent: (_, event) => {
          if (event.kind === Kind.FeedRange) {
            range = JSON.parse(event.content || '{}') as FeedRange;
            return;
          }

          if (event.kind === kind) {
            // For metadata use pubkey instead of event id.
            const id = kind === Kind.Metadata ? event.pubkey! : event.id;
            mainEvents.push(id);
            return;
          }

          if (event.kind === Kind.Repost) {
            const reposted = JSON.parse(event.content || '{ id: "" }') as NostrEventContent;

            if (reposted.kind === kind) {
              // For metadata use pubkey instead of event id.
              const id = kind === Kind.Metadata ? event.pubkey! : event.id;
              mainEvents.push(id);
              return;
            }
          }

          auxEvents.push(event.id);
        }
      });

      const until = paging?.until || 0;
      const since = paging?.since || 0;
      const limit = paging?.limit || 0;
      const offset = paging?.offset || 0;

      getMegaFeed(pubkey, specification, subId, until, limit, since, offset);

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
