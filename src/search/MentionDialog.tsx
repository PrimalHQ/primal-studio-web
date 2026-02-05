import { Tabs } from '@kobalte/core/tabs';
import { Search } from '@kobalte/core/search';
import { Component, createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';

import styles from './MentionDialog.module.scss';
import DOMPurify from 'dompurify';
import tippy, { Instance } from 'tippy.js';

import { APP_ID } from 'src/App';
import Avatar from 'src/components/Avatar/Avatar';
import SearchOption from './SearchOption';
import { Kind } from 'src/constants';
import { PrimalUser, PrimalNote, PrimalArticle } from 'src/primal';
import { userName, userNameFromUser } from 'src/utils/profile';
import { subsTo } from 'src/utils/socket';
import { previousWord, nip05Verification } from 'src/utils/ui';
import {
  addToUserHistory,
  clearSearch,
  fetchRecomendedUsersAsync,
  findContent,
  findUserByNupub,
  findUsers,
  searchStore,
  updateSearchStore,
} from './searchStore';
import { getUsersRelayInfo } from 'src/primal_api/relays';
import Modal from 'src/components/Dialogs/Dialog';
import { createStore, unwrap } from 'solid-js/store';
import NotePreview, { NotePreviewSkeleton } from './NotePreview';
import ArticlePreview, { ArticlePreviewSkeleton } from './ArticlePreview';
import UserPreview, { UserPreviewSkeleton } from './UserPreview';


const contentKinds: Record<string, number> = {
  notes: 1,
  reads: 30023,
}

const placeholders: Record<string, string> = {
  users: 'Search users by name or npub...',
  notes: 'Search notes by text or id...',
  reads: 'Search reads by text or address...',
  authors: 'Posted by...',
}

const MentionDialog: Component<{
  id?: string,
  open: string,
  setOpen?: (v: boolean) => void,
  onAddUser?: (user: PrimalUser, relays: string[]) => void,
  onAddNote?: (note: PrimalNote) => void,
  onAddRead?: (read: PrimalArticle) => void,
  onClose?: () => void,
}> = (props) => {

  const [query, setQuery] = createSignal('');
  const [selectedAuthor, setSelectedAuthor] = createSignal<PrimalUser>();
  const [authorSearchQuery, setAuthorSeachQuery] = createSignal<string>('');
  const [isSelectingAuthor, setIsSelectingAuthor] = createSignal(false);
  const [recomendedAuthors, setRecomendedAuthors] = createStore<PrimalUser[]>([]);

  let searchInput: HTMLInputElement | undefined;
  let authorInput: HTMLInputElement | undefined;
  let searchResults: HTMLDivElement | undefined;

  let userRelays: Record<string, string[]> = {};

  const tabList = ['users', 'notes', 'reads'];

  const [activeTab, setActiveTab] = createSignal('users');

  createEffect(() => {
    const tab = props.open;

    if (['users', 'notes', 'reads'].includes(tab)) {
      setActiveTab(tab);

      resetSelection();
    }
    else {
      props.onClose?.();
      // setTimeout(() => {
      //   setQuery('');
      //   setSelectedAuthor(undefined);
      // }, 300)
    }
  });

  createEffect(on(() => props.open, (isOpen) => {
    if (isOpen !== '') {
      // setQuery(() => '')
      setTimeout(() => {
        if (!searchInput) return;
        // setQuery(() => searchInput?.value || '')
        searchInput.focus();
      }, 100);

      updateRecomendedAuthors()
    }
  }));

  createEffect(on(query, (q, prev) => {
    if (q === prev) return;

    const tab = activeTab();
    if (tab === 'users') {
      searchUsers(q);
      return;
    }

    searchContent(q, tab);
  }));

  createEffect(on(activeTab, (tab, prev) => {
    if (tab === prev) return;

    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
      }, 300);
    }

    resetSelection();

    const q = query();

    if (tab === 'users') {
      searchUsers(q);
      return;
    }

    searchContent(q, tab);
  }));

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

  const resetSelection = () => {
    setSelectionIndex(-1);

    const el = document.querySelector(`[data-index="${0}"]`) as HTMLElement;

    el?.classList.add(styles.selected);

    el?.scrollIntoView({ behavior: 'smooth'})
  }

  const searchUsers = (q: string) => {
    if (q.length === 0) {
      updateSearchStore('users', () => [ ...searchStore.recomendedUsers ]);
      // getRecomendedUsers(searchStore.userHistory.profiles || []);
      return;
    }

    findUsers(q);
  }

  const searchContent = (q: string, tab: string) => {
    if (q.length === 0 || !searchInput) {
      if (tab === 'notes') {
        updateSearchStore('notes', () => [ ...searchStore.initNotes ]);
      }
      if (tab === 'reads') {
        updateSearchStore('reads', () => [ ...searchStore.initReads ]);
      }
      // clearSearch();
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
  const [selectionIndex, setSelectionIndex] = createSignal(-1);

  const onSearchKeyDown = (event: KeyboardEvent) => {
    if (pop?.state.isVisible) return;

    // @ts-ignore
    const list = searchStore[activeTab()];

    if (event.key === 'ArrowDown') {
      if (!list) return false;
      const old = document.querySelector(`[data-index="${selectionIndex()}"]`) as HTMLElement;

      old?.classList.remove(styles.selected);

      setSelectionIndex(i => i >= list.length - 1 ? list.length - 1 : i+1)

      const newEl = document.querySelector(`[data-index="${selectionIndex()}"]`) as HTMLElement;

      newEl?.classList.add(styles.selected);

      newEl?.scrollIntoView({ behavior: 'smooth'})

      return true;
    }

    if (event.key === 'ArrowUp') {
      if (!list) return false;
      const old = document.querySelector(`[data-index="${selectionIndex()}"]`) as HTMLElement;

      old?.classList.remove(styles.selected);
      setSelectionIndex(i => i <= 0 ? 0 : i-1)

      const newEl = document.querySelector(`[data-index="${selectionIndex()}"]`) as HTMLElement;

      newEl?.classList.add(styles.selected);

      newEl?.scrollIntoView({ behavior: 'smooth'})
      return true;
    }

    // if (event.key === 'ArrowLeft' && event.altKey) {
    //   let index = tabList.findIndex(t => t === activeTab());

    //   if (index <= 0) {
    //     index = 0;
    //   }
    //   else {
    //     index = index - 1;
    //   }

    //   setActiveTab(() => tabList[index])
    //   return true;
    // }

    // if (event.key === 'ArrowRight' && event.altKey) {
    //   let index = tabList.findIndex(t => t === activeTab());

    //   if (index >= tabList.length - 1) {
    //     index = tabList.length - 1;
    //   }
    //   else {
    //     index = index + 1;
    //   }

    //   setActiveTab(() => tabList[index])
    //   return true;
    // }


    if (['Enter'].includes(event.key)) {
      const sel = document.querySelector(`[data-index="${selectionIndex()}"]>div`) as HTMLElement;

      sel?.click();

      return true;
    }

    return false;

    // @ts-ignore
    // return component?.ref?.onKeyDown(props)
  };
  const [selectionAuthorIndex, setSelectionAuthorIndex] = createSignal(-1);


  const onSearchAuthorKeyDown = (event: KeyboardEvent) => {
    if (pop?.state.isVisible) return;

    // @ts-ignore
    const list = recomendedAuthors;

    if (event.key === 'ArrowDown') {
      if (!list) return false;
      const old = document.querySelector(`[data-author-index="${selectionAuthorIndex()}"]`) as HTMLElement;

      old?.classList.remove(styles.selected);

      setSelectionAuthorIndex(i => i >= list.length - 1 ? list.length - 1 : i+1)

      const newEl = document.querySelector(`[data-author-index="${selectionAuthorIndex()}"]`) as HTMLElement;

      newEl?.classList.add(styles.selected);

      newEl?.scrollIntoView({ behavior: 'smooth'})

      return true;
    }

    if (event.key === 'ArrowUp') {
      if (!list) return false;
      const old = document.querySelector(`[data-author-index="${selectionAuthorIndex()}"]`) as HTMLElement;

      old?.classList.remove(styles.selected);
      setSelectionAuthorIndex(i => i <= 0 ? 0 : i-1)

      const newEl = document.querySelector(`[data-author-index="${selectionAuthorIndex()}"]`) as HTMLElement;

      newEl?.classList.add(styles.selected);

      newEl?.scrollIntoView({ behavior: 'smooth'})
      return true;
    }

    // if (event.key === 'ArrowLeft' && event.altKey) {
    //   let index = tabList.findIndex(t => t === activeTab());

    //   if (index <= 0) {
    //     index = 0;
    //   }
    //   else {
    //     index = index - 1;
    //   }

    //   setActiveTab(() => tabList[index])
    //   return true;
    // }

    // if (event.key === 'ArrowRight' && event.altKey) {
    //   let index = tabList.findIndex(t => t === activeTab());

    //   if (index >= tabList.length - 1) {
    //     index = tabList.length - 1;
    //   }
    //   else {
    //     index = index + 1;
    //   }

    //   setActiveTab(() => tabList[index])
    //   return true;
    // }

    if (['Enter'].includes(event.key)) {
      const sel = document.querySelector(`[data-author-index="${selectionAuthorIndex()}"]>div`) as HTMLElement;

      sel?.click();

      return true;
    }
    if (['Escape'].includes(event.key)) {
      resetAuthorTerm();

      return true;
    }

    return false;

    // @ts-ignore
    // return component?.ref?.onKeyDown(props)
  };

  const onKeyPopDown = (event: KeyboardEvent) => {
    if (!pop?.state.isVisible) return;

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
            document.addEventListener('keydown', onKeyPopDown);
          },
          onHide(instance) {
            document.removeEventListener('keydown', onKeyPopDown);
          },
        });
      }, 100)
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

    const author = selectedAuthor();

    let searchFor = author ? `from:${author.npub} ${value}` : value;

    setQuery(DOMPurify.sanitize(searchFor) || '');
  };

  const resetQuery = () => {
    setQuery('');

    if (searchInput) {
      searchInput.value = '';
    }
  };

  const onAuthorSearchInput = (value: string) => {
    if (value.length === 0) {
      // resetAuthorTerm();
      setAuthorSeachQuery('');
      return;
    }

    setIsSelectingAuthor(true);

    setAuthorSeachQuery(value);

    if (value.startsWith('npub') || value.startsWith('nprofile')) {
      findUserByNupub(value);
      return;
    }

    searchUsers(DOMPurify.sanitize(value) || '')
  };

  const resetAuthorTerm = () => {
    setIsSelectingAuthor(false);
    setSelectionAuthorIndex(-1);
    setAuthorSeachQuery('');

    if (authorInput) {
      authorInput.value = '';
    }

    onInput(searchInput?.value || '');

    searchInput?.focus();
  };

  createEffect(() => {
    if (selectedAuthor()) {
      searchInput?.focus();
    }
  })

  const selectAuthor = (author: PrimalUser | undefined) => {
    setSelectedAuthor(author);

    const value = searchInput?.value || '';
    let searchFor = value;

    if (author) {
      addToUserHistory(author);
      searchFor = `from:${author.npub} ${value}`;
    }

    setQuery(DOMPurify.sanitize(searchFor) || '');

    resetAuthorTerm();
  }

  const selectUser = (user: PrimalUser) => {
    addToUserHistory(user)
    props.onAddUser?.(user, userRelays[user.pubkey]);

    resetQuery();
  }

  const selectNote = (note: PrimalNote) => {
    props.onAddNote?.(note);
    resetQuery();
  }

  const selectRead = (note: PrimalArticle) => {
    props.onAddRead?.(note);
    resetQuery();
  }

  return (
    <Modal
      triggerClass="displayNone"
      open={['users', 'notes', 'reads'].includes(props.open)}
      setOpen={props.setOpen}
      title="Add Nostr Mention"
    >
      <div class={styles.mentionDialog}>
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

          <div class={styles.searchLine}>
            <Search
              options={[]}
              onInputChange={onInput}
              debounceOptionsMillisecond={500}
              placeholder={placeholders[activeTab()] || ''}
            >
              <Search.Control class={styles.textInput}>
                <Search.Indicator
                  class={styles.searchIndicator}
                >
                  <Switch>
                    <Match when={activeTab() === 'users'}>
                      <Search.Icon>
                        <div class={styles.userIcon}></div>
                      </Search.Icon>
                    </Match>
                    <Match when={true}>
                      <Search.Icon>
                        <div class={styles.searchIcon}></div>
                      </Search.Icon>
                    </Match>
                  </Switch>
                </Search.Indicator>
                <Search.Input
                  id="search_users"
                  ref={searchInput}
                  onKeyDown={onSearchKeyDown}
                  onFocus={() => {
                    setIsSelectingAuthor(false);
                  }}
                />
              </Search.Control>
            </Search>
            <Switch>
              <Match when={!selectedAuthor() && ['notes', 'reads'].includes(activeTab())}>
                <Search
                  options={[]}
                  onInputChange={onAuthorSearchInput}
                  debounceOptionsMillisecond={500}
                  placeholder={placeholders.authors}
                >
                  <Search.Control class={styles.authorInput}>
                    <Search.Indicator
                      class={styles.searchIndicator}
                    >
                      <Search.Icon>
                        <div class={styles.userIcon}></div>
                      </Search.Icon>
                    </Search.Indicator>
                    <Search.Input
                      id="search_users"
                      ref={authorInput}
                      onKeyDown={isSelectingAuthor() ?  onSearchAuthorKeyDown : onSearchKeyDown}
                      onFocus={() => {
                        setIsSelectingAuthor(true);
                      }}
                    />
                  </Search.Control>
                </Search>
              </Match>
              <Match when={selectedAuthor() && ['notes', 'reads'].includes(activeTab())}>
                <div
                  class={styles.selectedAuthor}
                  onClick={() => {
                    selectAuthor(undefined);
                  }}
                >
                  <Avatar user={selectedAuthor()} size={22} />
                  <div class={styles.userName}>{userNameFromUser(selectedAuthor())}</div>
                  <div class={styles.deselectAuthor}><div class={styles.closeIcon}></div></div>
                </div>
              </Match>
            </Switch>
          </div>

          <div class={styles.searchResults} ref={searchResults}>
            <Tabs.Content value="users">
              <div>
                <Show
                  when={!searchStore.isFetchingUsers}
                  fallback={
                    <div class={styles.searching}>
                      <For each={new Array(8)}>
                        {() => <UserPreviewSkeleton />}
                      </For>
                    </div>
                  }
                >
                  <For each={query().length > 0 ? searchStore.users : recomendedAuthors}>
                    {(foundUser, index) => {
                      const user = unwrap(foundUser);
                      return (
                        <div data-index={index()}>
                          <UserPreview
                            user={user}
                            onClick={() => selectUser(user)}
                            highlighted={index() === selectionIndex()}
                          />
                        </div>
                    )}}
                  </For>
                </Show>
              </div>
            </Tabs.Content>

            <Tabs.Content value="notes">
              <div class={styles.noteList}>
                <Switch>
                  <Match when={isSelectingAuthor()}>
                    <div class={styles.authorSearchResults}>
                      <For each={authorSearchQuery().length > 0 ? searchStore.users : recomendedAuthors}>
                        {(foundUser, index) => {
                          const user = unwrap(foundUser);
                          return (
                            <div data-author-index={index()}>
                              <UserPreview
                                user={user}
                                onClick={() => selectAuthor(user)}
                                highlighted={index() === selectionAuthorIndex()}
                              />
                            </div>
                        )}}
                      </For>
                    </div>
                  </Match>

                  <Match when={searchStore.isFetchingContent}>
                    <div class={styles.searching}>
                      <For each={new Array(5)}>
                        {() => <NotePreviewSkeleton />}
                      </For>
                    </div>
                  </Match>

                  <Match when={true}>
                    <For each={searchStore.notes} >
                      {(note, index) => (
                        <div data-index={index()}>
                          <NotePreview
                            note={note}
                            onClick={() => selectNote(note)}
                            dark={true}
                            highlighted={index() === selectionIndex()}

                          />
                        </div>
                      )}
                    </For>
                  </Match>
                </Switch>
              </div>
            </Tabs.Content>

            <Tabs.Content value="reads">
              <div class={styles.noteList}>
                <Switch>
                  <Match when={isSelectingAuthor()}>
                    <div class={styles.authorSearchResults}>
                      <For each={authorSearchQuery().length > 0 ? searchStore.users : recomendedAuthors}>
                        {(foundUser, index) => {
                          const user = unwrap(foundUser);
                          return (
                            <div data-author-index={index()}>
                              <UserPreview
                                user={user}
                                onClick={() => selectAuthor(user)}
                                highlighted={index() === selectionAuthorIndex()}
                              />
                            </div>
                        )}}
                      </For>
                    </div>
                  </Match>

                  <Match when={searchStore.isFetchingContent}>
                    <div class={styles.searching}>
                      <For each={new Array(5)}>
                        {() => <ArticlePreviewSkeleton />}
                      </For>
                    </div>
                  </Match>

                  <Match when={true}>
                    <For each={searchStore.reads} >
                      {(read, index) => (
                        <div data-index={index()}>
                          <ArticlePreview
                            article={read}
                            onClick={() => {
                              selectRead(read)
                            }}
                            dark={true}
                            highlighted={index() === selectionIndex()}
                          />
                        </div>
                      )}
                    </For>
                  </Match>
                </Switch>
              </div>
            </Tabs.Content>
          </div>
        </Tabs>
      </div>
    </Modal>
  );
}

export default MentionDialog;

