import { createStore } from "solid-js/store";
import { APP_ID } from "src/App";
import { Kind } from "src/constants";
import { NostrEventContent, PaginationInfo, PrimalArticle, PrimalNote, PrimalUser, UserStats } from "src/primal";
import { fetchMegaFeed, fetchScoredContent } from "src/primal_api/feeds";
import { getUserInfos, getUserMetadata, getUsers } from "src/primal_api/profile";
import { searchUsers } from "src/primal_api/search";
import { convertToUser, emptyEventFeedPage, emptyPaging, filterAndSortNotes, filterAndSortReads, pageResolve, updateFeedPage } from "src/utils/feeds";
import { nip19 } from "src/utils/nTools";
import { primalAPI, subsTo } from "src/utils/socket";
import { accountStore } from "./AccountStore";
import { logError } from "src/utils/logger";
import { batch } from "solid-js";
import { readUserHistory, storeUserHistory } from "src/utils/localStore";
import { uuidv4 } from "src/utils/kyes";

export type SearchStore = {
  users: PrimalUser[],
  scores: Record<string, number>,
  isFetchingUsers: boolean,
  userHistory: {
    profiles: PrimalUser[],
    stats: Record<string, UserStats>,
  },
  paging: PaginationInfo,
  notes: PrimalNote[],
  reads: PrimalArticle[],
  isFetchingContent: boolean,

  recomendedUsers: PrimalUser[],
  initNotes: PrimalNote[],
  initReads: PrimalArticle[],
  isFetchingInitNotes: boolean,
  isFetchingInitReads: boolean,
  selectedUser: PrimalUser | undefined,
  searchQuery: string,
  suggestedUsers: PrimalUser[],
  highlightedUser: number,
}

export const [searchStore, updateSearchStore] = createStore<SearchStore>({
  users: [],
  scores: {},
  isFetchingUsers: false,
  userHistory: {
    profiles: [],
    stats: {},
  },
  paging: { ...emptyPaging() },
  notes: [],
  reads: [],
  isFetchingContent: false,

  recomendedUsers: [],
  initNotes: [],
  initReads: [],
  isFetchingInitNotes: false,
  isFetchingInitReads: false,
  selectedUser: undefined,
  searchQuery: '',
  suggestedUsers: [],
  highlightedUser: -1,
});

export const recomendedUsers = [
  "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2", // jack
  "50d94fc2d8580c682b071a542f8b1e31a200b0508bab95a33bef0855df281d63", // calle
  "1afe0c74e3d7784eba93a5e3fa554a6eeb01928d12739ae8ba4832786808e36d", // hodl
  "c48e29f04b482cc01ca1f9ef8c86ef8318c059e0e9353235162f080f26e14c11", // walker
  "85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204", // preston
  "eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f", // lyn
  "04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9", // odell
  "472f440f29ef996e92a186b8d320ff180c855903882e59d50de1b8bd5669301e", // marty
  "e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411", // nvk
  "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52", // pablo
];

// export const writeUserHi = (users: PrimalUser[]) => {
//   if (!accountStore.pubkey) return;
//   storeUserHistory(accountStore.pubkey, delta);
// }

export const loadSearchStore = (pubkey: string) => {
  batch(() => {
    updateSearchStore('isFetchingContent', false);
    updateSearchStore('isFetchingUsers', false);
    updateSearchStore('isFetchingInitNotes', false);
    updateSearchStore('isFetchingInitReads', false);
  })

  getRecomendedUsers(searchStore.userHistory.profiles);
  fetchTrendingNotes();
  fetchDefaultReads();
  loadUserHistory();
}

export const findUsers2 = (query: string, pubkey?: string) => {
  return new Promise<PrimalUser[]>((resolve, reject) => {
    const subId = `search_users_${APP_ID}`;

    let page = { ...emptyEventFeedPage() };

    primalAPI({
      subId,
      action: () => searchUsers(pubkey, subId, query),
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        const { users } = pageResolve(page);

        const sorted = users.sort((a, b) => {
          const aScore = a.userStats?.followers_count || 0;
          const bScore = b.userStats?.followers_count || 0;

          return bScore - aScore;
        });

        resolve(sorted.slice(0, 10));
      },
      onNotice: () => {
        reject('failt_to_search_users')
      }
    })
  });
}

