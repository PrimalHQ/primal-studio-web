import { createAsync, query } from '@solidjs/router';
import { Component, createEffect, For, onMount } from 'solid-js';
import { APP_ID } from '../../App';
import Event from '../../components/Event/Event';
import { Kind } from '../../constants';
import { useAccountContext } from '../../context/AccountContext';
import { eventStore } from '../../stores/EventStore';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { FeedPaging, NostrEventContent } from '../../primal';
import { fetchMegaFeed } from '../../primal_api/feeds';
import { translate } from '../../translations/translate';
import { fetchHomeFeed } from './Home.data';

import styles from './Home.module.scss';
import Paginator from '../../components/Paginator/Paginator';
import { pageStore } from '../../stores/PageStore';
import Note from '../../components/Event/Note';
import { createStore } from 'solid-js/store';


const Home: Component = () => {
  const account = useAccountContext();

  // const notesPage = createAsync(() => fetchHomeFeed(account?.pubkey || ''));

  const notes = () => {
    // const ids = notesPage()?.elements || [];
    const ids = pageStore.home.notes;

    let events: { event: NostrEventContent, reposters: string[]}[] = [];

    for (let i=0; i<ids.length; i++) {
      const ev = eventStore[ids[i]];

      if (!ev) continue;

      if (ev.kind === Kind.Repost) {
        const reposter = ev.pubkey || '';
        const repostedEvent = JSON.parse(ev.content || '{ id: ""}') as NostrEventContent;

        const listedIndex = events.findIndex(({ event }) => repostedEvent.id === event.id);

        if (listedIndex > -1) {
          events[listedIndex].reposters.push(reposter);
          continue;
        }

        events.push({ event: repostedEvent, reposters: [reposter]});
        continue;
      }

      events.push({ event: ev, reposters: []});
    }

    return events;
  };

  const loadNextPage = () => {
    fetchHomeFeed(account?.pubkey || '', pageStore.home.range);
  };

  const shouldRenderEmpty = (id: string, i: number) => {
    return notes().length - i > 20;
  };

  const [hiddenNotes, setHiddenNotes] = createStore<Record<string, boolean>>({});

  let observer: IntersectionObserver | undefined;

  onMount(() => {
    observer = new IntersectionObserver(entries => {
      let i=0;

      for (i=0; i<entries.length; i++) {
        const entry = entries[i];

        const target = entry.target;
        const id = target.getAttribute('data-event-id') || '';

        if (entry.isIntersecting) {
          setHiddenNotes(() => ({ [id]: false }));
          continue;
        }

        setHiddenNotes(() => ({ [id]: true }));
      }
    });
  });

  return (
    <>
      <Wormhole to="header">Home header</Wormhole>
      <Wormhole to="sidebar">Home Sidebar</Wormhole>
      <h1>{translate('home', 'title')}</h1>

      <div class={styles.feed}>
        <For each={notes()}>
          {(note) => (
            <Note
              event={note.event}
              reposters={note.reposters}
              variant='feed'
              isRenderEmpty={hiddenNotes[note.event.id] || false}
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
