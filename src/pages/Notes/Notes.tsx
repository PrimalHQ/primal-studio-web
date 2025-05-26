import { Component, createSignal, For, onCleanup, onMount } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';
import { fetchNotesFeed } from './Notes.data';

import styles from './Notes.module.scss';
import Paginator from '../../components/Paginator/Paginator';
import { pageStore, updatePageStore } from '../../stores/PageStore';
import FeedPage from '../../components/Event/FeedPage';
import { accountStore } from '../../stores/AccountStore';
import { useBeforeLeave } from '@solidjs/router';
import { calculateOffset } from '../../stores/EventStore';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';


const Notes: Component = () => {

  const pages = () => pageStore.notes.feedPages;

  useBeforeLeave(() => {
    const sTop = window.scrollY;

    updatePageStore('notes', 'scrollTop', () => sTop);
  });

  onMount(() => {
    setTimeout(() => {
      window.scrollTo({ top: pageStore.notes.scrollTop });
    }, 10)
  });

  onCleanup(() => {
    observer?.disconnect();
  });

  const loadNextPage = () => {
    // if (pageStore.notes.lastRange.since === 0) return;

    // const pageNotes = pageStore.notes.feedPages.at(-1)?.mainEvents || [];
    // const feedRange = pageStore.notes.lastRange;
    // const offset = calculateOffset(pageNotes, feedRange);

    // fetchNotesFeed(accountStore.pubkey || '', { feedRange, offset });
  };

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
        <HeaderTitle title={translate('notes', 'header')} />
      </Wormhole>
      <h1>{translate('notes', 'title')}</h1>

      {/* <div class={styles.feed} style={`min-height: 300dvh;`}>
        <For each={pages()}>
          {(page, pageIndex) => (
            <FeedPage
              page={page}
              isRenderEmpty={shouldRenderEmpty(pageIndex())}
              pageIndex={pageIndex()}
              observer={observer}
              key="notes"
            />
          )}
        </For>
        <Paginator
          loadNextPage={loadNextPage}
        />
      </div> */}
    </>
  );
}

export default Notes;
