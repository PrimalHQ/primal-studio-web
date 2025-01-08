import { Component, createEffect, createSignal, For, JSX, onCleanup, onMount, Show } from 'solid-js';
import { Kind } from '../../constants';
import { EventDisplayVariant, NostrEventContent } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import { pageStore, updatePageStore } from '../../stores/PageStore';


const Note: Component<{
  event: NostrEventContent,
  reposters: string[],
  variant?: EventDisplayVariant,
  isRenderEmpty?: boolean,
  observer?: IntersectionObserver,
}> = (props) => {
  let noteHolder: HTMLDivElement | undefined;

  createEffect(() => {
    if (!noteHolder || props.isRenderEmpty) return;

    const rect = noteHolder.getBoundingClientRect();
    updatePageStore('home', 'noteSizes', () => ({ [props.event.id]: rect.height }));
  });

  onMount(() => {
    if (!props.observer || !noteHolder) return;

    props.observer?.observe(noteHolder);
  });

  onCleanup(() => {
    if (!props.observer || !noteHolder) return;

    props.observer?.unobserve(noteHolder);
  });

  return (
    <div
      class={styles.event}
      ref={noteHolder}
      data-event-id={props.event.id}
    >
      <Show
        when={!props.isRenderEmpty}
        fallback={<div style={`height: ${pageStore.home.noteSizes[props.event.id]}px; background-color: green;`}></div>}
      >
        <a
        class={styles.eventLink}
          href={`/e/${props.event.id}`}
        >
          <Show when={props.reposters.length > 0}>
            <div class={styles.reposters}>
              <For each={props.reposters}>{reposter => <div>REPOST: {reposter}</div>}</For>
            </div>
          </Show>
          <div class={styles.note}>
            <div class={styles.noteHeader}>
              {userName(props.event.pubkey)}
            </div>
            {props.event.content}
          </div>
        </a>
      </Show>
    </div>
  );
}

export default Note;
