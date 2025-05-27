import { createStore } from "solid-js/store";
import { APP_ID } from "src/App";
import { Kind } from "src/constants";
import { PrimalUser } from "src/primal";
import { getUsers } from "src/primal_api/profile";
import { searchUsers } from "src/primal_api/search";
import { emptyEventFeedPage, pageResolve, updateFeedPage } from "src/utils/feeds";
import { nip19 } from "src/utils/nTools";
import { primalAPI } from "src/utils/socket";

export type SearchStore = {
  users: PrimalUser[],
  isFetchingUsers: boolean,
}

export const [searchStore, updateSearchStore] = createStore<SearchStore>({
  users: [],
  isFetchingUsers: false,
});

export const findUsers = (query: string, pubkey?: string) => {
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
          return (b.userStats?.follows_count || 0) - (a.userStats?.followers_count || 0);
        });
        resolve(users)
      },
      onNotice: () => {
        reject('failt_to_search_users')
      }
    })
  });
}

export const findUserByNpub = async (npub: string) => {

  let decoded: nip19.DecodeResult | undefined;

  try {
    decoded = nip19.decode(npub);
  } catch (e) {
    return findUsers(npub);
  }

  if (!decoded) {
    return findUsers(npub);
  }

  const hex = typeof decoded.data === 'string' ?
    decoded.data :
    (decoded.data as nip19.ProfilePointer).pubkey;

  return getUsers([hex])
}
