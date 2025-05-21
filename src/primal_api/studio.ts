import { APP_ID } from "src/App";
import { Kind, WEEK } from "src/constants";
import { signEvent } from "src/utils/nostrApi";
import { primalAPI, sendMessage } from "src/utils/socket";

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

type HomePayload = {
  pubkey?: string,
  since?: number,
  until?: number,
  resolution?: 'hour' | 'day' | 'month',
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
    payload.pubkey = opts.pubkey;
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
    since: today - 30 * 24 * 60 * 60 ,
  };

  if (opts?.pubkey) {
    payload.pubkey = opts.pubkey;
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
