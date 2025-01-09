import {
  Component,
  createEffect,
  createReaction,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  untrack,
} from 'solid-js';

import {
  forgetPage,
  pageStore,
  updatePageStore,
} from '../../stores/PageStore';

import { Kind } from '../../constants';
import { FeedResult, NostrEventContent } from '../../primal';
import { getEventsFromStore } from '../../stores/EventStore';
import Event from './Event';

import styles from './Event.module.scss';

const FeedPage: Component<{
  page: FeedResult,
  pageIndex: number,
  isRenderEmpty?: boolean,
  observer?: IntersectionObserver,
}> = (props) => {
  const index = untrack(() => props.pageIndex)
  let pageHolder: HTMLDivElement | undefined;

  createEffect(() => {
    if (notes().length === 0) return;

    const rect = pageHolder?.getBoundingClientRect() || { height: 0};
    updatePageStore('home', 'pageInfo', `${index}`, () => ({ height: rect.height }));
  });

  onMount(() => {
    if (!props.observer || !pageHolder) return;

    props.observer?.observe(pageHolder);

    getNotes();
  });

  onCleanup(() => {
    if (!props.observer || !pageHolder) return;

    props.observer?.unobserve(pageHolder);
  });

  let firstRun = true;

  const track = createReaction(() => {
    !props.isRenderEmpty && getNotes();
  });

  createEffect(on(() => props.isRenderEmpty, (isEmpty, prev) => {
    if (firstRun) {
      firstRun = false;
      return;
    }

    if (isEmpty === true) {
      track(() => props.isRenderEmpty);
      forgetPage('home', index);
      setNotes(() => []);
      return;
    }
  }));

  const [notes, setNotes] = createSignal<{ event: NostrEventContent, reposters: string[]}[]>([]);


  const getNotes = async () => {
    const page = props.page;
    const ids = page.mainEvents;

    const storedEvents = await getEventsFromStore(ids, index);

    let events: { event: NostrEventContent, reposters: string[]}[] = [];

    for (let i=0; i<storedEvents.length; i++) {
      const ev = storedEvents[i];

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

    setNotes(() => events);
  };

  return (
    <div
      ref={pageHolder}
      data-page-index={index}
      class={styles.feedPage}
      style={props.isRenderEmpty || notes().length === 0 ? `height: ${pageStore.home.pageInfo[index]?.height || 0}px;` : ''}
    >
      <div>INDEX: {index}</div>
      <Show
        when={!props.isRenderEmpty}
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
