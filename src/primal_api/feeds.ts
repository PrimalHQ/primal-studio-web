import { FeedPaging, FeedRange } from "../primal";
import { sendMessage, subsTo } from "../utils/socket";
import { addEventToStore } from '../stores/EventStore';
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

export const fetchMegaFeed = (
  pubkey: string | undefined,
  specification: any,
  subId: string,
  paging?: FeedPaging,
) => {
    return new Promise<FeedRange>((resolve) => {
      let feedRange = emptyFeedRange();

      const unsub = subsTo(subId, {
        onEose: () => {
          unsub();
          resolve(feedRange);
        },
        onEvent: (_, content) => {
          if (content.kind === Kind.FeedRange) {
            feedRange = JSON.parse(content.content || '{}') as FeedRange;
          }
        }
      });

      const until = paging?.until || 0;
      const since = paging?.since || 0;
      const limit = paging?.limit || 0;

      let offset = 0;

      if (typeof paging?.offset === 'number') {
        offset = paging.offset;
      }
      else if (Array.isArray(paging?.offset)) {
        if (until > 0) {
          offset = (paging?.offset || []).filter(v => v === until).length;
        }

        if (since > 0) {
          offset = (paging?.offset || []).filter(v => v === since).length;
        }
      }

      getMegaFeed(pubkey, specification, subId, until, limit, since, offset);

    });
};
