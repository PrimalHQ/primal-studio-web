import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import styles from './EmojiPicker.module.scss';
import { v4 as uuidv4 } from 'uuid';

import emojiSearch from '@jukben/emoji-search';
import { createStore } from 'solid-js/store';
import { isVisibleInContainer } from 'src/utils/ui';

export type EmojiOption = {
  keywords: string[],
  char?: string,
  fitzpatrick_scale?: boolean,
  category?: string,
  name: string,
};

const rowLength = 8;

const EmojiPicker: Component<{
  id?: string,
  filter: string,
  preset?: EmojiOption[],
  showPreset?: boolean,
  short?: boolean,
  onSelect: (emoji: EmojiOption) => void,
}> = (props) => {

  const [emojiResults, setEmojiResults] = createStore<EmojiOption[]>([]);
  const [highlightedEmoji, setHighlightedEmoji] = createSignal<number>(0);
  let emojiOptions: HTMLDivElement | undefined;
  const instanceId = uuidv4();

  const presetEmojis = props.preset || [];

  const preset = () => props.showPreset ? presetEmojis : [];

  const completeCollection = () => [...preset(), ...emojiResults];

  const emojiChangeKeyboard = (e: KeyboardEvent) => {
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (completeCollection().length === 0) {
          return 0;
        }

        if (i < preset().length && i + rowLength > preset().length) {
          return preset().length;
        }

        return i < completeCollection().length - rowLength ? i + rowLength : 0;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }

      return;
    }

    if (e.code === 'ArrowUp') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (completeCollection().length === 0) {
          return 0;
        }

        if (i > preset().length - 1 && i - rowLength < preset().length) {
          return preset().length - 1;
        }

        return i >= rowLength ? i - rowLength : completeCollection().length - 1;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      return;
    }

    if (e.code === 'ArrowRight') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (completeCollection().length === 0) {
          return 0;
        }

        return i < completeCollection().length - 1 ? i + 1 : 0;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }

      return;
    }

    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      setHighlightedEmoji(i => {
        if (completeCollection().length === 0) {
          return 0;
        }

        return i > 0 ? i - 1 : completeCollection().length - 1;
      });

      const emojiHolder = document.getElementById(`${instanceId}-${highlightedEmoji()}`);

      if (emojiHolder && emojiOptions && !isVisibleInContainer(emojiHolder, emojiOptions)) {
        emojiHolder.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      return;
    }

    if (['Enter', 'Space'].includes(e.code)) {
      props.onSelect(completeCollection()[highlightedEmoji()]);
      return;
    }
  };

  onMount(() => {
    window.addEventListener('keydown', emojiChangeKeyboard);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', emojiChangeKeyboard);
  });

  createEffect(() => {
    const val = props.filter.trim();

    setEmojiResults(emojiSearch(val));
  });

  return (
    <div
      class={`${styles.emojiSuggestions} ${props.short && styles.short}`}
      ref={emojiOptions}
    >
      <Show when={props.showPreset && presetEmojis.length > 0}>
        <div class={styles.groupTitle}>Recently Used</div>
      </Show>
      <div class={styles.group}>
        <For each={preset()}>
          {(emoji, index) => (
            <button
              id={`${instanceId}-${index()}`}
              class={`${styles.emojiOption} ${highlightedEmoji() === index() ? styles.highlight : ''}`}
              onClick={() => {
                props.onSelect(emoji);
              }}
            >
              {emoji.name}
            </button>
          )}
        </For>
      </div>

      <Show when={props.showPreset}>
        <div class={styles.groupTitle}>Faces</div>
      </Show>
      <div class={styles.group}>
        <For each={emojiResults}>
          {(emoji, index) => (
            <button
              id={`${instanceId}-${index()+preset().length}`}
              class={`${styles.emojiOption} ${highlightedEmoji() === (index()+preset().length) ? styles.highlight : ''}`}
              onClick={() => {
                props.onSelect(emoji);
              }}
            >
              {emoji.name}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

export default EmojiPicker;
