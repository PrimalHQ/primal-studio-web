import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Home.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import StudioChart from 'src/components/Chart/Chart';
import { fetchHomeArticles, fetchHomeGraph, fetchHomeNotes, fetchHomeTotals, homeStore, setHomeStore } from './Home.data';
import { StudioGraph } from 'src/primal_api/studio';
import { accountStore } from 'src/stores/AccountStore';


import DatePicker from "@rnwonder/solid-date-picker";
import utils from "@rnwonder/solid-date-picker/utilities";
import dayjs from 'dayjs';
import objectSupport from 'dayjs/plugin/objectSupport';
import FeedPage from 'src/components/Event/FeedPage';
import { clearPageStore, pageStore } from 'src/stores/PageStore';

import Event from 'components/Event/Event';
import Note from 'src/components/Event/Note';
import NotePreview from 'src/components/Event/NotePreview';
import Paginator from 'src/components/Paginator/Paginator';
import { calculateOffset } from 'src/stores/EventStore';
import ArticlePreview from 'src/components/Event/ArticlePreview';

const Home: Component = () => {

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

    fetchHomeGraph(accountStore.pubkey, { since, until, resolution });
    fetchHomeTotals(accountStore.pubkey, { since, until });
    fetchHomeNotes(accountStore.pubkey, { since, until, limit: 30, offset: 0 });
    fetchHomeArticles(accountStore.pubkey, { since, until, limit: 30, offset: 0 });
  });

  const loadNextNotesPage = () => {
    if (pageStore.homeNotes.lastRange.since === 0) return;

    const { since, until } = homeStore.graphSpan;

    const feedRange = pageStore.homeNotes.lastRange;

    notesOffset += feedRange.elements.length;

    fetchHomeNotes(
      accountStore.pubkey,
      {
        since,
        until,
        offset: notesOffset,
        limit: 30,
      },
    );
  };

  const loadNextArticlesPage = () => {
    if (pageStore.homeArticles.lastRange.since === 0) return;

    const { since, until } = homeStore.graphSpan;

    const feedRange = pageStore.homeArticles.lastRange;

    articlesOffset += feedRange.elements.length;

    fetchHomeArticles(
      accountStore.pubkey,
      {
        since,
        until,
        offset: articlesOffset,
        limit: 30,
      },
    );
  };


  const satsDiff = () =>
    homeStore.totals.satszapped_received - homeStore.totals.satszapped_sent;


  const notePages = () => pageStore.homeNotes.feedPages;
  const articlePages = () => {
    return pageStore.homeArticles.feedPages;
  }

  const shouldRenderEmpty = (index: number) => {
    return !visiblePages().includes(index);
  };

  const [visiblePages, setVisiblePages] = createSignal<number[]>([]);

  let observer: IntersectionObserver | undefined;
  // let timeout = 0;


  observer = new IntersectionObserver(entries => {
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

          setVisiblePages(() => [...config]);
        // }, 300);
      }
    }
  });

  return (
    <>
      <Wormhole to="header">
        <HeaderTitle title={translate('home', 'header')}>
          <div class={styles.graphSpans}>
            <button
              class={`${homeStore.graphSpan.name === '7d' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: '7d',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: Math.floor((new Date()).getTime() / 1_000) - 7 * 24 * 60 * 60,
                resolution: 'day',
              }))}
            >
              7D
            </button>
            <button
              class={`${homeStore.graphSpan.name === '2w' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: '2w',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: Math.floor((new Date()).getTime() / 1_000) - 14 * 24 * 60 * 60,
                resolution: 'day',
              }))}
            >
              2W
            </button>
            <button
              class={`${homeStore.graphSpan.name === '1m' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: '1m',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: Math.floor((new Date()).getTime() / 1_000) - 30 * 24 * 60 * 60,
                resolution: 'day',
              }))}
            >
              1M
            </button>
            <button
              class={`${homeStore.graphSpan.name === '3m' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: '3m',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: Math.floor((new Date()).getTime() / 1_000) - 3 * 30 * 24 * 60 * 60,
                resolution: 'day',
              }))}
            >
              3M
            </button>
            <button
              class={`${homeStore.graphSpan.name === 'ytd' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: 'ytd',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1_000),
                resolution: 'month',
              }))}
            >
              YTD
            </button>
            <button
              class={`${homeStore.graphSpan.name === '1y' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: '1y',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: Math.floor((new Date()).getTime() / 1_000) - 365 * 24 * 60 * 60,
                resolution: 'month',
              }))}
            >
              1Y
            </button>
            <button
              class={`${homeStore.graphSpan.name === 'all' ? styles.active : ''}`}
              onClick={() => setHomeStore('graphSpan', () => ({
                name: 'all',
                until: Math.floor((new Date()).getTime() / 1_000),
                since: 0,
                resolution: 'month',
              }))}
            >
              All
            </button>

            <div class={styles.datePicker}>
              <DatePicker
                type="range"
                onChange={(data) => {
                  if (data.type !== 'range') return;

                  if (data.startDate && data.endDate) {
                    // @ts-ignore
                    const sd = dayjs({ year: data.startDate.year || 0, month: data.startDate.month || 0, day: data.startDate.day });
                    // @ts-ignore
                    const ed = dayjs({ year: data.endDate.year || 0, month: data.endDate.month || 0, day: data.endDate.day });

                    const diffDays = ed.diff(sd, 'days');

                    let resolution: 'day' | 'month' | 'hour' = 'day';

                    if (diffDays < 4) {
                      resolution = 'hour';
                    }

                    if (diffDays > 90) {
                      resolution = 'month';
                    }

                    setHomeStore('graphSpan', () => ({
                      name: 'custom',
                      since: sd.unix(),
                      until: ed.unix(),
                      resolution,
                    }))
                  }
                }}
                maxDate={utils().getToday()}
                renderInput={({ showDate }) => (
                  <button
                  class={`${styles.compact} ${homeStore.graphSpan.name === 'custom' ? styles.active : ''}`}
                    onClick={showDate}
                  >
                    <div class={styles.calendarIcon}></div>
                  </button>
                )}
                shouldCloseOnSelect
              />
            </div>
          </div>
        </HeaderTitle>
      </Wormhole>

      <div class={styles.statHolder}>
        <div class={styles.graphHolder}>
          <StudioChart
            data={homeStore.graph}
            key={homeStore.graphKey}
            span={homeStore.graphSpan}
          />
        </div>

        <div class={styles.numbersHolder}>
          <div class={styles.variousStats}>
            <button
              class={`${styles.statPod} ${homeStore.graphKey == 'replies' ? styles.active : ''}`}
              onClick={() => onToggleKey('replies')}
            >
              <div class={styles.label}>Replies</div>
              <div class={styles.value}>{homeStore.totals.replies}</div>
            </button>

            <button
              class={`${styles.statPod} ${homeStore.graphKey == 'reposts' ? styles.active : ''}`}
              onClick={() => onToggleKey('reposts')}
            >
              <div class={styles.label}>Reposts</div>
              <div class={styles.value}>{homeStore.totals.reposts}</div>
            </button>

            <button
              class={`${styles.statPod} ${homeStore.graphKey == 'reactions' ? styles.active : ''}`}
              onClick={() => onToggleKey('reactions')}
            >
              <div class={styles.label}>Reactions</div>
              <div class={styles.value}>{homeStore.totals.reactions}</div>
            </button>

            <button
              class={`${styles.statPod} ${homeStore.graphKey == 'bookmarks' ? styles.active : ''}`}
              onClick={() => onToggleKey('bookmarks')}
            >
              <div class={styles.label}>Bookmarks</div>
              <div class={styles.value}>{homeStore.totals.bookmarks}</div>
            </button>

            <button
              class={`${styles.statPod} ${homeStore.graphKey == 'quotes' ? styles.active : ''}`}
              onClick={() => onToggleKey('quotes')}
            >
              <div class={styles.label}>Quotes</div>
              <div class={styles.value}>{homeStore.totals.quotes}</div>
            </button>

            <button
              class={`${styles.statPod} ${homeStore.graphKey == 'mentions' ? styles.active : ''}`}
              onClick={() => onToggleKey('mentions')}
            >
              <div class={styles.label}>Mentions</div>
              <div class={styles.value}>{homeStore.totals.mentions}</div>
            </button>
          </div>

          <div class={styles.zapStats}>
            <div
              class={styles.zapStat}
            >
              <div class={styles.label}>Zaps Received</div>
              <div class={styles.zapNumbers}>
                <div class={styles.value}>{homeStore.totals.zaps_received}</div>
                <div class={styles.valueMore}>
                  {homeStore.totals.satszapped_received}<span>sats</span>
                </div>
              </div>
            </div>

            <div
              class={styles.zapStat}
            >
              <div class={styles.label}>Zaps Sent</div>
              <div class={styles.zapNumbers}>
                <div class={styles.value}>{homeStore.totals.zaps_sent}</div>
                <div class={styles.valueMore}>
                  {homeStore.totals.satszapped_sent}<span>sats</span>
                </div>
              </div>
            </div>

            <div class={styles.zapStat}>
              <div class={styles.label}>Zaps Delta</div>
              <div class={styles.zapNumbers}>
                <div class={styles.value}>{homeStore.totals.zaps_sent - homeStore.totals.zaps_received}</div>
                <div class={`${styles.valueMore} ${satsDiff() > 0 ? styles.positive : styles.negative}`}>
                  {satsDiff() > 0 ? '+' : '-'} {Math.abs(satsDiff())}
                  <span>sats</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class={styles.feedHolder}>
        <div class={styles.itemsHolder}>
          <div class={styles.feedHeader}>
            <div class={styles.label}>
              Top notes for selected range
            </div>
          </div>
          <div class={styles.feedContent}>
            <For each={notePages()}>
              {(page, pageIndex) => (
                <FeedPage
                  page={page}
                  isRenderEmpty={shouldRenderEmpty(pageIndex())}
                  pageIndex={pageIndex()}
                  observer={observer}
                  key="homeNotes"
                  twoColumns={articlePages().length === 0}
                  eventComponent={(e) => (
                    <NotePreview
                      feedEvent={e}
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
              Top articles for selected range
            </div>
          </div>
          <div class={styles.feedContent}>
            <For each={articlePages()}>
              {(page, pageIndex) => (
                <FeedPage
                  page={page}
                  isRenderEmpty={shouldRenderEmpty(pageIndex())}
                  pageIndex={pageIndex()}
                  observer={observer}
                  key="homeArticles"
                  twoColumns={articlePages().length === 0}
                  eventComponent={(e) => (
                    <ArticlePreview
                      feedEvent={e}
                      variant='feed'
                    />
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
