import { query, RoutePreloadFuncArgs } from "@solidjs/router";
import { pageStore, removeEventFromPageStore, updatePageStore } from "../../stores/PageStore";
import { FeedRange, PrimalArticle, PrimalDraft } from "../../primal";
import { Kind } from "../../constants";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { deleteFromInbox, deleteScheduled, FeedEventState, FeedTotals, getFeedEvents, getFeedTotals, HomePayload, isFeedEventState, } from "src/primal_api/studio";
import { emptyEventFeedPage, filterAndSortReads } from "src/utils/feeds";
import { accountStore } from "src/stores/AccountStore";
import { defaultSpan, FeedCriteria, GraphSpan, setHomeStore } from "../Home/Home.data";
import { parseDraftContent } from "src/utils/drafts";
import { doRequestDelete } from "src/primal_api/events";
import { openConfirmDialog } from "src/stores/AppStore";
import { readGraphSpan } from "src/utils/localStore";


export const filterAndSortNotes = (notes: string[], paging: FeedRange) => {
  return paging.elements.reduce<string[]>(
    (acc, id) => notes.includes(id) ? [...acc, id] : acc,
    [],
  );
}

export type ArticlesStore = {
  articles: PrimalArticle[],
  graphSpan: GraphSpan,
  tab: FeedEventState,
  tabCriteriaOptions: Record<FeedEventState, FeedCriteria>,
  offset: number,
  selected: string[],
  feedTotals: FeedTotals,
  showApproveDialog: boolean,
  approvedEvents: PrimalDraft[],
  changePublishDateArticle: PrimalArticle | undefined,
  isFetchingTotals: boolean,
}

export const emptyHomeStore = (): ArticlesStore => ({
  articles: [],
  graphSpan: defaultSpan(),
  tab: 'published',
  tabCriteriaOptions: {
    'published': 'latest',
    'published-replied': 'latest',
    'scheduled': 'oldest',
    'inbox': 'latest',
    'sent': 'latest',
    'drafts': 'latest',
  },
  offset: 0,
  selected: [],
  showApproveDialog: false,
  approvedEvents: [],
  changePublishDateArticle: undefined,
  feedTotals: {
    sent: 0,
    inbox: 0,
    drafts: 0,
    published: 0,
    scheduled: 0,
    'published-replied': 0,
  },
  isFetchingTotals: false,
});

export const [articlesStore, setArticlesStore] = createStore<ArticlesStore>(emptyHomeStore());

export const isAllSelected = () => {
  const eventIds = pageStore.articles.feedPages.flatMap(p => p.page.elements);

  return eventIds.every(id => articlesStore.selected.includes(id));
}

export const toggleSelectAll = () => {
  if (isAllSelected()) {
    setArticlesStore('selected', () => []);
    return;
  }

  const eventIds = pageStore.articles.feedPages.flatMap(p => p.page.elements);

  setArticlesStore('selected', () => [...eventIds]);
}

export const toggleSelected = (id: string, add: boolean) => {
  if (add && !articlesStore.selected.includes(id)) {
    setArticlesStore('selected', articlesStore.selected.length, () => id);
  }
  else if (!add) {
    setArticlesStore('selected', (sel) => sel.filter(s => s !== id))
  }
}

// export const toggleSelectedInbox = (id: string, add: boolean) => {
//   if (add && !articlesStore.selected.includes(id)) {
//     setArticlesStore('selected', articlesStore.selected.length, () => id);
//   }
//   else if (!add) {
//     setArticlesStore('selected', (sel) => sel.filter(s => s !== id))
//   }
// }

export const deleteSelected = async (type: 'notes' | 'reads' | 'users' | 'drafts' | 'zaps') => {
  openConfirmDialog({
    title: "Delete Selected?",
    description: "This will issue a “request delete” command to the relays where these drafts were published. Do you want to continue?",
    onConfirm: async () => {
      const selectedIds = articlesStore.selected;

      if (articlesStore.tab === 'inbox') {
        await deleteFromInbox(selectedIds);
      }
      else if (articlesStore.tab === 'scheduled') {
        await deleteScheduled(selectedIds)
      }
      else {
        let promisses: Promise<boolean>[] = []

        for (let i=0; i<selectedIds.length;i++) {
          const id = selectedIds[i];

          promisses.push(doRequestDelete(accountStore.pubkey, id, Kind.Draft));
        }

        await Promise.any(promisses);
      }

      for (let i=0; i<selectedIds.length;i++) {
        const id = selectedIds[i];
        removeEventFromPageStore(id, type)
      }

      fetchFeedTotals(accountStore.pubkey, {
        since: articlesStore.graphSpan.since(),
        until: articlesStore.graphSpan.until(),
        kind: 'articles',
      });
    },
    onAbort: () => {},
  });
};

export const fetchFeedTotals = async (
  pubkey: string,
  options?: {
    since?: number,
    until?: number,
    kind: 'notes' | 'articles',
  }
) => {

  const r = await getFeedTotals({ pubkey, ...options });

  setArticlesStore('feedTotals', () => ({...r}));
  setArticlesStore('isFetchingTotals', false);
};

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

    let since = options?.since || articlesStore.graphSpan.since();
    let until = options?.until || articlesStore.graphSpan.until();

    if (!['published'].includes(state)) {
      since = 0;
      until = 0;
    }

    if (['scheduled'].includes(state)) {
      since = 0;
      until = Number.MAX_SAFE_INTEGER;
    }

    const identifier = `notes_${state || ''}_${articlesStore.graphSpan.name}`;


    try {
      let result = await getFeedEvents({
        ...options,
        pubkey,
        kind: 'articles',
        state,
        since,
        until,
        identifier,
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

      const testId = `notes_${articlesStore.tab}_${articlesStore.graphSpan.name}`;

      if (!result.identifier.startsWith(testId)) {
        return {};
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

  let search = new URLSearchParams(args.location.search);
  let tab: string | null = search.get('tab');


  const span = readGraphSpan(accountStore.pubkey, 'articles');

  setArticlesStore('graphSpan', () => ({ ...span }));

  const { since, until } = articlesStore.graphSpan;

  if (
    pageStore.articles.feedPages.length > 0
  ) return;

  if (tab && !isFeedEventState(tab)) {
    tab = null;
  }

  setArticlesStore('isFetchingTotals', true);
  const criteria = articlesStore.tabCriteriaOptions[(tab as FeedEventState) || articlesStore.tab];

  query(fetchArticles, 'fetchArticles')(pk, { since: since(), until: until(), limit: 30, offset: 0, criteria });
  query(fetchFeedTotals, 'fetchFeedTotals')(pk, { since: since(), until: until(), kind: 'articles' });
  // fetchArticles(pk, { since, until, limit: 30, offset: 0 });
}
