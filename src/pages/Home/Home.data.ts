import { Params, query, RoutePreloadFuncArgs } from "@solidjs/router";
import { APP_ID } from "../../App";
import { pageStore, updatePageStore } from "../../stores/PageStore";
import { FeedRange, NostrEventContent, PrimalArticle, PrimalNote } from "../../primal";
import { FEED_LIMIT, Kind } from "../../constants";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { emptyStudioTotals, getHomeGraph, getHomeTotals, getTopEvents, HomePayload, StudioGraph, StudioTotals } from "src/primal_api/studio";
import { emptyEventFeedPage, emptyFeedRange } from "src/utils/feeds";
import { fetchKnownProfiles } from "src/utils/profile";
import { accountStore } from "src/stores/AccountStore";
import { logInfo } from "src/utils/logger";


export const filterAndSortNotes = (notes: string[], paging: FeedRange) => {
  return paging.elements.reduce<string[]>(
    (acc, id) => notes.includes(id) ? [...acc, id] : acc,
    [],
  );
}

// export const fetchHomeFeed = query(
//   async (pubkey: string, options?: { feedRange?: FeedRange, offset?: number }) => {
//     const range = options?.feedRange || emptyFeedRange();

//     if (pageStore.home.isFetching) {
//       const pages = pageStore.home.feedPages;

//       return pages[pages.length] ||
//         {
//           specification: '',
//           mainEvents: [],
//           auxEvents: [],
//           range: emptyFeedRange(),
//         };
//     }

//     const page = {
//       limit: FEED_LIMIT,
//       until: range.since,
//       offset: options?.offset || 0,
//     };

//     updatePageStore('home', 'isFetching', () => true);

//     const result = await fetchMegaFeed(
//       pubkey,
//       Kind.Text,
//       "{\"id\":\"latest\",\"kind\":\"notes\"}",
//       `home_feed_${APP_ID}`,
//       page,
//     );

//     let index = pageStore.home.feedPages.findIndex(fp => {
//       return fp.specification === result.specification &&
//         fp.range.since === result.range.since &&
//         fp.range.until === result.range.until;
//     })

//     if (index === -1) {
//       index = pageStore.home.feedPages.length;
//     }

//     batch(() => {
//       updatePageStore('home', 'feedPages', index, () => ({ ...result }));

//       updatePageStore('home', 'lastRange', () => ({ ...result.range }));
//       updatePageStore('home', 'isFetching', () => false);
//     });

//     return result;
//   },
//   'fetchHomeFeed',
// );

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
  articles: PrimalArticle[],
  articleSort: FeedCriteria,
  graphKey: keyof StudioGraph,
  graphSpan: GraphSpan,
}

export const emptyHomeStore = (): HomeStore => ({
  totals: emptyStudioTotals(),
  graph: [],
  notes: [],
  noteSort: 'score',
  articles: [],
  articleSort: 'score',
  graphKey: 'score',
  graphSpan: defaultSpan(),
});


export const [homeStore, setHomeStore] = createStore<HomeStore>(emptyHomeStore());

export const fetchHomeTotals = query(
  async (
    pubkey: string,
    options?: {
      since?: number,
      until?: number,
      pubkey?: string,
    }
  ) => {

    const r = await getHomeTotals({ pubkey, ...options });
    setHomeStore('totals', () => ({ ...r }))
  },
  'fetchHomeTotals',
);

export const fetchHomeGraph = query(
  async (
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
  },
  'fetchHomeGraph',
);

export const fetchHomeNotes = query(
  async (
    pubkey: string,
    options?: HomePayload,
  ) => {
    if (pageStore.homeNotes.isFetching) {
      const pages = pageStore.notes.feedPages;

      return pages[pages.length] || emptyEventFeedPage();
    }

    updatePageStore('homeNotes', 'isFetching', () => true);

    try {
      const result = await getTopEvents({
        ...options,
        pubkey,
        kind: Kind.Text,
      });

      let index = pageStore.homeNotes.feedPages.findIndex(fp => {
        return fp.paging.since === result.paging.since &&
          fp.paging.until === result.paging.until &&
          fp.paging.offset === result.paging.offset;
      })

      if (index === -1) {
        index = pageStore.homeNotes.feedPages.length;
      }

      batch(() => {
        updatePageStore('homeNotes', 'feedPages', index, () => ({ ...result }));
        updatePageStore('homeNotes', 'lastRange', () => ({ ...result.paging }));
        updatePageStore('homeNotes', 'isFetching', () => false);
      });

      return result;
    } catch (e) {
      return;
    }
  },
  'fetchHomeNotes',
);

export const fetchHomeArticles = query(
  async (
    pubkey: string,
    options?: HomePayload,
  ) => {
    if (pageStore.homeArticles.isFetching) {
      const pages = pageStore.homeArticles.feedPages;

      return pages[pages.length] || emptyEventFeedPage();
    }

    updatePageStore('homeArticles', 'isFetching', () => true);

    try {
      const result = await getTopEvents({
        ...options,
        pubkey,
        kind: Kind.LongForm,
      });

      let index = pageStore.homeArticles.feedPages.findIndex(fp => {
        return fp.paging.since === result.paging.since &&
          fp.paging.until === result.paging.until;
      })

      if (index === -1) {
        index = pageStore.homeArticles.feedPages.length;
      }

      batch(() => {
        updatePageStore('homeArticles', 'feedPages', index, () => ({ ...result }));
        updatePageStore('homeArticles', 'lastRange', () => ({ ...result.paging }));
        updatePageStore('homeArticles', 'isFetching', () => false);
      });

      return result;
    } catch (e){
      return ;
    }
  },
  'fetchHomeArticles',
);

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

  logInfo('Preload');

  fetchHomeTotals(pk, { since, until });
  fetchHomeGraph(pk, { since, until, resolution });
  fetchHomeNotes(pk, { since, until, limit: 30, offset: 0 });
  fetchHomeArticles(pk, { since, until, limit: 30, offset: 0 });
}
