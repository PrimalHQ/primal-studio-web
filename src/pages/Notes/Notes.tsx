import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Notes.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import PageHeader from 'src/components/PageHeader/PageHeader';
import { FeedCriteria, GraphSpan } from '../Home/Home.data';
import SelectBox from 'src/components/SelectBox/SelectBox';
import { headerSortOptions } from 'src/constants';
import { clearPageStore, pageStore, removeEventFromPageStore } from 'src/stores/PageStore';
import FeedPage from 'src/components/Event/FeedPage';
import Paginator from 'src/components/Paginator/Paginator';
import ArticleHomePreview from 'src/components/Event/ArticleHomePreview';
import { accountStore } from 'src/stores/AccountStore';
import { useParams } from '@solidjs/router';
import { FeedEventState, HomePayload } from 'src/primal_api/studio';
import StudioTabs from 'src/components/Tabs/Tabs';
import FeedItemCard from 'src/components/Event/FeedItemCard';
import ArticlePreview from 'src/components/Event/ArticlePreview';
import { PrimalArticle, PrimalNote } from 'src/primal';
import { nip19 } from 'src/utils/nTools';
import { appStore } from 'src/stores/AppStore';
import EventStats from 'src/components/Event/EventStats';
import { fetchNotes, notesStore, setNotesStore } from './Notes.data';
import NotePreview from 'src/components/Event/NotePreview';
import CheckBox from 'src/components/CheckBox/CheckBox';

const Notes: Component = () => {
  const params = useParams();

  const notePages = () => pageStore.notes.feedPages;
  const [visibleNotesPages, setVisibleNotesPages] = createSignal<number[]>([]);

  const shouldRenderEmptyNotes = (index: number) => {
    return !visibleNotesPages().includes(index);
  };

  let notesPageObserver: IntersectionObserver | undefined;

  let notesOffset = 0;

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

    const feedRange = pageStore.notes.lastRange;

    notesOffset += feedRange.elements.length;

    fetchNotes(
      params.pubkey || accountStore.pubkey,
      {
        since,
        until,
        offset: notesOffset,
        limit: 30,
        criteria: notesStore.criteria,
        state: notesStore.tab,
        showReplies: notesStore.showReplies,
      },
    );
  };

  const resetNotesLists = (pubkey: string, span: Partial<HomePayload & { showReplies?: boolean }>) => {

    const { since, until, criteria, state, showReplies } = span;

    clearPageStore('notes');

    notesOffset = 0;

    fetchNotes(
      pubkey,
      {
        since,
        until,
        limit: 30,
        offset: 0,
        criteria: criteria || notesStore.criteria,
        state: state || notesStore.tab,
        showReplies: showReplies || notesStore.showReplies,
      },
    );
  }

  createEffect(on(
    () => [notesStore.graphSpan.since, notesStore.graphSpan.until],
    (changes, prev) => {
      if (!prev) return;
      // When graph span changes

      const since = changes[0] as number;
      const until = changes[1] as number;

      if (since === prev[0] && until === prev[1]) return;

      const pubkey = params.pubkey || accountStore.pubkey;

      resetNotesLists(pubkey, { since, until });
    })
  );

  createEffect(on(() => notesStore.criteria, (criteria, prev) => {
    if (!prev || criteria === prev) return;
    const { since, until } = notesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNotesLists(pubkey, { since, until, criteria });
  }));

  createEffect(on(() => notesStore.tab, (state, prev) => {
    if (!prev || state === prev) return;

    const { since, until } = notesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNotesLists(pubkey, { since, until, state });
  }));


  createEffect(on(() => notesStore.showReplies, (showReplies, prev) => {
    if (prev === undefined || showReplies === prev) return;
    const { since, until } = notesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNotesLists(pubkey, { since, until, showReplies });
  }));


  const openInPrimal = (note: PrimalNote) => {
    let link = `e/${note?.nId}`;

    return window.open(`https://primal.net/${link}`, '_blank')?.focus();
  };

  return (
    <>
      <Wormhole to="header">
        <PageHeader
          title={translate('notes', 'header')}
          selection={notesStore.graphSpan.name}
          onSpanSelect={(span: GraphSpan) => {
            setNotesStore('graphSpan', () => ({ ...span }))
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
            onChange={(tab: string) => setNotesStore('tab', tab as FeedEventState)}
            tabTriggerComponent={(tab: string) => (
              <div class={tab === notesStore.tab ? styles.activeTab : styles.inactiveTab}>
                {translate('articles', 'tabs', tab)}
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
              value={headerSortOptions.find(o => o.value === notesStore.criteria) || headerSortOptions[0]}
              options={headerSortOptions}
              onChange={(option) => setNotesStore('criteria', (option?.value || 'score') as FeedCriteria)}
            />
          </div>
        </div>
        <div class={styles.feedContent}>
          <For each={notePages()}>
            {(page, pageIndex) => (
              <FeedPage
                page={page}
                isRenderEmpty={shouldRenderEmptyNotes(pageIndex())}
                pageIndex={pageIndex()}
                observer={notesPageObserver}
                key="homeArticles"
                twoColumns={notePages().length === 0}
                eventComponent={(e) => {
                  const note = page.notes.find(a => a.id === e);

                  return (
                    <Show when={note}>
                      <FeedItemCard
                        onClick={() => {openInPrimal(note!)}}
                        event={note!}
                        onDelete={(id: string) => {
                          removeEventFromPageStore(id)
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
        </div>

        </div>
      </div>
    </>
  );
}

export default Notes;
