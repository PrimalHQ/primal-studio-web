import { Kind } from "src/constants";
import { NostrRelayEvent, NostrRelaySignedEvent, PrimalUser, SendNoteResult } from "src/primal";
import { relayStore } from "src/stores/RelayStore";
import { logError, logInfo } from "src/utils/logger";
import { encrypt44, signEvent } from "src/utils/nostrApi";
import { Relay, RelayFactory } from "src/utils/nTools";
import { sendMessage, subsTo } from "src/utils/socket";
import { triggerImportEvents } from "./events";
import { APP_ID } from "src/App";
import { ArticleEdit } from "src/components/ArticleEditor/ArticleEditor";
import { generateArticleIdentifier } from "src/utils/kyes";
import { importScheduled, replaceScheduled } from "./studio";
import { accountStore } from "src/stores/AccountStore";
import { v4 as uuidv4 } from 'uuid';

export const proxySignedEvent = async (signedNote: NostrRelaySignedEvent) => {

  const relays = relayStore.connected;
  const relaySettings = relayStore.settings;

  // Relay hints from `e` tags
  const hintRelayUrls = signedNote.tags.reduce((acc, t) => {
    if (
      t[0] === 'e' &&
      t[2] &&
      t[2].length > 0 &&
      !relays.find(r => r.url === t[2])
    ) {
      return [ ...acc, t[2] ];
    }

    return [...acc];
  }, []);

  let userRelays: Relay[] = relaySettings ?
    relays.filter((relay) => (relaySettings[relay.url] || { read: true, write: true }).write) :
    [...relays];

  const publishRelays = new Set<string>([ ...userRelays.map(r => r.url), ...hintRelayUrls]);

  const promise = new Promise<boolean>((resolve, reject) => {
    if (!signedNote) {
      reject("Note not signed");
      return;
    }

    const subId = `publish_event_${signedNote.id}`;

    const unsub = subsTo(subId, {
      onEvent: () => {
        unsub();
        resolve(true);
      },
      onNotice: () => {
        unsub();
        reject("Failed to publish note");
      },
      onEose: () => {
        unsub();
        reject('No publish confirmation')
      }
    })

    sendMessage(JSON.stringify([
      "REQ",
      subId,
      { cache: ["broadcast_events", { events: [signedNote], relays: Array.from(publishRelays) }]}
    ]));
  });

  try {
    await Promise.race([promise]);

    return { success: true, note: signedNote } as SendNoteResult;
  }
  catch (e) {
    logError('Failed to publish the note: ', e);
    return { success: false, reasons: [e], note: signedNote} as SendNoteResult;
  }
}

export const proxyEvent = async (event: NostrRelayEvent) => {
  let signedNote: NostrRelaySignedEvent | undefined;

  try {
    signedNote = await signEvent(event);
    if (!signedNote) throw('event_not_signed');
  } catch (reason) {
    logError('Failed to send event: ', reason);
    return { success: false , reasons: [reason]} as SendNoteResult;
  }

  return await proxySignedEvent(signedNote);
}

export const sendArticle = async (articleData: ArticleEdit, tags: string[][]) => {
  const time = Math.floor((new Date()).getTime() / 1000);

  // let articleTags = [...(articleData.tags || [])];

  const pubTime = tags.find(t => t[0] === 'published_at')

  if (!pubTime) {
    tags.push(["published_at", `${time}`])
  }
  const event = {
    content: articleData.content,
    kind: Kind.LongForm,
    tags: [
      ...tags,
      // ...articleTags,
    ],
    created_at: time,
  };

  const response = await sendEvent(event);

  if (response.success && response.note) {
    triggerImportEvents([response.note], `send_article_import_${APP_ID}`);
  }

  return response;
}

export const scheduleArticle = async (
  articleData: ArticleEdit,
  tags: string[][],
  pubTime: number,
  replace_id?: string,
) => {
  const hasPubTime = tags.find(t => t[0] === 'published_at');

  // const time = Math.floor((new Date(pubTime * 1_000)).getTime() / 1_000)

  let pubTags: string[][] = [];

  if (!hasPubTime) {
    pubTags.push(["published_at", `${pubTime}`])
  } else {
    tags = tags.map(
      t => t[0] === 'published_at' ? ['published_at', `${pubTime}`] : t);
  }

  const event: NostrRelayEvent = {
    content: articleData.content,
    kind: Kind.LongForm,
    tags: [
      // ...articleData.tags,
      ...tags,
      ...pubTags,
    ],
    created_at: pubTime,
  };

  const signedEvent = await signEvent(event)

  const response = replace_id ?
    await replaceScheduled(signedEvent, replace_id) :
    await importScheduled(signedEvent);

  // if (response.success && response.note) {
  //   triggerImportEvents([response.note], `del_last_draft_import_${APP_ID}`);
  // }

  return response;
}


