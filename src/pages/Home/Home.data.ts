import { query } from "@solidjs/router";
import { APP_ID } from "../../App";
import { emptyFeedRange, fetchMegaFeed } from "../../primal_api/feeds";
import { pageStore, updatePageStore } from "../../stores/PageStore";
import { FeedRange, NostrEventContent } from "../../primal";
import { FEED_LIMIT, Kind } from "../../constants";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { emptyStudioTotals, getHomeGraph, getHomeTotals, getTopEvents, HomePayload, StudioGraph, StudioTotals } from "src/primal_api/studio";


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

export type HomeStore = {
  totals: StudioTotals,
  graph: StudioGraph[],
  notes: string[],
  articles: string[],
  graphKey: keyof StudioGraph,
  graphSpan: GraphSpan,
}

export const emptyHomeStore = (): HomeStore => ({
  totals: emptyStudioTotals(),
  graph: [],
  notes: [],
  articles: [],
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

      return pages[pages.length] ||
        {
          specification: '',
          mainEvents: [],
          auxEvents: [],
          range: emptyFeedRange(),
        };
    }

    updatePageStore('homeNotes', 'isFetching', () => true);

    try {
      const result = await getTopEvents({
        pubkey,
        kind: Kind.Text,
        ...options,
      });

      let index = pageStore.homeNotes.feedPages.findIndex(fp => {
        return fp.specification === result.specification &&
          fp.range.since === result.range.since &&
          fp.range.until === result.range.until;
      })

      if (index === -1) {
        index = pageStore.homeNotes.feedPages.length;
      }

      batch(() => {
        updatePageStore('homeNotes', 'feedPages', index, () => ({ ...result }));
        updatePageStore('homeNotes', 'lastRange', () => ({ ...result.range }));
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
      const pages = pageStore.notes.feedPages;

      return pages[pages.length] ||
        {
          specification: '',
          mainEvents: [],
          auxEvents: [],
          range: emptyFeedRange(),
        };
    }

    updatePageStore('homeArticles', 'isFetching', () => true);

    try {
      const result = await getTopEvents({
        pubkey,
        kind: Kind.LongForm,
        ...options,
      });

      let index = pageStore.homeArticles.feedPages.findIndex(fp => {
        return fp.specification === result.specification &&
          fp.range.since === result.range.since &&
          fp.range.until === result.range.until;
      })

      if (index === -1) {
        index = pageStore.homeArticles.feedPages.length;
      }

      batch(() => {
        updatePageStore('homeArticles', 'feedPages', index, () => ({ ...result }));
        updatePageStore('homeArticles', 'lastRange', () => ({ ...result.range }));
        updatePageStore('homeArticles', 'isFetching', () => false);
      });

      return result;
    } catch (e){
      return ;
    }
  },
  'fetchHomeArticles',
);

export default function preloadHome(pubkey: string | undefined) {
  if (!pubkey) return;

  const { since, until, resolution } = homeStore.graphSpan;

  fetchHomeTotals(pubkey, { since, until });
  fetchHomeGraph(pubkey, { since, until, resolution });
  fetchHomeNotes(pubkey, { since, until, limit: 30, offset: 0 });
  fetchHomeArticles(pubkey, { since, until, limit: 30, offset: 0 });
}
