import { Component, createEffect, createSignal } from 'solid-js';

import styles from './EmojiPicker.module.scss';
import ButtonGhost from '../Buttons/ButtonGhost';

const EmojiPickHeader: Component<{
  focus?: boolean,
  onInput: (emoji: string) => void,
  onFilter?: (emoji: string) => void,
}> = (props) => {

  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.focus) {
      inputRef?.focus();
    }
  })

  const onFilter = (filter: string) => {
    if (inputRef) {
      inputRef.value = '';
      inputRef.focus();
    }

    props.onFilter && props.onFilter(filter);

  }

  return (
    <div class={styles.emojiHeader}>
      <div class={styles.emojiInput}>
        <div class={styles.searchIcon}></div>
        <input
          ref={inputRef}
          onInput={(e: InputEvent) => {
            const target = e.target as HTMLInputElement;
            props.onInput(target.value);
          }}
          placeholder={'Search...'}
        >
        </input>
      </div>
      <div class={styles.filters}>
        <ButtonGhost
          onClick={() => onFilter('default')}
        >
          <div class={`latest_icon ${styles.timeIcon}`}></div>
        </ButtonGhost>
        <ButtonGhost
          onClick={() => onFilter('face')}
        >
          <div class={`emoji_icon ${styles.emojiIcon}`}></div>
        </ButtonGhost>
        <ButtonGhost
          onClick={() => onFilter('love')}
        >
          <div class={`heart_icon ${styles.heartIcon}`}></div>
        </ButtonGhost>
        <ButtonGhost
          onClick={() => onFilter('weather')}
        >
          <div class={`weather_icon ${styles.sunIcon}`}></div>
        </ButtonGhost>
      </div>
    </div>
  );
}

export default EmojiPickHeader;