export const sendSignedEvent = async (
  signedNote: NostrRelaySignedEvent,
  options?: {
    success?: (event?: NostrRelaySignedEvent) => void,
    fail?: (event?: NostrRelaySignedEvent) => void,
    relays?: Relay[],
  }) => {

  let responses = [];
  let reasons: string[] = [];

  const relaySettings = relayStore.settings;
  let relays = relayStore.connected;

  if (options?.relays !== undefined) {
    const unique = options.relays.filter(or => relays.find(r => r.url === or.url) === undefined);
    relays = [...relays, ...unique];
  }

  // Relay hints fromm `e` tags
  const hintRelayUrls = signedNote.tags.reduce((acc, t) => {
    if (
      t[0] === 'e' &&
      t[2] &&
      t[2].length > 0 &&
      !relays.find(r => r.url === t[2])
    ) {
      return [ ...acc, t[2] ];
    }

    return [...acc];
  }, []);

  let relaysActual = relays;

  if (relaysActual.length === 0) {
    relaysActual = Object.keys(relaySettings || {}).map(url => new RelayFactory(url));
  }

  for (let i = 0;i < relaysActual.length;i++) {

    const relay = relaysActual[i];

    const settings = (relaySettings && relaySettings[relay.url]) || { read: true, write: true };

    if (!settings.write) continue;

    responses.push(new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        logError(`Publishing note to ${relay.url} has timed out`);
        reasons.push('timeout');
        reject('timeout');
      }, 8_000);

      try {
        logInfo('publishing to relay: ', relay, signedNote)

        await relay.publish(signedNote);

        logInfo(`${relay.url} has accepted our event`);
        clearTimeout(timeout);
        resolve('success');

      } catch (e) {
        logError(`Failed publishing note to ${relay.url}: `, e);
        clearTimeout(timeout);
        reasons.push(`${e}`);
        reject(e);
      }
    }));
  }

  for (let i = 0;i < hintRelayUrls.length;i++) {
    const url = hintRelayUrls[i];

    try {
      new Promise<string>(async (resolve, reject) => {
        const relay = new RelayFactory(url);
        await relay.connect();

        try {
          logInfo('publishing to relay hint: ', relay)

          await relay.publish(signedNote);

          logInfo(`hint ${relay.url} has accepted our event`);
          resolve('success');

        } catch (e) {
          logError(`Failed publishing note to hint ${relay.url}: `, e);
          reject('success');
        }

        relay.close();
      });

    } catch (err) {
      logError('REALY ERROR: ', err)
    }
  }

  try {
    await Promise.any(responses);

    return { success: true, note: signedNote } as SendNoteResult;
  }
  catch (e) {
    logError('Failed to publish the note: ', e);
    logInfo('Will attempt to proxy through Primal.')
    return await proxySignedEvent(signedNote);
    // return { success: false, reasons, note: signedNote} as SendNoteResult;
  }


  // const relays = [...relayStore.connected];

  // // Relay hints fromm `e` tags
  // const hintRelayUrls = event.tags.reduce((acc, t) => {
  //   if (
  //     t[0] === 'e' &&
  //     t[2] &&
  //     t[2].length > 0 &&
  //     !relays.find(r => r === t[2])
  //   ) {
  //     return [ ...acc, t[2] ];
  //   }

  //   return [...acc];
  // }, []);

  // const allRelays = [
  //   ...relays.map(r => r),
  //   ...hintRelayUrls,
  // ];

  // if (callbacks) {
  //   const onSuccess = (e: MessageEvent<{ type: string, event: NostrRelaySignedEvent }>) => {
  //     const { type, event: rEvent } = e.data;

  //     if (type === 'EVENT_SENT' && rEvent.id === event.id) {
  //       callbacks.success?.(rEvent);
  //       relayWorker.removeEventListener('message', onSuccess);
  //       return;
  //     }
  //   }

  //   relayWorker.addEventListener('message', onSuccess);
  // }

  // relayWorker.postMessage({type: 'SEND_EVENT', eventData: { event: unwrap(event), relays: allRelays }});
}

export const sendEvent = async (
  event: NostrRelayEvent,
  opts?: { relays: Relay[] },
) => {

  const shouldProxy = relayStore.proxyThroughPrimal;

  if (shouldProxy) {
    return await proxyEvent(event);
  }

  let signedNote: NostrRelaySignedEvent | undefined;

  try {
    signedNote = await signEvent(event);
    if (!signedNote) throw('event_not_signed');
  } catch (reason) {
    logError('Failed to send event: ', reason);
    return { success: false , reasons: [reason]} as SendNoteResult;
  }

  return sendSignedEvent(signedNote, { relays: opts?.relays })
}

