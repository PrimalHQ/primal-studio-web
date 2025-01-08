import { query } from "@solidjs/router";
import { APP_ID } from "../../App";
import { emptyFeedRange, fetchMegaFeed } from "../../primal_api/feeds";
import { pageStore, updatePageStore } from "../../stores/PageStore";
import { FeedRange, NostrEventContent } from "../../primal";
import { FEED_LIMIT } from "../../constants";
import { batch } from "solid-js";

export const calculateNotesOffset = (notes: NostrEventContent[], paging: FeedRange) => {
  let offset = 0;

  for (let i=notes.length-1;i>=0;i--) {
    const note = notes[i];

    if (
      paging.order_by === 'created_at' &&
      note.created_at !== paging.since
    ) break;

    // if (
    //   paging.order_by === 'satszapped' &&
    //   note.satszapped !== paging.since
    // ) break;

    // if (
    //   paging.order_by === 'score' &&
    //   note.score !== paging.since
    // ) break;

    offset++;
  }

  return offset;
}

export const filterAndSortNotes = (notes: string[], paging: FeedRange) => {
  return paging.elements.reduce<string[]>(
    (acc, id) => notes.includes(id) ? [...acc, id] : acc,
    [],
  );
}

export const fetchHomeFeed = query(
  async (pubkey: string, feedRange?: FeedRange) => {
    const range = feedRange || emptyFeedRange();

    if (pageStore.home.isFetching) return { ...range };

    const page = {
      limit: FEED_LIMIT,
      until: range.since,
    };

    updatePageStore('home', 'isFetching', () => true);

    const nextRange = await fetchMegaFeed(
      pubkey,
      "{\"id\":\"latest\",\"kind\":\"notes\"}",
      `home_feed_${APP_ID}`,
      page,
    );

    batch(() => {
      updatePageStore('home', 'range', () => nextRange);
      updatePageStore('home', 'notes', (notes) => [ ...notes, ...nextRange.elements]);
      updatePageStore('home', 'isFetching', () => false);
    });

    return nextRange;
  },
  'fetchHomeFeed',
);

export default function preloadHome(pubkey: string | undefined) {
  if (!pubkey || pageStore.home.range.since > 0) return;
  fetchHomeFeed(pubkey);
}
