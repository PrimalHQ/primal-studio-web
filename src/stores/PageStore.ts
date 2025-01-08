import { createStore } from "solid-js/store";
import { FeedPaging, FeedRange } from "../primal";

export type PageStore = {
  home: {
    notes: string[],
    range: FeedRange,
    isFetching: boolean,
    noteSizes: Record<string,  number>
  };
}

export const emptyStore = () => ({
  home: {
    notes: [],
    range: {
      order_by: 'created_at',
      since: 0,
      until: 0,
      elements: [],
    },
    noteSizes: {},
    isFetching: false,
  }
});

export const [pageStore, updatePageStore] = createStore<PageStore>(emptyStore());
