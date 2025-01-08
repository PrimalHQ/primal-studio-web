import { createAsync, query } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, onMount } from 'solid-js';
import { APP_ID } from '../../App';
import Event from '../../components/Event/Event';
import { Kind } from '../../constants';
import { useAccountContext } from '../../context/AccountContext';
import { eventStore } from '../../stores/EventStore';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { FeedPaging, FeedResult, NostrEventContent } from '../../primal';
import { fetchMegaFeed } from '../../primal_api/feeds';
import { translate } from '../../translations/translate';
import { fetchHomeFeed } from './Home.data';

import styles from './Home.module.scss';
import Paginator from '../../components/Paginator/Paginator';
import { pageStore } from '../../stores/PageStore';
import FeedPage from '../../components/Event/FeedPage';


const Home: Component = () => {
  const account = useAccountContext();

  const pages = () => pageStore.home.feedPages;

  const loadNextPage = () => {
    fetchHomeFeed(account?.pubkey || '', pageStore.home.lastRange);
  };

  const shouldRenderEmpty = (index: number) => {
    return !visiblePages().includes(index);
  };

  const [visiblePages, setVisiblePages] = createSignal<number[]>([]);

  let observer: IntersectionObserver | undefined;

  observer = new IntersectionObserver(entries => {
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

        setVisiblePages(() => [...config]);
      }
    }
  });

  return (
    <>
      <Wormhole to="header">Home header</Wormhole>
      <Wormhole to="sidebar">Home Sidebar</Wormhole>
      <h1>{translate('home', 'title')}</h1>

      <div class={styles.feed}>
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
