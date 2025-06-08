import { query, RoutePreloadFuncArgs } from "@solidjs/router";
import { pageStore, updatePageStore } from "../../stores/PageStore";
import { PrimalArticle, PrimalDraft, PrimalNote } from "../../primal";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { FeedEventState, FeedTotals, getFeedEvents, getFeedTotals, HomePayload } from "src/primal_api/studio";
import { emptyEventFeedPage, filterAndSortNotes, } from "src/utils/feeds";
import { accountStore } from "src/stores/AccountStore";
import { defaultSpan, FeedCriteria, GraphSpan, setHomeStore, } from "../Home/Home.data";
import { parseDraftContent } from "src/utils/drafts";
import { openConfirmDialog } from "src/stores/AppStore";
import { doRequestDelete } from "src/primal_api/events";
import { Kind } from "src/constants";
import { readGraphSpan } from "src/utils/localStore";


export type NotesStore = {
  notes: PrimalArticle[],
  criteria: FeedCriteria,
  graphSpan: GraphSpan,
  tab: FeedEventState,
  showReplies: boolean,
  offset: number,
  selected: string[],
  feedTotals: FeedTotals,
  showApproveDialog: boolean,
  approvedEvents: PrimalDraft[],
  changePublishDateNote: PrimalNote | undefined,
}

export const emptyNotesStore = (): NotesStore => ({
  notes: [],
  criteria: 'score',
  graphSpan: defaultSpan(),
  tab: 'published',
  showReplies: false,
  offset: 0,
  selected: [],
  showApproveDialog: false,
  approvedEvents: [],
  changePublishDateNote: undefined,
  feedTotals: {
    sent: 0,
    inbox: 0,
    drafts: 0,
    published: 0,
    scheduled: 0,
    'published-replied': 0,
  },
});

export const [notesStore, setNotesStore] = createStore<NotesStore>(emptyNotesStore());

export const isAllSelected = () => {
  const eventIds = pageStore.notes.feedPages.flatMap(p => p.page.elements);

  return eventIds.every(id => notesStore.selected.includes(id));
}

export const toggleSelectAll = () => {
  if (isAllSelected()) {
    setNotesStore('selected', () => []);
    return;
  }

  const eventIds = pageStore.notes.feedPages.flatMap(p => p.page.elements);

  setNotesStore('selected', () => [...eventIds]);
}

export const toggleSelected = (id: string, add: boolean) => {
  if (add && !notesStore.selected.includes(id)) {
    setNotesStore('selected', notesStore.selected.length, () => id);
  }
  else if (!add) {
    setNotesStore('selected', (sel) => sel.filter(s => s !== id))
  }
}

export const deleteSelected = async () => {
  openConfirmDialog({
    title: "Delete All?",
    description: "This will issue a “request delete” command to the relays where these drafts were published. Do you want to continue?",
    onConfirm: async () => {
      const selectedIds = notesStore.selected;

      let promisses: Promise<boolean>[] = []

      for (let i=0; i<selectedIds.length;i++) {
        const id = selectedIds[i];

        promisses.push(doRequestDelete(accountStore.pubkey, id, Kind.Draft));
      }

      await Promise.any(promisses);
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

  setNotesStore('feedTotals', () => ({...r}))
};

export const fetchNotes = async (
  pubkey: string,
  options?: HomePayload & { showReplies?: boolean },
) => {
  if (pageStore.notes.isFetching) {
    const pages = pageStore.notes.feedPages;

    return pages[pages.length] || emptyEventFeedPage();
  }

  updatePageStore('notes', 'isFetching', () => true);

  const state: FeedEventState = options?.state === 'published' && notesStore.showReplies ?
  'published-replied' :
  (options?.state || notesStore.tab);

  let since = options?.since || notesStore.graphSpan.since;
  let until = options?.until || notesStore.graphSpan.until;

  if (!['published', 'published-replied'].includes(state)) {
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
      kind: 'notes',
      state,
      since,
      until,
    });

    setNotesStore('offset', (offset) => offset + result.paging.elements.length);

    let index = pageStore.notes.feedPages.findIndex(fp => {
      return fp.paging.since === result.paging.since &&
        fp.paging.until === result.paging.until;
    })

    if (index === -1) {
      index = pageStore.notes.feedPages.length;
    }

    if (['drafts', 'sent', 'inbox'].includes(notesStore.tab)) {
      result.drafts = await parseDraftContent(result.drafts);
    } else {
      result.notes = filterAndSortNotes(result.notes, result.paging);
    }


    batch(() => {
      updatePageStore('notes', 'feedPages', index, () => ({ ...result }));
      updatePageStore('notes', 'lastRange', () => ({ ...result.paging }));
      updatePageStore('notes', 'isFetching', () => false);
    });

    return result;
  } catch (e){
    return ;
  }
};


export const preloadNotes = (args: RoutePreloadFuncArgs) => {
  let pk = args.params?.pubkey;

  if (!pk) {
    pk = accountStore.pubkey;
  }

  if (!pk) return;

  const span = readGraphSpan(accountStore.pubkey, 'notes');

  setNotesStore('graphSpan', () => ({ ...span }));

  const { since, until } = notesStore.graphSpan;

  if (
    pageStore.notes.feedPages.length > 0
  ) return;

  query(fetchNotes, 'fetchNotes')(pk, { since, until, limit: 30, offset: 0 });
    query(fetchFeedTotals, 'fetchFeedTotals')(pk, { since, until, kind: 'notes' });
  // fetchNotes(pk, { since, until, limit: 30, offset: 0 });
}