export const findUserByNpub2 = async (npub: string) => {

  let decoded: nip19.DecodedResult | undefined;

  try {
    decoded = nip19.decode(npub);
  } catch (e) {
    return findUsers2(npub);
  }

  if (!decoded) {
    return findUsers2(npub);
  }

  const hex = typeof decoded.data === 'string' ?
    decoded.data :
    (decoded.data as nip19.ProfilePointer).pubkey;

  return getUsers([hex])
}

export const findUsers = (query: string, pubkey?: string) => {
  const subId = `search_users_${APP_ID}`;

  let page = { ...emptyEventFeedPage() };

  primalAPI({
    subId,
    action: () => searchUsers(pubkey, subId, query),
    onEvent: (event) => {
      updateFeedPage(page, event);
    },
    onEose: () => {
      const { users } = pageResolve(page);

      const sorted = users.sort((a, b) => {
        const aScore = a.userStats?.followers_count || 0;
        const bScore = b.userStats?.followers_count || 0;

        return bScore - aScore;
      });

      updateSearchStore('users', () => sorted.slice(0, 10));
      updateSearchStore('isFetchingUsers', () => false);

    },
    onNotice: () => {
    },
  });
}

export const findUserByNupub = (npub: string) => {
  const subId = `find_npub_${APP_ID}`;

  let decoded: nip19.DecodedResult | undefined;

  try {
    decoded = nip19.decode(npub);
  } catch (e) {
    findUsers(npub);
    return;
  }

  if (!decoded) {
    findUsers(npub);
    return;
  }

  const hex = typeof decoded.data === 'string' ?
    decoded.data :
    (decoded.data as nip19.ProfilePointer).pubkey;


  let page = { ...emptyEventFeedPage() };

  updateSearchStore('isFetchingUsers', () => true);

  primalAPI({
    subId,
    action: () => getUserInfos([hex], subId),
    onEvent: (event) => {
      updateFeedPage(page, event);
    },
    onEose: () => {
      const { users } = pageResolve(page);

      if (users.length > 0) {
        updateSearchStore('users', () => [users[0]]);
      }

      updateSearchStore('isFetchingUsers', () => false);
    },
    onNotice: () => {
    },
  });
};

export const getRecomendedUsers = (profiles?: PrimalUser[]) => {
  const subId = `recomended_users_${APP_ID}`;

  let page = { ...emptyEventFeedPage() };

  updateSearchStore('isFetchingUsers', () => true);

  primalAPI({
    subId,
    action: () => getUserMetadata(recomendedUsers, subId),
    onEvent: (event) => {
      updateFeedPage(page, event);
    },
    onEose: () => {
      const { users } = pageResolve(page);

      const known = profiles?.map(p => p.pubkey) || [];

      const recom = users.filter(u => !known.includes(u.pubkey))

      batch(() => {
        updateSearchStore('users', () => [ ...recom, ...(profiles || [])]);
        updateSearchStore('recomendedUsers', () => [ ...recom, ...(profiles || [])]);
        updateSearchStore('isFetchingUsers', () => false);
      })
    },
    onNotice: () => {
    },
  });

};

export const fetchTrendingNotes = async () => {
  if (searchStore.isFetchingInitNotes) return;
  updateSearchStore('isFetchingInitNotes', true);
  try {
    const { notes, paging } = await fetchScoredContent(
      accountStore.pubkey,
      'trending_24h',
      `get_init_notes_${APP_ID}`,
    );

    updateSearchStore('paging', () => ({ ...paging }));
    updateSearchStore('notes', () => [ ...notes]);
    updateSearchStore('initNotes', () => [ ...notes]);
  } catch (error) {
    logError('failed-to-fetch-init-notes');
  } finally {
    updateSearchStore('isFetchingInitNotes', false);
  }

}

export const fetchDefaultReads = async () => {
  if (searchStore.isFetchingInitReads) return;
  updateSearchStore('isFetchingInitReads', true);

  try {
    const { reads, paging } = await fetchMegaFeed(
      accountStore.pubkey,
      JSON.stringify({ id: "nostr-reads-feed", kind: "reads"}),
      `get_init_reads_${APP_ID}`,
      { limit: 6 },
    );

    updateSearchStore('paging', () => ({ ...paging }));
    updateSearchStore('reads', () => [ ...reads]);
    updateSearchStore('initReads', () => [ ...reads]);
  } catch (error) {
    logError('failed-to-fetch-init-notes');
  } finally {
    updateSearchStore('isFetchingInitReads', false);
  }
}

