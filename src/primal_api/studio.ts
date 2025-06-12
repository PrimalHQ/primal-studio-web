import { APP_ID } from "src/App";
import { Kind } from "src/constants";
import { signEvent } from "src/utils/nostrApi";
import { primalAPI, sendMessage } from "src/utils/socket";
import { EventFeedResult, FeedRange, FeedResult, NostrEventContent, SendNoteResult, StatsWeights } from "src/primal";
import { emptyEventFeedPage, pageResolve, updateFeedPage } from "src/utils/feeds";
import { fetchKnownProfiles, npubToHex } from "src/utils/profile";
import { v4 as uuidv4 } from 'uuid';
import { userSignedEvent } from "src/utils/primalNostr";

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


export type FeedEventState = 'published' |
  'published-replied' |
  'scheduled' |
  'inbox' |
  'sent' |
  'drafts';

export type FeedTotals = Record<FeedEventState, number>;

export type HomePayload = {
  pubkey?: string,
  since?: number,
  until?: number,
  limit?: number,
  offset?: number,
  resolution?: 'hour' | 'day' | 'month',
  criteria?: 'score' | 'sentiment' | 'oldest' | 'latest',
  state?: FeedEventState,
  kind?: number | 'notes' | 'articles',
};

export const getHomeTotals = async (opts?: HomePayload) => {
  let totals: StudioTotals = emptyStudioTotals();

  const subId = `home_totals_${APP_ID}`;

  const today = Math.floor((new Date()).getTime() / 1_000)

  let payload: HomePayload = {
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

export const getTopEvents = async (opts?: HomePayload & { kind?: number }) => {
  const kind: number = opts?.kind || Kind.Text;

  const identifier = `${kind}_${uuidv4()}`;

  const subId = `home_events_${identifier}_${APP_ID}`;

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
        resolve(pageResolve(page, { offset: payload.offset }));
      },
      onNotice: () => {
        reject('failed_to_fetch_top_events');
      }
    }
    )
  })
};

export const getFeedEvents = async (opts?: HomePayload & { kind?: 'notes' | 'articles' }) => {
  const kind = opts?.kind || 'notes';

  const identifier = `${kind}_${opts?.state || ''}_${uuidv4()}`;

  const subId = `feed_${identifier}_${APP_ID}`;

  const today = Math.floor((new Date()).getTime() / 1_000)

  let payload: HomePayload & { kind: 'notes' | 'articles' }= {
    until: today,
    since: 0,
    limit: 10,
    criteria: 'score',
    offset: 0,
    state: "published",
    kind,
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

  // payload.until = 1749412301

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

  if (opts?.state) {
    payload.state = opts.state;
  }

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: 'feed',
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
        resolve(pageResolve(page, { offset: payload.offset }));
      },
      onNotice: () => {
        reject('failed_to_fetch_top_events');
      }
    })
  })
};


export const getFeedTotals = async (opts?: HomePayload) => {
  let totals: FeedTotals = {
    sent: 0,
    inbox: 0,
    drafts: 0,
    published: 0,
    scheduled: 0,
    'published-replied': 0,
  };

  const today = Math.floor((new Date()).getTime() / 1_000)

  const subId = `feed_totals_${APP_ID}`;

  let payload: HomePayload = {
    until: today,
    since: 0,
    kind: 'notes',
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

  if (opts?.kind) {
    payload.kind = opts.kind;
  }

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: "feed_totals",
      ...payload,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<FeedTotals>((resolve, reject) => {
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
        totals = JSON.parse(event.content || '[]');
      },
      onEose: () => {
        resolve(totals);
      },
      onNotice: () => {
        reject('failed_to_fetch_feed_totals');
      }
    }
    )
  })
};

// Settings --------------------------------------------

export type SettingsList = { pubkey?: string, kind?: 'notes' | 'articles', rss_feed_url?: string}[];

export const getSettingsList = async (
  listType: 'inbox_permissions' | 'content_imports',
) => {

  const subId = `get_settings_${listType}_${APP_ID}`;

  let payload: { kind?: 'notes' | 'articles' } = {};

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: `settings_${listType}_list`,
      ...payload
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<SettingsList>((resolve, reject) => {

    let list: string[] = [];

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
        list = JSON.parse(event.content || '[]');
      },
      onEose: () => {
        resolve(list as SettingsList);
      },
      onNotice: () => {
        reject(`failed_to_fetch_settings_${listType}_list`);
      }
    });
  });
}

