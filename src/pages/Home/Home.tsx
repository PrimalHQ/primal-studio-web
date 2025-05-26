import { Component, createEffect, createSignal, For, on, onMount, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Home.module.scss';
import StudioChart from 'src/components/Chart/Chart';
import { FeedCriteria, fetchHomeArticles, fetchHomeGraph, fetchHomeNotes, fetchHomeTotals, GraphSpan, homeStore, setHomeStore } from './Home.data';
import { HomePayload, StudioGraph } from 'src/primal_api/studio';
import { accountStore } from 'src/stores/AccountStore';

import dayjs from 'dayjs';
import objectSupport from 'dayjs/plugin/objectSupport';
import FeedPage from 'src/components/Event/FeedPage';
import { clearPageStore, pageStore } from 'src/stores/PageStore';

import NotePreview from 'src/components/Event/NotePreview';
import Paginator from 'src/components/Paginator/Paginator';
import ArticlePreview from 'src/components/Event/ArticlePreview';
import { useParams } from '@solidjs/router';
import HomeHeader from './HomeHeader';
import HomeStats from './HomeStats';
import SelectBox, { SelectOption } from 'src/components/SelectBox/SelectBox';

const Home: Component = () => {
  const params = useParams();

  onMount(() => {
    dayjs.extend(objectSupport);
  });

  const onToggleKey = (key: keyof StudioGraph) => {
    if (homeStore.graphKey === key) {
      setHomeStore('graphKey', 'score');
      return;
    }

    setHomeStore('graphKey', key);
  }

  let notesOffset = 0;
  let articlesOffset = 0;


  const resetNoteLists = (pubkey: string, span: Partial<HomePayload>) => {

    const { since, until } = span;

    clearPageStore('homeNotes');

    notesOffset = 0;

    fetchHomeNotes(
      pubkey,
      { since, until, limit: 30, offset: 0, criteria: homeStore.noteSort },
    );
  }

  const resetArticleLists = (pubkey: string, span: Partial<HomePayload>) => {

    const { since, until } = span;

    clearPageStore('homeArticles');

    articlesOffset = 0;

    fetchHomeArticles(
      pubkey,
      { since, until, limit: 30, offset: 0, criteria: homeStore.noteSort },
    );
  }

  createEffect(on(
    () => [homeStore.graphSpan.since, homeStore.graphSpan.until, homeStore.graphSpan.resolution],
    (changes) => {
      // When graph span changes

      const since = changes[0] as number;
      const until = changes[1] as number;
      const resolution = changes[2] as 'day' | 'month' | 'hour';

      const pubkey = params.pubkey || accountStore.pubkey;

      fetchHomeGraph(pubkey, { since, until, resolution });
      fetchHomeTotals(pubkey, { since, until });

      resetNoteLists(pubkey, { since, until });
      resetArticleLists(pubkey, { since, until });
    }));

  createEffect(on(() => homeStore.noteSort, (criteria) => {
    const { since, until } = homeStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetNoteLists(pubkey, { since, until, criteria });
  }));

  createEffect(on(() => homeStore.articleSort, (criteria) => {
    const { since, until } = homeStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetArticleLists(pubkey, { since, until, criteria });
  }));

  const loadNextNotesPage = () => {
    if (pageStore.homeNotes.lastRange.since === 0) return;

    const { since, until } = homeStore.graphSpan;

    const feedRange = pageStore.homeNotes.lastRange;

    notesOffset += feedRange.elements.length;

    fetchHomeNotes(
      params.pubkey || accountStore.pubkey,
      {
        since,
        until,
        offset: notesOffset,
        limit: 30,
        pubkey: params.pubkey,
      },
    );
  };

  const loadNextArticlesPage = () => {
    if (pageStore.homeArticles.lastRange.since === 0) return;

    const { since, until } = homeStore.graphSpan;

    const feedRange = pageStore.homeArticles.lastRange;

    articlesOffset += feedRange.elements.length;

    fetchHomeArticles(
      params.pubkey || accountStore.pubkey,
      {
        since,
        until,
        offset: articlesOffset,
        limit: 30,
      },
    );
  };

  const notePages = () => pageStore.homeNotes.feedPages;
  const articlePages = () => pageStore.homeArticles.feedPages;

  const [visibleNotesPages, setVisibleNotesPages] = createSignal<number[]>([]);

  const shouldRenderEmptyNotes = (index: number) => {
    return !visibleNotesPages().includes(index);
  };

  let notesPageObserver: IntersectionObserver | undefined;
  // let timeout = 0;

  notesPageObserver = new IntersectionObserver(entries => {
    let i=0;

    for (i=0; i<entries.length; i++) {
      const entry = entries[i];

      const target = entry.target;
      const id = parseInt(target.getAttribute('data-page-index') || '0');

      if (entry.isIntersecting) {
        // clearTimeout(timeout);
        // timeout = setTimeout(() => {
          const min = id < 3 ? 0 : id - 3;
          const max = id + 3;

          let config: number[] = [];

          for (let i=min; i<= max; i++) {
            config.push(i);
          }

          setVisibleNotesPages(() => [...config]);
        // }, 300);
      }
    }
  });


  const [visibleArticlesPages, setVisibleArticlesPages] = createSignal<number[]>([]);

  const shouldRenderEmptyArticles = (index: number) => {
    return !visibleArticlesPages().includes(index);
  };

  let articlesPageObserver: IntersectionObserver | undefined;
  // let timeout = 0;

  articlesPageObserver = new IntersectionObserver(entries => {
    let i=0;

    for (i=0; i<entries.length; i++) {
      const entry = entries[i];

      const target = entry.target;
      const id = parseInt(target.getAttribute('data-page-index') || '0');

      if (entry.isIntersecting) {
        // clearTimeout(timeout);
        // timeout = setTimeout(() => {
          const min = id < 3 ? 0 : id - 3;
          const max = id + 3;

          let config: number[] = [];

          for (let i=min; i<= max; i++) {
            config.push(i);
          }

          setVisibleArticlesPages(() => [...config]);
        // }, 300);
      }
    }
  });

  const sortOptions: SelectOption[] = [
    {
      value: 'score',
      label: 'Content Score',
    },
    {
      value: 'satszapped',
      label: 'Sats Zapped',
    },
    {
      value: 'sentiment',
      label: 'Sentiment',
    },
    {
      value: 'latest',
      label: 'Latest',
    },
    {
      value: 'oldest',
      label: 'Oldest',
    },
  ]


  return (
    <>
      <Wormhole to="header">
        <HomeHeader />
      </Wormhole>

      <div class={styles.statHolder}>
        <div class={styles.graphHolder}>
          <StudioChart
            data={homeStore.graph}
            key={homeStore.graphKey}
            span={homeStore.graphSpan}
          />
        </div>

        <HomeStats onToggleKey={onToggleKey} />

      </div>

      <div class={styles.feedHolder}>
        <div class={styles.itemsHolder}>
          <div class={styles.feedHeader}>
            <div class={styles.label}>
              {translate('home', 'topNotes')}
            </div>
            <SelectBox
              prefix="Sort by:"
              value={sortOptions.find(o => o.value === homeStore.noteSort) || sortOptions[0]}
              options={sortOptions}
              onChange={(option) => setHomeStore('noteSort', (option?.value || 'score') as FeedCriteria)}
            />
          </div>
          <div class={styles.feedContent}>
            <For each={notePages()}>
              {(page, pageIndex) => (
                <FeedPage
                  page={page}
                  isRenderEmpty={shouldRenderEmptyNotes(pageIndex())}
                  pageIndex={pageIndex()}
                  observer={notesPageObserver}
                  key="homeNotes"
                  twoColumns={articlePages().length === 0}
                  eventComponent={(e) => (
                    <NotePreview
                      note={page.notes.find(n => n.id === e)!}
                      variant='feed'
                    />
                  )}
                />
              )}
            </For>
            <Paginator
              loadNextPage={loadNextNotesPage}
              isSmall={true}
            />
          </div>
        </div>
        <Show when={articlePages().length > 0}>
          <div class={styles.itemsHolder}>
          <div class={styles.feedHeader}>
            <div class={styles.label}>
              {translate('home', 'topArticles')}
            </div>
            <SelectBox
              prefix="Sort by:"
              value={sortOptions.find(o => o.value === homeStore.articleSort) || sortOptions[0]}
              options={sortOptions}
              onChange={(option) => setHomeStore('articleSort', (option?.value || 'score') as FeedCriteria)}
            />
          </div>
          <div class={styles.feedContent}>
            <For each={articlePages()}>
              {(page, pageIndex) => (
                <FeedPage
                  page={page}
                  isRenderEmpty={shouldRenderEmptyArticles(pageIndex())}
                  pageIndex={pageIndex()}
                  observer={articlesPageObserver}
                  key="homeArticles"
                  twoColumns={articlePages().length === 0}
                  eventComponent={(e) => (
                    <Show when={page.reads.find(a => a.id === e)}>
                      <ArticlePreview
                        article={page.reads.find(a => a.id === e)!}
                        variant='feed'
                      />
                    </Show>
                  )}
                />
              )}
            </For>
            <Paginator
              loadNextPage={loadNextArticlesPage}
              isSmall={true}
            />
          </div>

          </div>

        </Show>
      </div>
    </>
  );
}

export default Home;
