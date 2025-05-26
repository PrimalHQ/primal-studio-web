import { APP_ID } from "src/App";
import { Kind } from "src/constants";
import { signEvent } from "src/utils/nostrApi";
import { primalAPI, sendMessage } from "src/utils/socket";
import { EventFeedResult, FeedRange, FeedResult, NostrEventContent } from "src/primal";
import { emptyEventFeedPage, pageResolve, updateFeedPage } from "src/utils/feeds";
import { fetchKnownProfiles, npubToHex } from "src/utils/profile";

export type StudioTotals = {
  bookmarks: number,
  mentions: number,
  quotes: number,
  reactions: number,
  replies: number,
  reposts: number,
  satszapped_received: number,
  satszapped_sent: number,
  zaps_received: number,
  zaps_sent: number,
}

export type StudioGraph = {
  bookmarks: number,
  mentions: number,
  quotes: number,
  reactions: number,
  replies: number,
  reposts: number,
  satszapped_received: number,
  satszapped_sent: number,
  zaps_received: number,
  zaps_sent: number,
  score: number,
  t: number,
};

export const emptyStudioTotals = () => ({
  bookmarks: 0,
  mentions: 0,
  quotes: 0,
  reactions: 0,
  replies: 0,
  reposts: 0,
  satszapped_received: 0,
  satszapped_sent: 0,
  zaps_received: 0,
  zaps_sent: 0,
});

export type HomePayload = {
  pubkey?: string,
  since?: number,
  until?: number,
  limit?: number,
  offset?: number,
  resolution?: 'hour' | 'day' | 'month',
  criteria?: 'score' | 'sentiment' | 'oldest' | 'latest',
};

export const getHomeTotals = async (opts?: HomePayload) => {
  let totals: StudioTotals = emptyStudioTotals();

  const subId = `home_totals_${APP_ID}`;

  const today = Math.floor((new Date()).getTime() / 1_000)

  let payload: HomePayload = {
    until: today,
    since: today - 30 * 24 * 60 * 60 ,
  };

  if (opts?.pubkey) {
    let pk = npubToHex(opts.pubkey);
    const vanityName = await fetchKnownProfiles(pk);

    if (vanityName.names[pk]) {
      pk = vanityName.names[pk];
    }

    payload.pubkey = pk;
  }

  if ((opts?.until || 0) > 0) {
    // @ts-ignore
    payload.until = opts.until;
  }

  if ((opts?.since || 0) > 0) {
    // @ts-ignore
    payload.since = opts.since
  }

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: "home_totals",
      ...payload,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<StudioTotals>((resolve, reject) => {
    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: [
            "studio_operation",
            {
              event_from_user: signedNote,
            }
          ]},
        ]))
      },
      onEvent: (event) => {
        totals = JSON.parse(event.content || '{}');
      },
      onEose: () => {
        resolve(totals);
      },
      onNotice: () => {
        reject('failed_to_fetch_relays');
      }
    }
    )
  })
};

export const getHomeGraph = async (opts?: HomePayload) => {
  let graph: StudioGraph[] = [];

  const subId = `home_graph_${APP_ID}`;

  const today = Math.floor((new Date()).getTime() / 1_000)

  let payload: HomePayload = {
    resolution: 'day',
    until: today,
    since: 0 ,
  };

  if (opts?.pubkey) {
    let pk = npubToHex(opts.pubkey);
    const vanityName = await fetchKnownProfiles(pk);

    if (vanityName.names[pk]) {
      pk = vanityName.names[pk];
    }

    payload.pubkey = pk;
  }

  if ((opts?.until || 0) > 0) {
    // @ts-ignore
    payload.until = opts.until;
  }

  if ((opts?.since || 0) > 0) {
    // @ts-ignore
    payload.since = opts.since
  }

  if (opts?.resolution) {
    payload.resolution = opts.resolution;
  }

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: "home_graph",
      ...payload,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<StudioGraph[]>((resolve, reject) => {
    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: [
            "studio_operation",
            {
              event_from_user: signedNote,
            }
          ]},
        ]))
      },
      onEvent: (event) => {
        graph = JSON.parse(event.content || '[]');
      },
      onEose: () => {
        resolve(graph);
      },
      onNotice: () => {
        reject('failed_to_fetch_relays');
      }
    }
    )
  })
};

export const getTopEvents = async (opts?: HomePayload & { kind?: number, ident?: string }) => {
  const kind: number = opts?.kind || Kind.Text;

  const subId = `home_events_${opts?.ident || ''}_${APP_ID}`;

  const today = Math.floor((new Date()).getTime() / 1_000)

  let payload: HomePayload = {
    until: today,
    since: 0,
    limit: 10,
    criteria: 'score',
    offset: 0,
  };


  if (opts?.pubkey) {
    let pk = npubToHex(opts.pubkey);
    const vanityName = await fetchKnownProfiles(pk);

    if (vanityName.names[pk]) {
      pk = vanityName.names[pk];
    }

    payload.pubkey = pk;
  }

  if ((opts?.until || 0) > 0) {
    payload.until = opts!.until;
  }

  if ((opts?.since || 0) > 0) {
    payload.since = opts!.since;
  }

  if ((opts?.limit || 0) > 0) {
    payload.limit = opts!.limit;
  }

  if (opts?.criteria) {
    payload.criteria = opts.criteria;
  }

  if (opts?.offset) {
    payload.offset = opts.offset;
  }

  const op = kind === Kind.LongForm ?
    'home_top_articles' :
    'home_top_notes';

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op,
      ...payload,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<EventFeedResult>((resolve, reject) => {

    let page = { ...emptyEventFeedPage() };

    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: [
            "studio_operation",
            {
              event_from_user: signedNote,
            }
          ]},
        ]))
      },
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        resolve(pageResolve(page, `${payload.offset}`));
      },
      onNotice: () => {
        reject('failed_to_fetch_relays');
      }
    }
    )
  })
};
