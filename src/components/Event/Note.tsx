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
}> = (props) => {

  return (
    <a
      class={styles.event}
      data-event-id={props.event.id}
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
  );
}

export default Note;
