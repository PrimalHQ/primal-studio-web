import { Component, createEffect, For, JSX, onCleanup, onMount, Show } from 'solid-js';

import styles from './Event.module.scss';
import { pageStore, updatePageStore } from '../../stores/PageStore';
import { generateSecretKey } from 'nostr-tools';
import { Kind } from '../../constants';
import { FeedResult, NostrEventContent } from '../../primal';
import { eventStore } from '../../stores/EventStore';
import Event from './Event';


const FeedPage: Component<{
  page: FeedResult,
  pageIndex: number,
  isRenderEmpty?: boolean,
  observer?: IntersectionObserver,
}> = (props) => {
  let pageHolder: HTMLDivElement | undefined;

  createEffect(() => {
    if (!pageHolder || props.isRenderEmpty) return;

    const rect = pageHolder.getBoundingClientRect();
    updatePageStore('home', 'pageInfo', `${props.pageIndex}`, () => ({ height: rect.height }));
  });

  onMount(() => {
    if (!props.observer || !pageHolder) return;

    props.observer?.observe(pageHolder);
  });

  onCleanup(() => {
    if (!props.observer || !pageHolder) return;

    props.observer?.unobserve(pageHolder);
  });


  const notes = () => {
    const page = props.page;
    const ids = page.mainEvents;

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

  return (
    <div
      ref={pageHolder}
      data-page-index={props.pageIndex}
      class={styles.feedPage}
    >
      <Show
        when={!props.isRenderEmpty}
        fallback={<div style={`height: ${pageStore.home.pageInfo[props.pageIndex]?.height || 0}px;`}></div>}
      >
        <For each={notes()}>
          {(note) => (
            <Event
              event={note.event}
              reposters={note.reposters}
              variant='feed'
            />
          )}
        </For>
      </Show>
    </div>
  );
}

export default FeedPage;
