import { Tabs } from '@kobalte/core/tabs';
import { Search } from '@kobalte/core/search';
import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import DOMPurify from 'dompurify';
import tippy, { Instance } from 'tippy.js';

import { APP_ID } from 'src/App';
import Avatar from 'src/components/Avatar/Avatar';
import Note, { NoteSuggestionSkeleton } from 'src/components/Event/Note';
import SearchOption from 'src/components/Search/SearchOptions';
import { Kind } from 'src/constants';
import { PrimalUser, PrimalNote, PrimalArticle } from 'src/primal';
import { userName } from 'src/utils/profile';
import { subsTo } from 'src/utils/socket';
import { previousWord, nip05Verification } from 'src/utils/ui';
import { clearSearch, findContent, findUserByNupub, findUsers, getRecomendedUsers, removeEvent, searchStore } from 'src/stores/SearchStore';
import { getUsersRelayInfo } from 'src/primal_api/relays';
import Dialog from 'src/components/Dialogs/Dialog';
import ArticlePreviewSuggestion, { ArticlePreviewSuggestionSkeleton } from 'src/components/Event/ArticlePreviewSuggestion';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';



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

  const [suggestedTerm, setSuggestedTerm] = createSignal('');
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!pop?.state.isShown) return;

    if (event.key === 'Escape') {
      pop?.hide();
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


    if (['Enter', 'Space', 'Comma', 'Tab'].includes(event.code)) {
      const sel = document.getElementById(`mention_suggested_user_${highlightedUser()}`);

      sel && sel.click();

      return true;
    }

    return false;

    // @ts-ignore
    // return component?.ref?.onKeyDown(props)
  };

  let pop: Instance | undefined;

  createEffect(() => {
    if (props.open) {
      setTimeout(() => {
        if (!searchInput) return;

        let component = (
          <div class={styles.suggest}>
            <For each={searchStore.users}>
              {(user, index) => (
                <SearchOption
                  id={`mention_suggested_user_${index()}`}
                  title={userName(user.pubkey)}
                  description={nip05Verification(user)}
                  icon={<Avatar user={user} size={32} />}
                  statNumber={searchStore.userHistory.stats[user.pubkey]?.followers_count || searchStore.scores[user.pubkey]}
                  statLabel={'Followers'}
                  // @ts-ignore
                  onClick={() => {
                    if (!searchInput) return;
                    pop?.hide()
                    searchInput.value = user.npub;
                    searchInput.focus();
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  highlighted={highlightedUser() === index()}
                />
              )}
            </For>
          </div>);

        // @ts-ignore
        pop = tippy(document.getElementById('search_users'), {
          content: component,
          // showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          appendTo: 'parent',
          sticky: 'reference',
          onShow(instance) {
            document.addEventListener('keydown', onKeyDown);
          },
          onHide(instance) {
            document.removeEventListener('keydown', onKeyDown);
          },
        });
      }, 10)
    }
    else {
      pop?.destroy();
    }
  })

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
              />
            </Search.Control>
          </Search>
        </div>

        <div class={styles.searchResults}>
          <div>
            <For each={searchStore.users}>
              {(user) => (
                <SearchOption
                  title={userName(user.pubkey)}
                  description={nip05Verification(user)}
                  icon={<Avatar user={user} size={36} />}
                  statNumber={user.userStats?.followers_count || searchStore.userHistory.stats[user.pubkey]?.followers_count || searchStore.scores[user.pubkey]}
                  statLabel={'Followers'}
                  onClick={() => selectUser(user)}
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