export const findContent = async (query: string, until = 0) => {

  try {

    const spec = JSON.stringify({ id: 'advsearch', query });

    updateSearchStore('isFetchingContent' , () => true);

    const kind = query.includes('kind:30023') ? 'reads' : 'notes';

    let offset = 0;

    if (kind === 'reads') {
      offset = calculateReadsOffset(searchStore.reads, searchStore.paging);
    } else if (kind === 'notes') {
      offset = calculateNotesOffset(searchStore.notes, searchStore.paging);
    }

    const { notes, reads, paging } = await fetchMegaFeed(
      accountStore.pubkey,
      spec,
      `adv_search_${APP_ID}`,
      {
        limit: 20,
        until,
        offset,
      }
    );


    const sortedNotes = filterAndSortNotes(notes, paging);
    const sortedReads = filterAndSortReads(reads, paging);

    updateSearchStore('paging', () => ({ ...paging }));
    updateSearchStore('reads', () => [ ...sortedReads]);
    updateSearchStore('notes', () => [ ...sortedNotes]);

  } catch (e) {
    logError('ERROR fetching search results: ', e);
  }

  updateSearchStore('isFetchingContent' , () => false);
}

export const clearSearch = () => {
  updateSearchStore(() => ({
    users: [],
    scores: {},
    isFetchingUsers: false,
  }))
}

export const calculateNotesOffset = (notes: PrimalNote[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=notes.length-1;i>=0;i--) {
    const note = notes[i];

    if (
      paging.sortBy === 'created_at' &&
      note.created_at !== paging.since
    ) break;

    if (
      paging.sortBy === 'satszapped' &&
      note.stats.satszapped !== paging.since
    ) break;

    if (
      paging.sortBy === 'score' &&
      note.stats.score !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const calculateReadsOffset = (reads: PrimalArticle[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=reads.length-1;i>=0;i--) {
    const read = reads[i];

    if (
      paging.sortBy === 'created_at' &&
      read.created_at !== paging.since
    ) break;

    if (
      paging.sortBy === 'satszapped' &&
      read.stats.satszapped !== paging.since
    ) break;

    if (
      paging.sortBy === 'score' &&
      read.stats.score !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const removeEvent = (id: string, kind: 'reads' | 'notes') => {
  updateSearchStore(kind, (drs) => drs.filter(d => d.id !== id));
}


export const fetchUserSearch = (pubkey: string | undefined, query: string, limit = 10) => {
  const subId = `mention_users_${uuidv4()}_${APP_ID}`;
  return new Promise<PrimalUser[]>((resolve, reject) => {

    let users: PrimalUser[] = [];
    let scores: Record<string, number> = {};

    let page = { ...emptyEventFeedPage() };

    primalAPI({
      subId,
      action: () => searchUsers(pubkey, subId, query),
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        const { users } = pageResolve(page);

        const sorted = users.sort((a, b) => {
          const aScore = a.userStats?.followers_count || 0;
          const bScore = b.userStats?.followers_count || 0;

          return bScore - aScore;
        });

        resolve(sorted.slice(0, 10));
      },
      onNotice: () => {
        reject('failed_to_fetch_users');
      }
    });
  });
};

export const fetchRecomendedUsersAsync = async (profiles?: PrimalUser[]) => {
  let recomended = await getUsers(recomendedUsers);

  const known = searchStore.userHistory.profiles.map(p => p.pubkey);

  recomended = recomended.filter(u => !known.includes(u.pubkey));

  return [...searchStore.userHistory.profiles, ...recomended].slice(0, 9);
};

export const addToUserHistory = (user: PrimalUser) => {
  const stats = user.userStats;

  let history = searchStore.userHistory.profiles;

  if (history.map(p => p.pubkey).includes(user.pubkey)) {
    history = [ {...user }, ...history.filter(p => p.pubkey !== user.pubkey)].slice(0, 9);
  }
  else {
    history = [{...user }, ...history].slice(0, 9);
  }

  batch(() => {
    updateSearchStore('userHistory', 'profiles', () => [...history] );
    if (stats) {
      updateSearchStore('userHistory', 'stats', hStats => ({...hStats, [user.pubkey]: { ...stats }}));
    }
  });
}

export const loadUserHistory = async () => {
  const users = await getUsers(searchStore.userHistory.profiles.map(p => p.pubkey));

  updateSearchStore('userHistory', 'profiles', () => [...users]);
}
