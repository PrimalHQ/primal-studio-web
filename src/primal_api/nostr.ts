import { Kind } from "src/constants";
import { NostrEventContent, NostrRelayEvent, NostrRelaySignedEvent, PrimalUser, SendNoteResult } from "src/primal";
import { relayStore } from "src/stores/RelayStore";
import { logError, logInfo } from "src/utils/logger";
import { encrypt44, signEvent } from "src/utils/nostrApi";
import { Relay } from "src/utils/nTools";
import { sendMessage, subsTo } from "src/utils/socket";
import { triggerImportEvents } from "./events";
import { APP_ID } from "src/App";
import { ArticleEdit } from "src/components/ArticleEditor/ArticleEditor";
import { generateArticleIdentifier } from "src/utils/kyes";

export const proxyEvent = async (event: NostrRelayEvent) => {
  let signedNote: NostrRelaySignedEvent | undefined;

  const relays = relayStore.connected;
  const relaySettings = relayStore.settings;

  try {
    signedNote = await signEvent(event);
    if (!signedNote) throw('event_not_signed');
  } catch (reason) {
    logError('Failed to send event: ', reason);
    return { success: false , reasons: [reason]} as SendNoteResult;
  }

  // Relay hints from `e` tags
  const hintRelayUrls = event.tags.reduce((acc, t) => {
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


export const sendArticle = async (articleData: ArticleEdit, tags: string[][]) => {
  const time = Math.floor((new Date()).getTime() / 1000);

  const articleTags = [...(articleData.tags || [])];

  const pubTime = articleTags.find(t => t[0] === 'published_at')

  let timeTags = pubTime ? [[...pubTime] ]: [["published_at", `${time}`]]

  const event = {
    content: articleData.content,
    kind: Kind.LongForm,
    tags: [
      ...tags,
      ...timeTags,
    ],
    created_at: time,
  };

  const response = await sendEvent(event);

  if (response.success && response.note) {
    triggerImportEvents([response.note], `del_last_draft_import_${APP_ID}`);
  }

  return response;
}



export const sendEvent = async (
  event: NostrRelayEvent,
  opts?: { relays: Relay[] },
) => {

  const shouldProxy = relayStore.proxyThroughPrimal;

  if (shouldProxy) {
    return await proxyEvent(event);
  }

  const relaySettings = relayStore.settings;
  let relays = relayStore.connected;

  if (opts?.relays !== undefined) {
    const unique = opts.relays.filter(or => relays.find(r => r.url === or.url) === undefined);
    relays = [...relays, ...unique];
  }

  let signedNote: NostrRelaySignedEvent | undefined;

  try {
    signedNote = await signEvent(event);
    if (!signedNote) throw('event_not_signed');
  } catch (reason) {
    logError('Failed to send event: ', reason);
    return { success: false , reasons: [reason]} as SendNoteResult;
  }

  let responses = [];
  let reasons: string[] = [];

  // Relay hints fromm `e` tags
  const hintRelayUrls = event.tags.reduce((acc, t) => {
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
    relaysActual = Object.keys(relaySettings || {}).map(url => new Relay(url));
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
        const relay = new Relay(url);
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
    return await proxyEvent(event);
    // return { success: false, reasons, note: signedNote} as SendNoteResult;
  }
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

export const sendDraft = async (
  user: PrimalUser,
  article: ArticleEdit,
  mdContent: string,
): Promise<SendNoteResult> => {
  const pk = user.pubkey;
  const identifier = generateArticleIdentifier(article.title);
  const time = Math.floor((new Date()).getTime() / 1000);
  const tags = article.tags.map((t) => ['t', t]);
  const a = {
    content: mdContent,
    kind: Kind.LongForm,
    tags: [
      ["title", article.title],
      ["summary", article.summary],
      ["image", article.image],
      ["d", identifier],
      ['client', 'primal-web'],
      ...tags,
    ],
    created_at: time,
  };

  const e = await encrypt44(pk, JSON.stringify(a));
  // const d = await decrypt44(pk, e);

  const draft = {
    kind: Kind.Draft,
    created_at: Math.floor((new Date()).getTime() / 1_000),
    tags: [
      ['d', identifier],
      ['k', `${Kind.LongForm}`],
      ['client', 'primal-web'],
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
