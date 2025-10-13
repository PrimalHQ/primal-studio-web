import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Notes.module.scss';
import PageHeader from 'src/components/PageHeader/PageHeader';
import { FeedCriteria, GraphSpan } from '../Home/Home.data';
import SelectBox from 'src/components/SelectBox/SelectBox';
import { headerSortOptions } from 'src/constants';
import { clearPageStore, pageStore, removeEventFromPageStore } from 'src/stores/PageStore';
import FeedPage from 'src/components/Event/FeedPage';
import Paginator from 'src/components/Paginator/Paginator';
import { accountStore } from 'src/stores/AccountStore';
import { useParams, useSearchParams } from '@solidjs/router';
import { FeedEventState, HomePayload, isFeedEventState } from 'src/primal_api/studio';
import StudioTabs from 'src/components/Tabs/Tabs';
import FeedItemCard from 'src/components/Event/FeedItemCard';
import { PrimalDraft, PrimalNote } from 'src/primal';
import EventStats from 'src/components/Event/EventStats';
import { deleteSelected, fetchFeedTotals, fetchNotes, isAllSelected, notesStore, setNotesStore, toggleSelectAll, toggleSelected } from './Notes.data';
import NotePreview from 'src/components/Event/NotePreview';
import CheckBox from 'src/components/CheckBox/CheckBox';
import DraftPreview from 'src/components/Event/DraftPreview';
import ProposalPreview from 'src/components/Event/ProposalPreview';
import ScheduledInfo from 'src/components/Event/ScheduledInfo';
import { humanizeNumber } from 'src/utils/ui';
import { NoteHomeSkeleton } from 'src/components/Event/NoteHomePreview';
import { openEditNote } from 'src/stores/AppStore';
import NotesApproveDialog from 'src/components/ArticleEditor/ReadsDialogs/NotesApproveDialog';
import ReadsPublishingDateDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsPublishingDateDialog';
import { scheduleNote } from 'src/primal_api/nostr';
import { unwrap } from 'solid-js/store';
import { storeGraphSpan } from 'src/utils/localStore';

