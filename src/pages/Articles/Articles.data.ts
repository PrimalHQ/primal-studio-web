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
import { parseDraftContent } from "src/utils/drafts";


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
  offset: number,
}

export const emptyHomeStore = (): ArticlesStore => ({
  articles: [],
  criteria: 'score',
  graphSpan: defaultSpan(),
  tab: 'published',
  offset: 0,
});

export const [articlesStore, setArticlesStore] = createStore<ArticlesStore>(emptyHomeStore());

export const fetchArticles = async (
    pubkey: string,
    options?: HomePayload,
  ) => {
    if (pageStore.articles.isFetching) {
      const pages = pageStore.articles.feedPages;

      return pages[pages.length] || emptyEventFeedPage();
    }

    updatePageStore('articles', 'isFetching', () => true);

    const state = options?.state || articlesStore.tab;

    let since = options?.since || articlesStore.graphSpan.since;
    let until = options?.until || articlesStore.graphSpan.until;

    if (!['published'].includes(state)) {
      since = 0;
      until = 0;
    }

    if (['scheduled'].includes(state)) {
      since = 0;
      until = Number.MAX_SAFE_INTEGER;
    }

    try {
      let result = await getFeedEvents({
        ...options,
        pubkey,
        kind: 'articles',
        state,
        since,
        until,
      });

      setArticlesStore('offset', (offset) => offset + result.paging.elements.length);

      let index = pageStore.articles.feedPages.findIndex(fp => {
        return fp.paging.since === result.paging.since &&
          fp.paging.until === result.paging.until &&
          fp.paging.offset === result.paging.offset;
      })

      if (index === -1) {
        index = pageStore.articles.feedPages.length;
      }

      if (['drafts', 'sent', 'inbox'].includes(articlesStore.tab)) {
        result.drafts = await parseDraftContent(result.drafts);
      } else {
        result.reads = filterAndSortReads(result.reads, result.paging);
      }

      batch(() => {
        updatePageStore('articles', 'feedPages', index, () => ({ ...result }));
        updatePageStore('articles', 'lastRange', () => ({ ...result.paging }));
        updatePageStore('articles', 'isFetching', () => false);
      });

      return result;
    } catch (e){
      return ;
    }
  };

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

  query(fetchArticles, 'fetchArticles')(pk, { since, until, limit: 30, offset: 0 });
  // fetchArticles(pk, { since, until, limit: 30, offset: 0 });
}
