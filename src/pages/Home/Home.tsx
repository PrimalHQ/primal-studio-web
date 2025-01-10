import { Component, createSignal, For, onMount } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';
import { fetchHomeFeed } from './Home.data';

import styles from './Home.module.scss';
import Paginator from '../../components/Paginator/Paginator';
import { pageStore, updatePageStore } from '../../stores/PageStore';
import FeedPage from '../../components/Event/FeedPage';
import { accountStore } from '../../stores/AccountStore';
import { useBeforeLeave } from '@solidjs/router';


const Home: Component = () => {

  const pages = () => pageStore.home.feedPages;

  useBeforeLeave(() => {
    const sTop = window.scrollY;

    updatePageStore('home', 'scrollTop', () => sTop);
  });

  onMount(() => {
    setTimeout(() => {
      window.scrollTo({ top: pageStore.home.scrollTop });
    }, 10)
  });

  const loadNextPage = () => {
    if (pageStore.home.lastRange.since === 0) return;
    fetchHomeFeed(accountStore.pubkey || '', pageStore.home.lastRange);
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
      <Wormhole to="header">Home header</Wormhole>
      <Wormhole to="sidebar">Home Sidebar</Wormhole>
      <h1>{translate('home', 'title')}</h1>

      <div class={styles.feed} style={`min-height: 300dvh;`}>
        <For each={pages()}>
          {(page, pageIndex) => (
            <FeedPage
              page={page}
              isRenderEmpty={shouldRenderEmpty(pageIndex())}
              pageIndex={pageIndex()}
              observer={observer}
            />
          )}
        </For>
        <Paginator
          loadNextPage={loadNextPage}
        />
      </div>

      <Wormhole to="footer">Home Footer</Wormhole>
    </>
  );
}

export default Home;
