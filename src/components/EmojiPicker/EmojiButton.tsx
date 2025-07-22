import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import styles from './EmojiPicker.module.scss';
import { getScreenCordinates } from 'src/utils/ui';
import { Popover } from '@kobalte/core/popover';
import EmojiPickPopover from './EmojiPickPopover';
import { EmojiOption } from './EmojiPicker';

const EmojiButton: Component<{
  id?: string,
  class?: string,
  extended?: boolean,
  onSelect: (emoji: EmojiOption) => void,
}> = (props) => {
  const [open, setOpen] = createSignal(false);

  const klass = () => {
    let k =`${props.class || ''}`;
    if (props.extended) {
      k += ` ${styles.extended}`;
    }

    return k;
  }

  return (

    <div class={styles.editorOption}>
      <Popover
        open={open()}
        onOpenChange={setOpen}
        placement='bottom-start'
      >
        <Popover.Trigger class={klass()}>
          <div class={styles.emojiIconSmall}></div>
          <Show when={props.extended}>
            <div class={styles.chevronIcon}></div>
          </Show>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            class={styles.emojiPickHolder}
          >
            <EmojiPickPopover
              onClose={() => {
                setOpen(false);
              }}
              onSelect={(emoji) => {
                setOpen(false);
                props.onSelect && props.onSelect(emoji)
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    </div>
  );
}

export default EmojiButton;
