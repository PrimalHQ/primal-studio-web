import { Component } from 'solid-js';

import styles from './NoteContext.module.scss';

const NoteContextTrigger: Component<{
  ref: HTMLDivElement | undefined,
  id?: string,
  onClick?: () => void,
  collapsed?: boolean,
}> = (props) => {

  let contextMenu: HTMLDivElement | undefined;

  return (
    <div
      ref={props.ref}
      class={styles.context}
    >
      <button
        class={`${styles.contextButton} ${props.collapsed ? styles.collapsed : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onClick && props.onClick();
        }}
      >
        <div class={styles.contextIcon} ></div>
      </button>
    </div>
  )
}

export default NoteContextTrigger;
