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
import ArticleReviewPreview from 'src/components/Event/ArticleReviewPreview';



const contentKinds: Record<string, number> = {
  notes: 1,
  reads: 30023,
}

const placeholders: Record<string, string> = {
  users: 'Search users by name or npub...',
  notes: 'Search notes by text or id...',
  reads: 'Search reads by text or address...',
}

const ReadsMentionDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onAddUser: (user: PrimalUser, relays: string[]) => void,
  onAddNote: (note: PrimalNote) => void,
  onAddRead: (read: PrimalArticle) => void,
}> = (props) => {

  const [query, setQuery] = createSignal('');

  let searchInput: HTMLInputElement | undefined;

  let userRelays: Record<string, string[]> = {};

  const [activeTab, setActiveTab] = createSignal('users');

  createEffect(() => {
    if (props.open && activeTab()) {
      setQuery(() => '')
      setTimeout(() => {
        if (!searchInput) return;
        setQuery(() => searchInput?.value || '')
        searchInput.focus();
      }, 100)
    }
  });

  createEffect(on(query, (q, prev) => {
    if (q === prev) return;

    const tab = activeTab();
    if (tab === 'users') {
      searchUsers(q);
      return;
    }

    searchContent(q, tab);
  }));

  const searchUsers = (q: string) => {
    if (q.length === 0) {
      getRecomendedUsers(searchStore.userHistory.profiles || []);
      return;
    }

    findUsers(q);
  }

  const searchContent = (q: string, tab: string) => {
    if (q.length === 0 || !searchInput) {
      clearSearch();
      return;
    }

    const lastWord = previousWord(searchInput);

    if (
      lastWord.startsWith('from:') ||
      lastWord.startsWith('to:') ||
      lastWord.startsWith('zappedby:')
    ) {
      pop?.show();
      filterUsers(lastWord, searchInput);
      return;
    } else {
      pop?.state.isShown && pop.hide();
    }

    const kind = contentKinds[tab] || 1;
    const term = `kind:${kind} ${q}`;
    clearSearch();
    findContent(term);
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
                    let v = searchInput.value;
                    const filter = suggestedTerm().split(':')[0] || '';

                    // const nprofile = nip19.nprofileEncode({ pubkey: user.pubkey });

                    searchInput.value = v.replace(suggestedTerm(), `${filter}:${user.npub} `);
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

  const filterUsers = (term: string, input: HTMLInputElement) => {
    const q = term.split(':')[1] || '';
    findUsers(q);
    setSuggestedTerm(() => term);
  }

  const onInput = (value: string) => {
    if (value.startsWith('npub') || value.startsWith('nprofile')) {
      findUserByNupub(value);
      return;
    }

    setQuery(DOMPurify.sanitize(value) || '');
  };

  const resetQuery = () => {
    setQuery('');

    if (searchInput) {
      searchInput.value = '';
    }
  };

  const selectUser = (user: PrimalUser) => {
    props.onAddUser(user, userRelays[user.pubkey]);
    resetQuery();
  }

  const selectNote = (note: PrimalNote) => {
    props.onAddNote && props.onAddNote(note);
    resetQuery();
  }

  const selectRead = (note: PrimalArticle) => {
    props.onAddRead && props.onAddRead(note);
    resetQuery();
  }

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title="Add mention"
    >
      <div class={styles.readsMentionDialog}>
        <Tabs value={activeTab()} onChange={setActiveTab}>
          <Tabs.List class={styles.tabs}>
            <Tabs.Trigger class={styles.tab} value="users">
              People
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.tab} value="notes">
              Notes
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.tab} value="reads">
              Reads
            </Tabs.Trigger>
            <Tabs.Indicator class={styles.tabIndicator} />
          </Tabs.List>

          <div>
            <Search
              options={[]}
              onInputChange={onInput}
              debounceOptionsMillisecond={300}
              placeholder={placeholders[activeTab()] || ''}
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
            <Tabs.Content value="users">
              <div>
                <For each={searchStore.users}>
                  {(user) => (
                    <SearchOption
                      title={userName(user.pubkey)}
                      description={nip05Verification(user)}
                      icon={<Avatar user={user} size={36} />}
                      statNumber={searchStore.userHistory.stats[user.pubkey]?.followers_count || searchStore.scores[user.pubkey]}
                      statLabel={'Followers'}
                      onClick={() => selectUser(user)}
                    />
                  )}
                </For>
              </div>
            </Tabs.Content>

            <Tabs.Content value="notes">
              <div class={styles.noteList}>
                <Show
                  when={!searchStore.isFetchingContent}
                  fallback={
                    <>searching...</>
                  }
                >
                  <For each={searchStore.notes.slice(0, 10)} >
                    {note => (
                      <Note
                        note={note}
                        onClick={() => selectNote(note)}
                        onRemove={(id: string) => {
                          removeEvent(id, 'notes');
                        }}
                        variant="suggestion"
                      />
                    )}
                  </For>
                </Show>
              </div>
            </Tabs.Content>

            <Tabs.Content value="reads">
              <div class={styles.noteList}>
                <Show
                  when={!searchStore.isFetchingContent}
                  fallback={
                    <For each={Array.from({ length: 10 }, (_, i) => i)}>
                      {() => (<ArticlePreviewSuggestionSkeleton />)}
                    </For>
                  }
                >
                  <For each={searchStore.reads.slice(0, 10)} >
                    {read => (
                      <ArticleReviewPreview
                        article={read}
                        onClick={() => {
                          selectRead(read)
                        }}
                      />
                    )}
                  </For>
                </Show>
              </div>
            </Tabs.Content>
          </div>
        </Tabs>
      </div>
    </Dialog>
  );
}

export default ReadsMentionDialog;

