import { createStore } from "solid-js/store";
import { FeedRange, FeedResult } from "../primal";
import { emptyFeedRange } from "../primal_api/feeds";
import { eventStore } from "./EventStore";

export type PageInfo = {
  height: number,
}

export type PageStore = {
  home: {
    feedPages: FeedResult[],
    lastRange: FeedRange,
    isFetching: boolean,
    pageInfo: Record<string,  PageInfo>
  },
}

export const emptyStore = () => ({
  home: {
    feedPages: [],
    lastRange: emptyFeedRange(),
    pageInfo: {},
    isFetching: false,
  }
});

export const [pageStore, updatePageStore] = createStore<PageStore>(emptyStore());

export const forgetPage = (page: keyof PageStore, index: number) => {
  const pg = pageStore[page].feedPages[index];

  if (!pg) return;

  const pageEvents = [ ...pg.mainEvents, ...pg.auxEvents];

  for (let i=0; i<pageEvents.length;i++) {
    // updateEventStore(pageEvents[i], () => undefined);
    eventStore.delete(pageEvents[i]);
  }
};