export const addToSettingsList = async (
  listType: 'inbox_permissions' | 'content_imports',
  item: string,
  kind?: 'notes' | 'articles',
) => {
  if (!kind && listType === 'content_imports') {
    kind = 'notes';
  }

  const subId = `add_settings_${listType}_${kind || ''}_${APP_ID}`;

  let payload: {
    kind?: 'notes' | 'articles',
    pubkey?: string,
    rss_feed_url?: string,
  } = {};

  if (kind) {
    payload.kind = kind;
  }

  if (listType === 'inbox_permissions') {
    payload.pubkey = item;
  }

  if (listType === 'content_imports') {
    payload.rss_feed_url = item;
  }

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: `settings_${listType}_add`,
      ...payload
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<string[]>((resolve, reject) => {

    let list: string[] = [];

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
        list = JSON.parse(event.content || '[]');
      },
      onEose: () => {
        resolve(list);
      },
      onNotice: () => {
        reject(`failed_to_add_settings_${listType}_list`);
      }
    });
  });
}

export const removeFromSettingsList = async (
  listType: 'inbox_permissions' | 'content_imports',
  item: string,
  kind?: 'notes' | 'articles',
) => {
  if (!kind && listType === 'content_imports') {
    kind = 'notes';
  }

  const subId = `add_settings_${listType}_${kind || ''}_${APP_ID}`;

  let payload: {
    kind?: 'notes' | 'articles',
    pubkey?: string,
    rss_feed_url?: string,
  } = {};

  if (kind) {
    payload.kind = kind;
  }

  if (listType === 'inbox_permissions') {
    payload.pubkey = item;
  }

  if (listType === 'content_imports') {
    payload.rss_feed_url = item;
  }

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: `settings_${listType}_remove`,
      ...payload
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<string[]>((resolve, reject) => {

    let list: string[] = [];

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
        list = JSON.parse(event.content || '[]');
      },
      onEose: () => {
        resolve(list);
      },
      onNotice: () => {
        reject(`failed_to_add_settings_${listType}_list`);
      }
    });
  });
}

export const importScheduled = async (draft: any) => {
  // {"op":"import_scheduled", "event": {...}}

  const subId = `import_scheduled_${APP_ID}`;

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: 'import_scheduled',
      event: draft,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<SendNoteResult>((resolve, reject) => {
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
      },
      onEose: () => {
        resolve({ success: true, note: signedNote });
      },
      onNotice: () => {
        resolve( {success: false, note: signedNote, reasons: ['failed_to_schedule']});
      }
    })
  });
}

export const replaceScheduled = async (draft: any, replace_id: string) => {
  // {"op":"import_scheduled", "event": {...}}

  const subId = `replace_scheduled_${replace_id}_${draft.id}_${APP_ID}`;

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: 'replace_scheduled',
      old_event_id: replace_id,
      event: draft,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<SendNoteResult>((resolve, reject) => {
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
      },
      onEose: () => {
        resolve({ success: true, note: signedNote });
      },
      onNotice: () => {
        resolve( {success: false, note: signedNote, reasons: ['failed_to_schedule']});
      }
    })
  });
}

export const deleteFromInbox = async (ids: string[]) => {
  // {"op":"import_scheduled", "event": {...}}

  const subId = `delete_from_inbox_${APP_ID}`;

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: 'delete_from_inbox',
      event_ids: ids,
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<SendNoteResult>((resolve, reject) => {
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
      },
      onEose: () => {
        resolve({ success: true, note: signedNote });
      },
      onNotice: () => {
        resolve( {success: false, note: signedNote, reasons: ['failed_to_schedule']});
      }
    })
  });
}

export const getScheduledEvents = async (ids: string[]) => {
  const subId = `get_scheduled_${APP_ID}`;

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: 'get_scheduled',
      event_ids: ids,
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
        resolve(pageResolve(page));
      },
      onNotice: () => {
        reject('failed_to_fetch_top_events');
      }
    })
  })
};

export const getStatWeights = async (
) => {
  const subId = `get_scores_${APP_ID}`;

  let payload = {};

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: `scoring`,
      ...payload
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<StatsWeights>((resolve, reject) => {

    let weights: StatsWeights = {};

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
        weights = JSON.parse(event.content || '{}');
      },
      onEose: () => {
        resolve(weights);
      },
      onNotice: () => {
        reject(`failed_to_fetch_score_weights`);
      }
    });
  });
}

export const getMediaUses = async (
  urls: string[],
) => {
  const subId = `media_uses_${APP_ID}`;

  let payload = {
    urls,
  };

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      op: `media_files_usage`,
      ...payload
    }),
  };

  const signedNote = await signEvent(event);

  return new Promise<EventFeedResult & { usage: Record<string, string[]> }>((resolve, reject) => {

    let page = { ...emptyEventFeedPage() };
    let usage: Record<string, string[]> = {};

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
        if (event.kind === Kind.StudioMediaUseage) {
          usage = JSON.parse(event.content || '{}');
          return;
        }
        updateFeedPage(page, event);
      },
      onEose: () => {
        resolve({ ...pageResolve(page), usage });
      },
      onNotice: () => {
        reject('failed_to_fetch_top_events');
      }
    });
  });
}
