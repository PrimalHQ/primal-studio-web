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
import { EventFeedResult, FeedResult, NostrEventContent, PrimalArticle, PrimalNote } from '../../primal';
import { getEventsFromStore } from '../../stores/EventStore';

import styles from './Event.module.scss';

export type FeedEvent = {
  event: NostrEventContent,
  reposters: string[],
};

const FeedPage: Component<{
  page: EventFeedResult,
  pageIndex: number,
  isRenderEmpty?: boolean,
  observer?: IntersectionObserver,
  key: keyof PageStore,
  twoColumns?: boolean,
  eventComponent: (event: string) => JSXElement,
}> = (props) => {
  const index = untrack(() => props.pageIndex)
  let pageHolder: HTMLDivElement | undefined;

  onMount(() => {
    if (!props.observer || !pageHolder) return;

    setTimeout(() => {
      props.observer?.observe(pageHolder);

      getEvents(true);
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

  // const track = createReaction(() => {
  //   if (props.isRenderEmpty) return;

  //   getEvents();
  // });

  // const forget = async () => {
  //   setEvents(() => []);
  //   await forgetPage(props.key, index);
  //   track(() => props.isRenderEmpty);
  // };

  // createEffect(on(() => props.isRenderEmpty, (isEmpty) => {
  //   if (isEmpty === true) {
  //     forget();
  //     return;
  //   }

  //   getEvents();
  // }));

  const [events, setEvents] = createSignal<string[]>([]);

  const getEvents = async (init?: boolean) => {
    setEvents(() => [ ...props.page.paging.elements ])
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