const Notes: Component = () => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const notePages = () => pageStore.notes.feedPages;
  const [visibleNotesPages, setVisibleNotesPages] = createSignal<number[]>([]);

  const shouldRenderEmptyNotes = (index: number) => {
    return !visibleNotesPages().includes(index);
  };

  let notesPageObserver: IntersectionObserver | undefined;

  notesPageObserver = new IntersectionObserver(entries => {
    let i=0;

    for (i=0; i<entries.length; i++) {
      const entry = entries[i];

      const target = entry.target;
      const id = parseInt(target.getAttribute('data-page-index') || '0');

      if (entry.isIntersecting) {
        const min = id < 3 ? 0 : id - 3;
        const max = id + 3;

        let config: number[] = [];

        for (let i=min; i<= max; i++) {
          config.push(i);
        }

        setVisibleNotesPages(() => [...config]);
      }
    }
  });

  const loadNextNotesPage = () => {
    if (pageStore.notes.lastRange.since === 0) return;

    const { since, until } = notesStore.graphSpan;

    let offset = notesStore.offset;

    fetchNotes(
      params.pubkey || accountStore.pubkey,
      {
        since: since(),
        until: until(),
        offset,
        limit: 30,
        criteria: notesStore.tabCriteriaOptions[notesStore.tab],
        state: notesStore.tab,
        showReplies: notesStore.showReplies,
      },
    );
  };

  const resetNotesLists = (pubkey: string, span: Partial<HomePayload & { showReplies?: boolean }>) => {

    const { since, until, criteria, state, showReplies } = span;

    clearPageStore('notes');
    setNotesStore('offset', () => 0);
    setNotesStore('selected', () => []);

    fetchFeedTotals(pubkey, { since, until, kind: 'notes' });

    fetchNotes(
      pubkey,
      {
        since,
        until,
        limit: 30,
        offset: 0,
        criteria: criteria || notesStore.tabCriteriaOptions[notesStore.tab],
        state: state || notesStore.tab,
        showReplies: showReplies || notesStore.showReplies,
      },
    );
  }

  createEffect(on(() => searchParams.tab, (tab, prev) => {
    let newTab = tab
    if (!newTab || typeof newTab !== 'string' || !isFeedEventState(newTab)) {
      newTab = 'published';
    }

    setNotesStore('tab', newTab as FeedEventState);
  }));

  createEffect(on(
    () => [notesStore.graphSpan.since(), notesStore.graphSpan.until()],
    (changes, prev) => {
      if (!prev) return;
      // When graph span changes

      const since = changes[0] || 0;
      const until = changes[1] || 0;

      if (since === prev[0] && until === prev[1]) return;

      const pubkey = params.pubkey || accountStore.pubkey;

      resetNotesLists(pubkey, { since, until });
    })
  );

  createEffect(on(() => notesStore.tabCriteriaOptions[notesStore.tab], (criteria, prev) => {
    if (!prev || criteria === prev) return;
    const { since, until } = notesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNotesLists(pubkey, { since: since(), until: until(), criteria });
  }));

  createEffect(on(() => notesStore.tab, (state, prev) => {
    if (state === prev) return;

    const { since, until } = notesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNotesLists(pubkey, { since: since(), until: until(), state });
  }));


  createEffect(on(() => notesStore.showReplies, (showReplies, prev) => {
    if (prev === undefined || showReplies === prev) return;
    const { since, until } = notesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNotesLists(pubkey, { since: since(), until: until(), showReplies });
  }));


  const openInPrimal = (note: PrimalNote | PrimalDraft) => {
    let link = `e/${note?.nId}`;

    return window.open(`https://primal.net/${link}`, '_blank')?.focus();
  };

  return (
    <>
      <Wormhole to="header">
        <PageHeader
          title={translate('notes', 'header')}
          isFetching={pageStore.notes.isFetching}
          selection={notesStore.graphSpan.name}
          hideSpans={!['published', 'published-replied'].includes(notesStore.tab)}
          onSpanSelect={(span: GraphSpan) => {
            setNotesStore('graphSpan', () => ({ ...span }));
            storeGraphSpan(accountStore.pubkey, 'notes', span);
          }}
        />
      </Wormhole>

      <div class={styles.feedHolder}>
        <div class={styles.itemsHolder}>
        <div class={styles.feedHeader}>
          <StudioTabs
            tabs={['published', 'scheduled', 'inbox', 'sent', 'drafts']}
            activeTab={notesStore.tab}
            defaultTab="published"
            onChange={(tab: string) => setSearchParams({ tab })}
            tabTriggerComponent={(tab: string) => (
              <div class={tab === notesStore.tab ? styles.activeTab : styles.inactiveTab}>
                {translate('notes', 'tabs', tab)} ({humanizeNumber(notesStore.feedTotals[tab as FeedEventState])})
              </div>
            )}
          >
          </StudioTabs>

          <div class={styles.additionalSettings}>
            <Show when={notesStore.tab === 'published'}>
              <CheckBox
                disabled={pageStore.notes.isFetching}
                checked={notesStore.showReplies}
                onChange={(v) => {
                  if (pageStore.notes.isFetching) return;
                  setNotesStore('showReplies', () => v)
                }}
              >
                <div class={styles.showRepliesCheck}>
                  Show replies
                </div>
              </CheckBox>
            </Show>

            <SelectBox
              prefix="Sort by:"
              value={headerSortOptions(notesStore.tab).find(o => o.value === notesStore.tabCriteriaOptions[notesStore.tab]) || headerSortOptions(notesStore.tab)[0]}
              options={headerSortOptions(notesStore.tab)}
              onChange={(option) => setNotesStore('tabCriteriaOptions', notesStore.tab, (option?.value || 'score') as FeedCriteria)}
            />
          </div>
        </div>

        <Show when={['sent', 'inbox', 'scheduled'].includes(notesStore.tab)}>
          <div class={styles.bulkControls}>
            <Show when={!pageStore.notes.isFetching}>
              <button
                class={styles.bulkControlButton}
                onClick={toggleSelectAll}
              >
                <Show
                  when={isAllSelected()}
                  fallback={<>Select All</>}
                >
                  <>Deselect All</>
                </Show>
              </button>
              <Show when={['inbox'].includes(notesStore.tab)}>
                <button
                  class={styles.bulkControlButton}
                  disabled={notesStore.selected.length === 0}
                >
                  Approve Selected
                </button>
              </Show>
              <button
                class={styles.bulkControlButton}
                disabled={notesStore.selected.length === 0}
                onClick={() => deleteSelected(notesStore.tab === 'scheduled' ? 'notes' : 'drafts')}
              >
                Delete Selected
              </button>
            </Show>
          </div>
        </Show>

        <div class={styles.feedContent}>
          <Show
            when={notePages().length > 0 || !pageStore.notes.isFetching}
            fallback={
              <div class={styles.emptyList}>
                <For each={Array(10)}>
                  {() =>
                    <NoteHomeSkeleton stretch={true} />
                  }
                </For>
              </div>
            }
          >
            <For each={notePages()}>
              {(page, pageIndex) => (
                <FeedPage
                  page={page}
                  isRenderEmpty={shouldRenderEmptyNotes(pageIndex())}
                  pageIndex={pageIndex()}
                  observer={notesPageObserver}
                  key="notes"
                  twoColumns={notePages().length === 0}
                  eventComponent={(e) => {
                    if (notesStore.tab === 'sent') {
                      const draft = page.drafts.find(a => a.id === e);

                      return (
                        <Show when={draft}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={draft!}
                            hideContextMenu={!['published'].includes(notesStore.tab)}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'drafts');

                              fetchFeedTotals(accountStore.pubkey, {
                                since: notesStore.graphSpan.since(),
                                until: notesStore.graphSpan.until(),
                                kind: 'notes'
                              });
                            }}
                          >
                            <ProposalPreview
                              draft={draft!}
                              onView={() => {
                                const note = JSON.parse(draft!.plain) as PrimalNote;
                                openEditNote(note);
                              }}
                              onDelete={(id: string) => {
                                removeEventFromPageStore(id, 'drafts');
                                fetchFeedTotals(accountStore.pubkey, {
                                  since: notesStore.graphSpan.since(),
                                  until: notesStore.graphSpan.until(),
                                  kind: 'notes'
                                });
                              }}
                              type='sent'
                              checked={notesStore.selected.includes(draft?.id || '-')}
                              onCheck={toggleSelected}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    if (notesStore.tab === 'inbox') {
                      const draft = page.drafts.find(a => a.id === e);

                      return (
                        <Show when={draft}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={draft!}
                            hideContextMenu={!['published'].includes(notesStore.tab)}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'drafts');
                              fetchFeedTotals(accountStore.pubkey, {
                                since: notesStore.graphSpan.since(),
                                until: notesStore.graphSpan.until(),
                                kind: 'notes'
                              });
                            }}
                          >
                            <ProposalPreview
                              draft={draft!}
                              onEdit={() => {
                                const note = JSON.parse(draft!.plain) as PrimalNote;
                                openEditNote(note, draft);
                              }}
                              onDelete={(id: string) => {
                                removeEventFromPageStore(id, 'drafts');
                                fetchFeedTotals(accountStore.pubkey, {
                                  since: notesStore.graphSpan.since(),
                                  until: notesStore.graphSpan.until(),
                                  kind: 'notes'
                                });
                              }}
                              onApprove={() => {
                                setNotesStore('approvedEvents', [draft!]);
                                setNotesStore('showApproveDialog', true);
                              }}
                              type='inbox'
                              checked={notesStore.selected.includes(draft?.id || '-')}
                              onCheck={toggleSelected}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    if (notesStore.tab === 'drafts') {
                      const draft = page.drafts.find(a => a.id === e);

                      return (
                        <Show when={draft}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={draft!}
                            hideContextMenu={!['published', 'published-replied'].includes(notesStore.tab)}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'drafts');
                              fetchFeedTotals(accountStore.pubkey, {
                                since: notesStore.graphSpan.since(),
                                until: notesStore.graphSpan.until(),
                                kind: 'notes'
                              });
                            }}
                          >
                            <DraftPreview
                              draft={draft!}
                              onEdit={() => {
                                const note = JSON.parse(draft!.plain) as PrimalNote;
                                openEditNote(note, draft);
                              }}
                              onDelete={(id: string) => {
                                removeEventFromPageStore(id, 'drafts');
                                fetchFeedTotals(accountStore.pubkey, {
                                  since: notesStore.graphSpan.since(),
                                  until: notesStore.graphSpan.until(),
                                  kind: 'notes'
                                });
                              }}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    if (notesStore.tab === 'scheduled') {

                      const note = page.notes.find(a => a.id === e);

                      return (
                        <Show when={note}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={note!}
                            hideContextMenu={true}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'notes');
                              fetchFeedTotals(accountStore.pubkey, {
                                since: notesStore.graphSpan.since(),
                                until: notesStore.graphSpan.until(),
                                kind: 'notes'
                              });
                            }}
                          >
                            <CheckBox
                              checked={notesStore.selected.includes(note!.id)}
                              onChange={(v) => toggleSelected(note!.id, v)}
                              label=""
                            />
                            <NotePreview
                              id={e}
                              note={note!}
                              hideTime={true}
                            />
                            <ScheduledInfo
                              event={note!}
                              kind='notes'
                              onEdit={() => {
                                openEditNote(note);
                              }}
                              onTimeChange={() => {
                                setNotesStore('changePublishDateNote', note)
                              }}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    const note = page.notes.find(a => a.id === e);

                    return (
                      <Show when={note}>
                        <FeedItemCard
                          onClick={() => {openInPrimal(note!)}}
                          event={note!}
                          onDelete={(id: string) => {
                            removeEventFromPageStore(id, 'notes');
                            fetchFeedTotals(accountStore.pubkey, {
                              since: notesStore.graphSpan.since(),
                              until: notesStore.graphSpan.until(),
                              kind: 'notes'
                            });
                          }}
                        >
                          <NotePreview
                            id={e}
                            note={note!}
                          />
                          <EventStats
                            event={note!}
                          />
                        </FeedItemCard>
                      </Show>
                    )
                  }}
                />
              )}
            </For>
            <Paginator
              loadNextPage={loadNextNotesPage}
              isSmall={true}
            />
          </Show>
        </div>

        </div>
      </div>

      <NotesApproveDialog
        open={notesStore.showApproveDialog}
        setOpen={(v) => setNotesStore('showApproveDialog', v)}
        drafts={notesStore.approvedEvents}
        onClose={() => {
          setNotesStore('approvedEvents', () => []);
        }}
      />

      <ReadsPublishingDateDialog
        open={notesStore.changePublishDateNote !== undefined}
        setOpen={(v) => !v && setNotesStore('changePublishDateNote', undefined)}
        initialValue={notesStore.changePublishDateNote?.created_at}
        onSetPublishDate={async (timestamp) => {
          const note = unwrap(notesStore.changePublishDateNote);
          if (!note) return;

          const today = () => Math.ceil((new Date()).getTime() / 1_000);

          const pubTime = timestamp || today();
          await scheduleNote(note.content, note.tags, pubTime, note.id);

          setNotesStore('changePublishDateNote', undefined);
        }}
      />
    </>
  );
}

export default Notes;
