import { Component, JSXElement, Show } from 'solid-js';
import { PrimalArticle, PrimalDraft, PrimalNote } from '../../primal';

import styles from './Event.module.scss';

import { appStore, openNoteContextMenu } from 'src/stores/AppStore';
import NoteContextTrigger from '../NoteContextMenu/NoteContextTrigger';

const FeedItemCard: Component<{
  children?: JSXElement,
  event: PrimalNote | PrimalArticle | PrimalDraft,
  hideContextMenu?: boolean,
  onClick?: () => void,
  onDelete?: (id: string) => void,
}> = (props) => {

  let contextMenu: HTMLDivElement | undefined;

  const openReactionModal = (openOn = 'likes') =>  {
    // app?.actions.openReactionModal(props.article.naddr, {
    //   likes: reactionsState.likes,
    //   zaps: reactionsState.zapCount,
    //   reposts: reactionsState.reposts,
    //   quotes: reactionsState.quoteCount,
    //   openOn,
    // });
  };

  const onContextMenuTrigger = () => {
    openNoteContextMenu(
      props.event,
      contextMenu?.getBoundingClientRect(),
      openReactionModal,
      () => {
        props.onDelete && props.onDelete(props.event.id)
      },
    );
  };

  return (
    <button
      class={styles.feedItemCard}
      data-event-id={props.event.id}
      onClick={props.onClick}
    >
      <Show when={!props.hideContextMenu}>
        <div class={appStore.noteContextMenuInfo?.note.id === props.event.id ? styles.activeContextMenuTrigger : styles.contextMenuTrigger}>
          <NoteContextTrigger
            ref={contextMenu}
            onClick={onContextMenuTrigger}
          />
        </div>
      </Show>
      {props.children}
    </button>
  );
}

export default FeedItemCard;
