import { createStore } from "solid-js/store";
import { FeedRange, FeedResult } from "../primal";
import { emptyFeedRange } from "../primal_api/feeds";

export type PageInfo = {
  height: number,
}

export type PageStore = {
  home: {
    feedPages: FeedResult[],
    lastRange: FeedRange,
    isFetching: boolean,
    pageInfo: Record<string,  PageInfo>
  };
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
