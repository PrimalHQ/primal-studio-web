import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Home.module.scss';
import StudioChart from 'src/components/Chart/Chart';
import { fetchHomeArticles, fetchHomeGraph, fetchHomeNotes, fetchHomeTotals, homeStore, setHomeStore } from './Home.data';
import { StudioGraph } from 'src/primal_api/studio';
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

  createEffect(() => {
    const { since, until, resolution } = homeStore.graphSpan;

    clearPageStore('homeNotes');
    clearPageStore('homeArticles');

    notesOffset = 0;
    articlesOffset = 0;

    const pubkey = params.pubkey || accountStore.pubkey;

    fetchHomeGraph(pubkey, { since, until, resolution });
    fetchHomeTotals(pubkey, { since, until });
    fetchHomeNotes(pubkey, { since, until, limit: 30, offset: 0 });
    fetchHomeArticles(pubkey, { since, until, limit: 30, offset: 0 });
  });

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
