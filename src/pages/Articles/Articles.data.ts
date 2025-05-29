import { Params, query, RoutePreloadFuncArgs } from "@solidjs/router";
import { APP_ID } from "../../App";
import { pageStore, updatePageStore } from "../../stores/PageStore";
import { FeedRange, NostrEventContent, PrimalArticle, PrimalNote } from "../../primal";
import { FEED_LIMIT, Kind } from "../../constants";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { emptyStudioTotals, FeedEventState, getFeedEvents, getHomeGraph, getHomeTotals, getTopEvents, HomePayload, StudioGraph, StudioTotals } from "src/primal_api/studio";
import { emptyEventFeedPage, emptyFeedRange, filterAndSortPageResults, filterAndSortReads } from "src/utils/feeds";
import { fetchKnownProfiles } from "src/utils/profile";
import { accountStore } from "src/stores/AccountStore";
import { logInfo } from "src/utils/logger";
import { defaultSpan, FeedCriteria, GraphSpan } from "../Home/Home.data";


export const filterAndSortNotes = (notes: string[], paging: FeedRange) => {
  return paging.elements.reduce<string[]>(
    (acc, id) => notes.includes(id) ? [...acc, id] : acc,
    [],
  );
}

export type ArticlesStore = {
  articles: PrimalArticle[],
  criteria: FeedCriteria,
  graphSpan: GraphSpan,
  tab: FeedEventState,
}

export const emptyHomeStore = (): ArticlesStore => ({
  articles: [],
  criteria: 'score',
  graphSpan: defaultSpan(),
  tab: 'published',
});

export const [articlesStore, setArticlesStore] = createStore<ArticlesStore>(emptyHomeStore());

export const fetchArticles = query(
  async (
    pubkey: string,
    options?: HomePayload,
  ) => {
    if (pageStore.articles.isFetching) {
      const pages = pageStore.articles.feedPages;

      return pages[pages.length] || emptyEventFeedPage();
    }

    updatePageStore('articles', 'isFetching', () => true);

    try {
      let result = await getFeedEvents({
        ...options,
        pubkey,
        kind: 'articles',
        state: articlesStore.tab,
      });

      let index = pageStore.articles.feedPages.findIndex(fp => {
        return fp.paging.since === result.paging.since &&
          fp.paging.until === result.paging.until;
      })

      if (index === -1) {
        index = pageStore.articles.feedPages.length;
      }

      result.reads = filterAndSortReads(result.reads, result.paging);

      batch(() => {
        updatePageStore('articles', 'feedPages', index, () => ({ ...result }));
        updatePageStore('articles', 'lastRange', () => ({ ...result.paging }));
        updatePageStore('articles', 'isFetching', () => false);
      });

      return result;
    } catch (e){
      return ;
    }
  },
  'fetchArticles',
);

export const preloadArticles = (args: RoutePreloadFuncArgs) => {
  let pk = args.params?.pubkey;

  if (!pk) {
    pk = accountStore.pubkey;
  }

  if (!pk) return;

  const { since, until, resolution } = articlesStore.graphSpan;

  if (
    pageStore.articles.feedPages.length > 0
  ) return;

  fetchArticles(pk, { since, until, limit: 30, offset: 0 });
}
