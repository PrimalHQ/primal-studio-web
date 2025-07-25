import { Component, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import styles from './EmojiPicker.module.scss';
import EmojiPicker, { EmojiOption } from './EmojiPicker';
import EmojiPickHeader from './EmojiHeader';
import { accountStore } from 'src/stores/AccountStore';

const defaultTerm = 'face';

const EmojiPickPopover: Component<{
  id?: string,
  onClose: (e: MouseEvent | KeyboardEvent) => void,
  onSelect: (emoji: EmojiOption) => void,
  orientation?: 'up' | 'down',
}> = (props) => {

  const [emojiSearchTerm, setEmojiSearchTerm] = createSignal(defaultTerm);
  const [focusInput, setFocusInput] = createSignal(false);
  const [showPreset, setShowPreset] = createSignal(true);

  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.code === 'Escape') {
      props.onClose(e);
      return;
    }
  };

  createEffect(() => {
    if (emojiSearchTerm().length === 0) {
      setEmojiSearchTerm(() => defaultTerm)
    }
  });

  const setFilter = (filter: string) => {
    if (filter === 'default') {
      setShowPreset(true);
      setEmojiSearchTerm(() => defaultTerm);
    }
    else {
      setShowPreset(false);
      setEmojiSearchTerm(() => filter);
    }
  };

  const onClickOutside = (e: MouseEvent) => {
    props.onClose(e);
  };

  const onEmojiSearch = (term: string) => {
    setEmojiSearchTerm(() => term);
    setShowPreset(() => term.length === 0);
  };

  onMount(() => {
    setTimeout(() => {
      setEmojiSearchTerm(() => defaultTerm);
      setFocusInput(() => true);
      setFocusInput(() => false);
      window.addEventListener('keyup', onKey);
      window.addEventListener('click', onClickOutside);
    }, 10);
  });

  onCleanup(() => {
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('click', onClickOutside);
  });


  return (
    <div
      id={props.id}
      class={styles.zapEmojiChangeModal}
    >
      <EmojiPickHeader
        focus={focusInput()}
        onInput={onEmojiSearch}
        onFilter={setFilter}
      />

      <EmojiPicker
        showPreset={showPreset()}
        preset={accountStore.emojiHistory || []}
        filter={emojiSearchTerm()}
        onSelect={(emoji: EmojiOption) => {
          props.onSelect(emoji);
          setFocusInput(true);
          setFocusInput(() => false);
        }}
        short={props.orientation === 'up'}
      />
    </div>
  );
}

export default EmojiPickPopover;
