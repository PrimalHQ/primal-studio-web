import { Component, For } from "solid-js";
import styles from  "./PrimalMenu.module.scss";
import PrimalMenuItem from "./PrimalMenuItem";
import { MenuItem } from "../NoteContextMenu/NoteContexMenu";


const PrimalMenu: Component<{
  id: string,
  items: MenuItem[],
  position?: 'note_footer' | 'profile' | 'note_context' | 'media_context',
  orientation?: 'up' | 'down',
  reverse?: boolean,
  hidden?: boolean,
}> = (props) => {

  const visibilityClass = () => {
    if (props.hidden) {
      return styles.hidden;
    }

    return styles.visible;
  };

  const positionClass = () => {
    if (props.position === 'note_context') {
      return styles.noteContext
    }

    if (props.position === 'media_context') {
      return styles.mediaContext
    }

    if (props.position === 'note_footer') {
      return styles.noteFooter
    }

    if (props.position === 'profile') {
      return styles.profile
    }

    return '';
  }

  const orientationClass = () => {
    if (!props.orientation || props.orientation == 'down') {
      return styles.contextMenuOptions
    }

    return styles.contextMenuOptionsUp
  };

  return (
    <div
      id={props.id}
      class={`${orientationClass()} ${positionClass()}`}
      data-open={!props.hidden}
    >
      <For each={props.items}>
        {item => (
          <PrimalMenuItem item={item} reverse={props.reverse} />
        )}
      </For>
    </div>
  )
}

export default PrimalMenu;
