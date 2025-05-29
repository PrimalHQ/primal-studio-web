import { Params, query, RoutePreloadFuncArgs } from "@solidjs/router";
import { APP_ID } from "../../App";
import { pageStore, updatePageStore } from "../../stores/PageStore";
import { FeedRange, NostrEventContent, PrimalArticle, PrimalNote } from "../../primal";
import { FEED_LIMIT, Kind } from "../../constants";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { emptyStudioTotals, getHomeGraph, getHomeTotals, getTopEvents, HomePayload, StudioGraph, StudioTotals } from "src/primal_api/studio";
import { emptyEventFeedPage, emptyFeedRange, filterAndSortNotes, filterAndSortPageResults, filterAndSortReads } from "src/utils/feeds";
import { fetchKnownProfiles } from "src/utils/profile";
import { accountStore } from "src/stores/AccountStore";
import { logInfo } from "src/utils/logger";

export type GraphSpan = {
  name: string,
  since: number,
  until: number,
  resolution: 'day' | 'month' | 'hour',
}

export const defaultSpan = (): GraphSpan => ({
  name: '1m',
  until: Math.floor((new Date()).getTime() / 1_000),
  since: Math.floor((new Date()).getTime() / 1_000) - 30 * 24 * 60 * 60,
  resolution: 'day',
});

export type FeedCriteria = 'score' | 'sentiment' | 'oldest' | 'latest';

export type HomeStore = {
  totals: StudioTotals,
  graph: StudioGraph[],
  notes: PrimalNote[],
  noteSort: FeedCriteria,
  noteOffset: number,
  articles: PrimalArticle[],
  articleSort: FeedCriteria,
  articleOffset: number,
  graphKey: keyof StudioGraph,
  graphSpan: GraphSpan,
}

export const emptyHomeStore = (): HomeStore => ({
  totals: emptyStudioTotals(),
  graph: [],
  notes: [],
  noteSort: 'score',
  noteOffset: 0,
  articles: [],
  articleSort: 'score',
  articleOffset: 0,
  graphKey: 'score',
  graphSpan: defaultSpan(),
});

export const [homeStore, setHomeStore] = createStore<HomeStore>(emptyHomeStore());

export const fetchHomeTotals = async (
    pubkey: string,
    options?: {
      since?: number,
      until?: number,
      pubkey?: string,
    }
  ) => {

    const r = await getHomeTotals({ pubkey, ...options });
    setHomeStore('totals', () => ({ ...r }))
  };

export const fetchHomeGraph = async (
    pubkey: string,
    options?: {
      since?: number,
      until?: number,
      pubkey?: string,
      resolution?: 'hour' | 'day' | 'month',
    }
  ) => {

    const r = await getHomeGraph({ pubkey, ...options });

    setHomeStore('graph', () => [...r])
  };

export const fetchHomeNotes = async (
    pubkey: string,
    options?: HomePayload,
  ) => {
    if (pageStore.homeNotes.isFetching) {
      const pages = pageStore.notes.feedPages;

      return pages[pages.length] || emptyEventFeedPage();
    }

    updatePageStore('homeNotes', 'isFetching', () => true);

    try {
      let result = await getTopEvents({
        ...options,
        pubkey,
        kind: Kind.Text,
      });

      setHomeStore('noteOffset', (offset) => offset + result.paging.elements.length);

      let index = pageStore.homeNotes.feedPages.findIndex(fp => {
        return fp.paging.since === result.paging.since &&
          fp.paging.until === result.paging.until &&
          fp.paging.offset === result.paging.offset;
      })

      if (index === -1) {
        index = pageStore.homeNotes.feedPages.length;
      }

      result.notes = filterAndSortNotes(result.notes, result.paging);

      batch(() => {
        updatePageStore('homeNotes', 'feedPages', index, () => ({ ...result }));
        updatePageStore('homeNotes', 'lastRange', () => ({ ...result.paging }));
        updatePageStore('homeNotes', 'isFetching', () => false);
      });

      return result;
    } catch (e) {
      return;
    }
  };

export const fetchHomeArticles = async (
    pubkey: string,
    options?: HomePayload,
  ) => {
    if (pageStore.homeArticles.isFetching) {
      const pages = pageStore.homeArticles.feedPages;

      return pages[pages.length] || emptyEventFeedPage();
    }

    updatePageStore('homeArticles', 'isFetching', () => true);

    try {
      let result = await getTopEvents({
        ...options,
        pubkey,
        kind: Kind.LongForm,
      });

      setHomeStore('articleOffset', (offset) => offset + result.paging.elements.length);

      let index = pageStore.homeArticles.feedPages.findIndex(fp => {
        return fp.paging.since === result.paging.since &&
          fp.paging.until === result.paging.until &&
          fp.paging.offset === result.paging.offset;
      })

      if (index === -1) {
        index = pageStore.homeArticles.feedPages.length;
      }

      result.reads = filterAndSortReads(result.reads, result.paging);

      batch(() => {
        updatePageStore('homeArticles', 'feedPages', index, () => ({ ...result }));
        updatePageStore('homeArticles', 'lastRange', () => ({ ...result.paging }));
        updatePageStore('homeArticles', 'isFetching', () => false);
      });

      return result;
    } catch (e){
      return ;
    }
  };

export const preloadHome = (args: RoutePreloadFuncArgs) => {
  let pk = args.params?.pubkey;

  if (!pk) {
    pk = accountStore.pubkey;
  }

  if (!pk) return;

  const { since, until, resolution } = homeStore.graphSpan;

  if (
    pageStore.homeArticles.feedPages.length > 0 ||
    pageStore.homeNotes.feedPages.length > 0
  ) return;

  query(fetchHomeTotals, 'fetchHomeTotals')(pk, { since, until });
  query(fetchHomeGraph, 'fetchHomeGraph')(pk, { since, until, resolution });
  query(fetchHomeNotes, 'fetchHomeNotes')(pk, { since, until, limit: 30, offset: 0 });
  query(fetchHomeArticles, 'fetchHomeArticles')(pk, { since, until, limit: 30, offset: 0 });

  // fetchHomeTotals(pk, { since, until });
  // fetchHomeGraph(pk, { since, until, resolution });
  // fetchHomeNotes(pk, { since, until, limit: 30, offset: 0 });
  // fetchHomeArticles(pk, { since, until, limit: 30, offset: 0 });
}
