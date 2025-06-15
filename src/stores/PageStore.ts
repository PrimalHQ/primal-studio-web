import { createStore } from "solid-js/store";
import { EventFeedResult, FeedRange } from "../primal";
import { eventStore, removeEventFromEventStore } from "./EventStore";
import { openDB } from 'idb';
import { emptyFeedRange } from "src/utils/feeds";

export type PageInfo = {
  height: number,
}

export type PageConfig = {
  feedPages: EventFeedResult[],
  lastRange: FeedRange,
  isFetching: boolean,
  mainEventKey: keyof EventFeedResult,
  pageInfo: Record<string,  PageInfo>,
  scrollTop: number,
}

export type PageStore = {
  homeNotes: PageConfig,
  homeArticles: PageConfig,
  notes: PageConfig,
  articles: PageConfig,
}

export const emptyPageConfig = (mainEventKey: keyof EventFeedResult) => ({
  feedPages: [],
  lastRange: emptyFeedRange(),
  pageInfo: {},
  mainEventKey,
  isFetching: false,
  scrollTop: 0,
});

export const emptyStore = (): PageStore => ({
  homeNotes: emptyPageConfig('notes'),
  homeArticles: emptyPageConfig('reads'),
  notes: emptyPageConfig('notes'),
  articles: emptyPageConfig('reads'),
});

export const [pageStore, updatePageStore] = createStore<PageStore>(emptyStore());

export const removeEventFromPageStore = (
  eventId: string,
  eventType: 'notes' | 'reads' | 'users' | 'drafts' | 'zaps',
) => {
  const keys = Object.keys(pageStore) as (keyof PageStore)[];

  keys.forEach(key => {
    const pageIndex = pageStore[key].feedPages.findIndex(e => e.eventIds.includes(eventId));

    if (pageIndex < 0) return;

    // const eventKey = pageStore[key].mainEventKey;

    // if (!['notes', 'reads', 'users', 'drafts', 'zaps'].includes(eventKey))
    //   return;

    updatePageStore(key, 'feedPages', (pages) => {
      let newPages = [...pages];
      let page = newPages[pageIndex];

      newPages[pageIndex] = {
        ...page,
        // @ts-ignore
        [eventType]: page[eventType].filter(ev => ev.id !== eventId),
      }

      return newPages;
    })


  })


  removeEventFromEventStore(eventId);
}

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
