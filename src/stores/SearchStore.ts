import { createStore } from "solid-js/store";
import { APP_ID } from "src/App";
import { Kind } from "src/constants";
import { NostrEventContent, PaginationInfo, PrimalArticle, PrimalNote, PrimalUser, UserStats } from "src/primal";
import { fetchMegaFeed } from "src/primal_api/feeds";
import { getUserInfos, getUserMetadata, getUsers } from "src/primal_api/profile";
import { searchUsers } from "src/primal_api/search";
import { convertToUser, emptyEventFeedPage, emptyPaging, filterAndSortNotes, filterAndSortReads, pageResolve, updateFeedPage } from "src/utils/feeds";
import { nip19 } from "src/utils/nTools";
import { primalAPI, subsTo } from "src/utils/socket";
import { accountStore } from "./AccountStore";
import { logError } from "src/utils/logger";
import { batch } from "solid-js";
import { readUserHistory, storeUserHistory } from "src/utils/localStore";

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
});

export const recomendedUsers = [
  '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2', // jack
  'bf2376e17ba4ec269d10fcc996a4746b451152be9031fa48e74553dde5526bce', // carla
  'c48e29f04b482cc01ca1f9ef8c86ef8318c059e0e9353235162f080f26e14c11', // walker
  '85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204', // preston
  'eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f', // lyn
  '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9', // odell
  '472f440f29ef996e92a186b8d320ff180c855903882e59d50de1b8bd5669301e', // marty
  'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411', // nvk
  '91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832', // rockstar
  'fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52', // pablo
];

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

  let decoded: nip19.DecodeResult | undefined;

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






  // let users: PrimalUser[] = [];

  // const unsub = subsTo(subId, {
  //   onEvent: (_, content) => {
  //     if (!content) {
  //       return;
  //     }

  //     if (content.kind === Kind.Metadata) {
  //       const user = content as NostrEventContent;

  //       users.push(convertToUser(user, content.pubkey!));
  //       return;
  //     }

  //     if (content.kind === Kind.UserScore) {
  //       const scores = JSON.parse(content.content || '{}');

  //       updateSearchStore('scores', () => ({ ...scores }));
  //       return;
  //     }
  //   },
  //   onEose: () => {
  //     const sorted = users.sort((a, b) => {
  //       const aScore = searchStore.scores[a.pubkey];
  //       const bScore = searchStore.scores[b.pubkey];

  //       return bScore - aScore;
  //     });

  //     updateSearchStore('users', () => sorted.slice(0, 10));
  //     updateSearchStore('isFetchingUsers', () => false);

  //     unsub();
  //     return;
  //   }
  // });

  // const pubkey = query.length > 0 ? undefined : publicKey;

  // updateSearchStore('isFetchingUsers', () => true);
  // searchUsers(pubkey, subId, query);
}


export const findUserByNupub = (npub: string) => {
  const subId = `find_npub_${APP_ID}`;

  let decoded: nip19.DecodeResult | undefined;

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

  let users: PrimalUser[] = [];

  const unsub = subsTo(subId, {
    onEvent: (_, content) => {
      if (!content) return;

      if (content.kind === Kind.Metadata) {
        const user = content as NostrEventContent;

        users.push(convertToUser(user, content.pubkey!));
      }

      if (content.kind === Kind.UserScore) {
        const scores = JSON.parse(content.content || '{}');

        updateSearchStore('scores', () => ({ ...scores }));
      }
    },
    onEose: () => {

      if (users.length > 0) {
        updateSearchStore('users', () => [users[0]]);
      }

      updateSearchStore('isFetchingUsers', () => false);

      unsub();
    },
  });

  getUserInfos([hex], subId);
};

export const getRecomendedUsers = (profiles?: PrimalUser[]) => {
  const subid = `recomended_users_${APP_ID}`;

  let users: PrimalUser[] = [];

  const unsub = subsTo(subid, {
    onEvent: (_, content) => {
      if (!content) return;

      if (content.kind === Kind.Metadata) {
        const user = content as NostrEventContent;

        users.push(convertToUser(user, content.pubkey!));
      }

      if (content.kind === Kind.UserScore) {
        const scores = JSON.parse(content.content || '{}');

        updateSearchStore('scores', () => ({ ...scores }));
      }
    },
    onEose: () => {

      // let sorted: PrimalUser[] = [];

      const known = profiles?.map(p => p.pubkey) || [];

      users = users.filter(u => !known.includes(u.pubkey))

      // users.forEach((user) => {
      //   const index = recomendedUsers.indexOf(user.pubkey);
      //   sorted[index] = { ...user };
      // });

      if (profiles) {
        users = [...profiles, ...users].slice(0, 9);
      }

      batch(() => {
        updateSearchStore('users', () => users);
        updateSearchStore('isFetchingUsers', () => false);
      })

      unsub();
    },
  });


  updateSearchStore('isFetchingUsers', () => true);
  getUserMetadata(recomendedUsers, subid);

};


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


export const fetchUserSearch = (pubkey: string | undefined, subId: string, query: string, limit = 10) => {
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
    history = [ {...user }, ...history.filter(p => p.pubkey !== user.pubkey)];
    return;
  }

  history = [{...user }, ...history];

  batch(() => {
    updateSearchStore('userHistory', 'profiles', profiles => [{ ...user}, ...profiles] );
    if (stats) {
      updateSearchStore('userHistory', 'stats', hStats => ({...hStats, [user.pubkey]: { ...stats }}));
    }
  });

  storeUserHistory(accountStore.pubkey, history);
}

export const loadUserHistory = async () => {
  const history = readUserHistory(accountStore.pubkey);

  const users = await getUsers(history);

  updateSearchStore('userHistory', 'profiles', () => [...users]);
}
