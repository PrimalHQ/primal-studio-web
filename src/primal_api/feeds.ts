import { FeedPaging, FeedRange, FeedResult, NostrEventContent } from "../primal";
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
        onEvent: (_, content) => {
          if (content.kind === Kind.FeedRange) {
            range = JSON.parse(content.content || '{}') as FeedRange;
            return;
          }

          if (content.kind === kind) {
            // For metadata use pubkey instead of event id.
            const id = kind === Kind.Metadata ? content.pubkey! : content.id;
            mainEvents.push(id);
            return;
          }

          if (content.kind === Kind.Repost) {
            const reposted = JSON.parse(content.content || '{ id: "" }') as NostrEventContent;

            if (reposted.kind === kind) {
              // For metadata use pubkey instead of event id.
              const id = kind === Kind.Metadata ? content.pubkey! : content.id;
              mainEvents.push(id);
              return;
            }
          }

          auxEvents.push(content.id);
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