export const sendDeleteEvent = async (
  pubkey: string,
  eventId: string,
  kind: number,
): Promise<SendNoteResult> => {
  const isCoordinate = eventId.split(':').length === 3;

  const tagLabel = isCoordinate ? 'a' : 'e';

  const ev: NostrRelayEvent & { pubkey: string } = {
    kind: Kind.EventDeletion,
    pubkey,
    tags: [
      [tagLabel, eventId],
      ["k", `${kind}`],
    ],
    content: "Deleted by the author",
    created_at: Math.floor((new Date()).getTime() / 1_000),
  };

  const response = await sendEvent(ev);

  if (response.success && response.note) {
    triggerImportEvents([response.note], `del_last_draft_import_${APP_ID}`);
  }

  return response;
};

export const sendArticleDraft = async (
  user: PrimalUser,
  article: ArticleEdit,
  mdContent: string,
  pubTime?: number,
): Promise<SendNoteResult> => {
  const pk = user.pubkey;
  const identifier = generateArticleIdentifier(article.title);
  const time = pubTime || Math.floor((new Date()).getTime() / 1000);
  const keywords = article.keywords.map((t) => ['t', t]);

  const a = {
    content: mdContent,
    kind: Kind.LongForm,
    tags: [
      ["title", article.title],
      ["summary", article.summary],
      ["image", article.image],
      ["d", identifier],
      ['client', 'Primal Studio'],
      ['published_at', `${time}`],
      ...article.tags,
      ...keywords,
    ],
    created_at: time,
  };

  const e = await encrypt44(pk, JSON.stringify(a));
  // const d = await decrypt44(pk, e);

  let draftTags: string[][] = []

  if (pk != accountStore.pubkey) {
    draftTags.push(['p', pk])
  }

  const draft = {
    kind: Kind.Draft,
    created_at: Math.floor((new Date()).getTime() / 1_000),
    tags: [
      ['d', identifier],
      ['k', `${Kind.LongForm}`],
      ['client', 'Primal Studio'],
      ...draftTags,
      // ["e", "<anchor event event id>", "<relay-url>"],
      // ["a", "<anchor event address>", "<relay-url>"],
    ],
    content: e,
    // other fields
  }

  const response = await sendEvent(draft);

  if (response.success && response.note) {
    triggerImportEvents([response.note], `draft_import_${APP_ID}`);
  }

  return response;
};

export const sendNote = async (text: string, tags: string[][]) => {
  const event = {
    content: text,
    kind: Kind.Text,
    tags: [ ...tags, ['client', 'Primal Studio']],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const response = await sendEvent(event);

  if (response.success && response.note) {
    triggerImportEvents([response.note], `note_import_${APP_ID}`);
  }

  return response;

}

export const scheduleNote = async (
  content: string,
  tags: string[][],
  pubTime: number,
  replace_id?: string,
) => {
  let tgs = [...tags];

  const event = {
    content,
    kind: Kind.Text,
    tags: [
      ...tgs,
    ],
    created_at: pubTime,
  };

  const signedEvent = await signEvent(event)

  const response = replace_id ?
    await replaceScheduled(signedEvent, replace_id) :
    await importScheduled(signedEvent);

  // if (response.success && response.note) {
  //   triggerImportEvents([response.note], `del_last_draft_import_${APP_ID}`);
  // }

  return response;
}

export const sendNoteDraft = async (
  user: PrimalUser,
  content: string,
  tags: string[][],
  pubTime?: number,
): Promise<SendNoteResult> => {
  const pk = user.pubkey;
  const identifier = generateArticleIdentifier(uuidv4());
  const time = pubTime || Math.floor((new Date()).getTime() / 1000);

  const a = {
    content,
    kind: Kind.Text,
    tags,
    created_at: time,
  };

  const e = await encrypt44(pk, JSON.stringify(a));
  // const d = await decrypt44(pk, e);

  let draftTags: string[][] = []

  if (pk != accountStore.pubkey) {
    draftTags.push(['p', pk])
  }

  const draft = {
    kind: Kind.Draft,
    created_at: Math.floor((new Date()).getTime() / 1_000),
    tags: [
      ['d', identifier],
      ['k', `${Kind.Text}`],
      ['client', 'Primal Studio'],
      ...draftTags,
      // ["e", "<anchor event event id>", "<relay-url>"],
      // ["a", "<anchor event address>", "<relay-url>"],
    ],
    content: e,
    // other fields
  }

  const response = await sendEvent(draft);

  if (response.success && response.note) {
    await triggerImportEvents([response.note], `draft_import_${APP_ID}`);
  }

  return response;
};
