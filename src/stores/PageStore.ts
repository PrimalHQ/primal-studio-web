import { createStore } from "solid-js/store";
import { FeedRange, FeedResult } from "../primal";
import { emptyFeedRange } from "../primal_api/feeds";
import { eventStore } from "./EventStore";
import { openDB } from 'idb';

export type PageInfo = {
  height: number,
}

export type PageStore = {
  home: {
    feedPages: FeedResult[],
    lastRange: FeedRange,
    isFetching: boolean,
    pageInfo: Record<string,  PageInfo>,
    scrollTop: number,
  },
}

export const emptyStore = () => ({
  home: {
    feedPages: [],
    lastRange: emptyFeedRange(),
    pageInfo: {},
    isFetching: false,
    scrollTop: 0,
  }
});

export const [pageStore, updatePageStore] = createStore<PageStore>(emptyStore());

export const forgetPage = async (page: keyof PageStore, index: number) => {
  const pg = pageStore[page].feedPages[index];

  if (!pg) return;

  const pageEvents = [ ...pg.mainEvents, ...pg.auxEvents];

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
      eventsDb.put(event);
    } catch (e) {

    }

    // updateEventStore(id, () => undefined);
    eventStore.delete(id);
  }

  await transaction.done;
};
