import {
  Component,
  createEffect,
  createReaction,
  createSignal,
  For,
  JSXElement,
  on,
  onCleanup,
  onMount,
  Show,
  untrack,
} from 'solid-js';

import {
  forgetPage,
  PageStore,
  pageStore,
  updatePageStore,
} from '../../stores/PageStore';

import { Kind } from '../../constants';
import { FeedResult, NostrEventContent } from '../../primal';
import { getEventsFromStore } from '../../stores/EventStore';

import styles from './Event.module.scss';

export type FeedEvent = {
  event: NostrEventContent,
  reposters: string[],
};

const FeedPage: Component<{
  page: FeedResult,
  pageIndex: number,
  isRenderEmpty?: boolean,
  observer?: IntersectionObserver,
  key: keyof PageStore,
  twoColumns?: boolean,
  eventComponent: (event: { event: NostrEventContent, reposters: string[]}) => JSXElement,
}> = (props) => {
  const index = untrack(() => props.pageIndex)
  let pageHolder: HTMLDivElement | undefined;

  onMount(() => {
    if (!props.observer || !pageHolder) return;

    setTimeout(() => {
      props.observer?.observe(pageHolder);

      getEvents();
    }, 1);
  });

  onCleanup(() => {
    if (!props.observer || !pageHolder) return;

    props.observer?.unobserve(pageHolder);
  });

  createEffect(() => {
    // calculate page height
    // used for "forgetting" a page while perserving it's size in the DOM
    if (events().length === 0) return;

    const rect = pageHolder?.getBoundingClientRect() || { height: 0};
    updatePageStore(props.key, 'pageInfo', `${index}`, () => ({ height: rect.height }));
  });

  const track = createReaction(() => {
    if (props.isRenderEmpty) return;

    getEvents();
  });

  const forget = async () => {
    setEvents(() => []);
    await forgetPage(props.key, index);
    track(() => props.isRenderEmpty);
  };

  createEffect(on(() => props.isRenderEmpty, (isEmpty) => {
    if (isEmpty === true) {
      forget();
      return;
    }

    getEvents();
  }));

  const [events, setEvents] = createSignal<FeedEvent[]>([]);

  const getEvents = async () => {
    const page = props.page;
    const ids = page.mainEvents;

    const storedEvents = await getEventsFromStore(ids, `${index}`);

    let events: FeedEvent[] = [];

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

        events.push({ event: repostedEvent, reposters: [reposter] });
        continue;
      }

      events.push({ event: ev, reposters: [] });
    }

    setEvents(() => events);
  };

  return (
    <div
      ref={pageHolder}
      data-page-index={index}
      class={`${styles.feedPage} ${props.twoColumns ? styles.twoColumns : ''}`}
      style={props.isRenderEmpty || events().length === 0 ? `height: ${pageStore[props.key]?.pageInfo[index]?.height || 0}px;` : ''}
    >
      <Show
        when={!props.isRenderEmpty}
      >
        <For each={events()}>
          {(e) => props.eventComponent(e)}
        </For>
      </Show>
    </div>
  );
}

export default FeedPage;
