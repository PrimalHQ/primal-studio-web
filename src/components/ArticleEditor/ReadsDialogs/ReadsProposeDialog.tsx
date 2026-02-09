import { Search } from '@kobalte/core/search';
import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import DOMPurify from 'dompurify';
import tippy, { Instance } from 'tippy.js';

import { APP_ID } from 'src/App';
import Avatar from 'src/components/Avatar/Avatar';
import SearchOption from 'src/components/Search/SearchOptions';
import { Kind } from 'src/constants';
import { PrimalUser } from 'src/primal';
import { userName } from 'src/utils/profile';
import { subsTo } from 'src/utils/socket';
import { nip05Verification } from 'src/utils/ui';
import { getUsersRelayInfo } from 'src/primal_api/relays';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import { createStore } from 'solid-js/store';
import { addToUserHistory, fetchRecomendedUsersAsync, findUserByNupub, findUsers, getRecomendedUsers, searchStore } from 'src/search/searchStore';


const contentKinds: Record<string, number> = {
  notes: 1,
  reads: 30023,
}

const placeholders: Record<string, string> = {
  users: 'Search users by name or npub...',
  notes: 'Search notes by text or id...',
  reads: 'Search reads by text or address...',
}

const ReadsProposeDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onAddUser: (user: PrimalUser | undefined) => void,
}> = (props) => {

  const [query, setQuery] = createSignal('');
  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>()

  let searchInput: HTMLInputElement | undefined;

  let userRelays: Record<string, string[]> = {};

  createEffect(on(query, (q, prev) => {
    if (q === prev) return;

    searchUsers(q);
  }));

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        searchInput?.focus();
        setHighlightedUser(-1);
      }, 100)

      updateRecomendedAuthors()
    }
  })

  const [recomendedAuthors, setRecomendedAuthors] = createStore<PrimalUser[]>([]);

  const updateRecomendedAuthors = () => {
    const recs = searchStore.recomendedUsers;
    const history = searchStore.userHistory.profiles;

    if (recs.length > 0) {
      return setRecomendedAuthors([...history, ...recs].slice(0, 9));
    }

    fetchRecomendedUsersAsync(history).then(authors => {
      setRecomendedAuthors([...authors].slice(0, 9))
    })
  }

  const searchUsers = (q: string) => {
    if (q.length === 0) {
      getRecomendedUsers(searchStore.userHistory.profiles || []);
      return;
    }

    findUsers(q);
  }

  createEffect(on(() => searchStore.users, (users, prev) => {
    if (!users) return;

    const prevIds = prev?.map(u => u.pubkey) || [];

    const hasNew = users.some(u => !prevIds.includes(u.pubkey))

    if (hasNew) {
      fetchUserRelays(users);
    }
  }));

  const fetchUserRelays = async (users: PrimalUser[]) => {
    userRelays = await getUserRelays(users);
  };

  const getUserRelays = async (users: PrimalUser[]) => await (new Promise<Record<string, string[]>>(resolve => {
    const uids = Object.values(users).map(u => u.pubkey);
    const subId = `users_search_relays_${APP_ID}`;

    let relays: Record<string, string[]> = {};

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();
        resolve({ ...relays });
      },
      onEvent: (_, content) => {
        if (content.kind !== Kind.UserRelays) return;

        const pk = content.pubkey || 'UNKNOWN';

        let rels: string[] = [];

        let tags = content.tags || [];

        for (let i = 0; i < tags.length; i++) {
          if (rels.length > 1) break;

          const rel = tags[i];
          if (rel[0] !== 'r' || rels.includes(rel[1])) continue;

          rels.push(rel[1]);
        }

        relays[pk] = [...rels];
      },
      onNotice: () => resolve({}),
    })

    getUsersRelayInfo(uids, subId);
  }));

  const [highlightedUser, setHighlightedUser] = createSignal<number>(-1);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      props.setOpen?.(false);
      return true;
    }

    if (event.key === 'ArrowDown') {
      setHighlightedUser(i => {
        if (searchStore.users.length === 0) {
          return 0;
        }

        return i < searchStore.users.length ? i + 1 : 0;
      });

      return true;
    }

    if (event.key === 'ArrowUp') {
      setHighlightedUser(i => {
        if (searchStore.users.length === 0) {
          return 0;
        }

        return i > 0 ? i - 1 : searchStore.users.length;
      });
      return true;
    }


    if (['Enter'].includes(event.code)) {
      const sel = document.querySelector('[data-highlighted=true]') as HTMLElement | undefined;

      sel && sel.click();

      return true;
    }

    return false;
  };

  const onInput = (value: string) => {
    if (value.startsWith('npub') || value.startsWith('nprofile')) {
      findUserByNupub(value);
      return;
    }

    setQuery(DOMPurify.sanitize(value) || '');
  };

  const resetQuery = () => {
    setQuery('');
    setSelectedUser(undefined);

    if (searchInput) {
      searchInput.value = '';
    }
  };

  const selectUser = (user: PrimalUser) => {
    addToUserHistory(user)
    setSelectedUser(user);
    props.onAddUser(selectedUser())
    // resetQuery();
  }

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title="Propose to a Nostr User"
    >
      <div class={styles.readsMentionDialog}>
        <div class={styles.description}>
          Prepare the article and send to another Nostr user to publish under their name:
        </div>
        <div>
          <Search
            options={[]}
            onInputChange={onInput}
            debounceOptionsMillisecond={300}
            placeholder={placeholders['users'] || ''}
          >
            <Search.Control class={styles.textInput}>
              <Search.Indicator
                class={styles.searchIndicator}
              >
                <Search.Icon>
                  <div class={styles.searchIcon}></div>
                </Search.Icon>
              </Search.Indicator>
              <Search.Input
                id="search_users"
                ref={searchInput}
                onKeyDown={onKeyDown}
              />
            </Search.Control>
          </Search>
        </div>

        <div class={styles.searchResults}>
          <div>
            <For each={query().length > 0 ? searchStore.users : recomendedAuthors}>
              {(user, index) => (
                <SearchOption
                  title={userName(user.pubkey)}
                  description={nip05Verification(user)}
                  icon={<Avatar user={user} size={36} />}
                  statNumber={user.userStats?.followers_count || searchStore.userHistory.stats[user.pubkey]?.followers_count || searchStore.scores[user.pubkey]}
                  statLabel={'Followers'}
                  onClick={() => selectUser(user)}
                  highlighted={highlightedUser() === index()}
                />
              )}
            </For>
          </div>
        </div>

        <div class={styles.actions}>
          <ButtonSecondary
            light={true}
            onClick={() => {
              props.setOpen && props.setOpen(false)
            }}
          >
            Cancel
          </ButtonSecondary>
          <ButtonSecondary
            light={true}
            onClick={() => {
              resetQuery();
              props.onAddUser(undefined)
            }}
          >
            Remove User
          </ButtonSecondary>

          <Show when={selectedUser()}>
            <div class={styles.publishDateDisplay}>
              <Avatar user={selectedUser()!} size={32} />
              <div class={styles.dateInfo}>
                <div class={styles.userInfoCol}>
                  <div class={styles.userName}>{userName(selectedUser()!.pubkey)}</div>
                  <div class={styles.nip05}>{nip05Verification(selectedUser())}</div>
                </div>
              </div>
            </div>
          </Show>

        </div>
      </div>
    </Dialog>
  );
}

export default ReadsProposeDialog;

