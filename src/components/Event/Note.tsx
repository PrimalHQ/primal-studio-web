import { Component, For, Show } from 'solid-js';
import { EventDisplayVariant, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';


export const renderEmbeddedNote = (config: any) => {
  return (<div>NOTE</div> as HTMLDivElement).innerHTML;
}

const Note: Component<{
  note: PrimalNote,
  onClick?: () => void,
  onRemove?: (id: string) => void,
  embedded?: boolean,
  variant?: EventDisplayVariant,
}> = (props) => {
  return (
    <a
      class={`${styles.event} ${props.embedded ? styles.embedded : ''}`}
      data-event-id={props.note.id}
      href={`/e/${props.note.id}`}
    >
      <div class={styles.note}>
        <div class={styles.noteHeader}>
          {userName(props.note.pubkey)}
        </div>
        <div>{props.note.content}</div>
      </div>
    </a>
  );
}

export default Note;


export const NoteSuggestionSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.noteSuggestionSkeleton}>
      <div class={styles.avatarSN}></div>
      <div class={styles.shortNote}>
        <div class={styles.headerSN}></div>
        <div class={styles.contentSN}></div>
      </div>
    </div>
  );
}
