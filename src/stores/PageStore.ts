import { createStore } from "solid-js/store";
import { EventFeedResult, FeedRange } from "../primal";
import { eventStore } from "./EventStore";
import { openDB } from 'idb';
import { emptyFeedRange } from "src/utils/feeds";

export type PageInfo = {
  height: number,
}

export type PageStore = {
  homeNotes: {
    feedPages: EventFeedResult[],
    lastRange: FeedRange,
    isFetching: boolean,
    mainEventKey: keyof EventFeedResult,
    pageInfo: Record<string,  PageInfo>,
    scrollTop: number,
  },
  homeArticles: {
    feedPages: EventFeedResult[],
    lastRange: FeedRange,
    isFetching: boolean,
    mainEventKey: keyof EventFeedResult,
    pageInfo: Record<string,  PageInfo>,
    scrollTop: number,
  },
  notes: {
    feedPages: EventFeedResult[],
    lastRange: FeedRange,
    isFetching: boolean,
    mainEventKey: keyof EventFeedResult,
    pageInfo: Record<string,  PageInfo>,
    scrollTop: number,
  },
}

export const emptyStore = (): PageStore => ({
  homeNotes: {
    feedPages: [],
    lastRange: emptyFeedRange(),
    pageInfo: {},
    mainEventKey: 'notes',
    isFetching: false,
    scrollTop: 0,
  },
  homeArticles: {
    feedPages: [],
    lastRange: emptyFeedRange(),
    pageInfo: {},
    mainEventKey: 'reads',
    isFetching: false,
    scrollTop: 0,
  },
  notes: {
    feedPages: [],
    lastRange: emptyFeedRange(),
    pageInfo: {},
    mainEventKey: 'notes',
    isFetching: false,
    scrollTop: 0,
  },
});

export const [pageStore, updatePageStore] = createStore<PageStore>(emptyStore());

export const forgetPage = async (page: keyof PageStore, index: number) => {
  const pg = pageStore[page].feedPages[index];

  if (!pg) return;

  const pageEvents = [ ...pg.eventIds ];

  let db = await openDB('store', 1, {
    upgrade(database, oldVersion, newVersion, transaction, event) {
      if (oldVersion === 0) {
        database.createObjectStore('events', { keyPath: 'id' });
      }
    },
  });

  let transaction = db.transaction('events', 'readwrite');
  let eventsDb = transaction.objectStore('events');

  for (let i=0; i<pageEvents.length;i++) {
    const id = pageEvents[i];
    const event = eventStore.get(id)

    try {
      // Store in DB
      eventsDb.put(event);
    } catch (e) {

    }

    // updateEventStore(id, () => undefined);

    // Remove from store
    eventStore.delete(id);
  }

  await transaction.done;
};

export const rememberPage = async (page: keyof PageStore, index: number) => {

}

export const clearPageStore = (page: keyof PageStore) => {
  updatePageStore(page, () => ({ ...emptyStore()[page] }))
}
