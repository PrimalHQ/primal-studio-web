import { query } from "@solidjs/router";
import { pageStore } from "../../stores/PageStore";
import { FeedRange } from "../../primal";


export const filterAndSortNotes = (notes: string[], paging: FeedRange) => {
  return paging.elements.reduce<string[]>(
    (acc, id) => notes.includes(id) ? [...acc, id] : acc,
    [],
  );
}

export const fetchNotesFeed = query(
  async (pubkey: string, options?: { feedRange?: FeedRange, offset?: number }) => {
    return [];
    // const range = options?.feedRange || emptyFeedRange();

    // if (pageStore.notes.isFetching) {
    //   const pages = pageStore.notes.feedPages;

    //   return pages[pages.length] ||
    //     {
    //       specification: '',
    //       mainEvents: [],
    //       auxEvents: [],
    //       range: emptyFeedRange(),
    //     };
    // }

    // const page = {
    //   limit: FEED_LIMIT,
    //   until: range.since,
    //   offset: options?.offset || 0,
    // };

    // updatePageStore('notes', 'isFetching', () => true);

    // const result = await fetchMegaFeed(
    //   pubkey,
    //   Kind.Text,
    //   "{\"id\":\"latest\",\"kind\":\"notes\"}",
    //   `notes_feed_${APP_ID}`,
    //   page,
    // );

    // let index = pageStore.notes.feedPages.findIndex(fp => {
    //   return fp.specification === result.specification &&
    //     fp.range.since === result.range.since &&
    //     fp.range.until === result.range.until;
    // })

    // if (index === -1) {
    //   index = pageStore.notes.feedPages.length;
    // }

    // batch(() => {
    //   updatePageStore('notes', 'feedPages', index, () => ({ ...result }));
    //   updatePageStore('notes', 'lastRange', () => ({ ...result.range }));
    //   updatePageStore('notes', 'isFetching', () => false);
    // });

    // return result;
  },
  'fetchNotesFeed',
);

export default function preloadNotes(pubkey: string | undefined) {
  if (!pubkey || pageStore.notes.lastRange.since > 0) return;
  fetchNotesFeed(pubkey);
}
