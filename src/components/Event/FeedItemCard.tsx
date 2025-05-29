import { Component, createEffect, createSignal, For, JSXElement, onMount, Show } from 'solid-js';
import { noteRegexG, profileRegexG } from '../../constants';
import { EventDisplayVariant, NostrEventContent, PrimalArticle, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import { nip19 } from 'nostr-tools';
import { eventStore } from '../../stores/EventStore';
import { isYouTube, NoteAST, parseTextToAST } from 'src/utils/parser';
import { FeedEvent } from './FeedPage';
import { getMediaUrl, getUsersBlossomUrls } from 'src/stores/MediaStore';
import { createStore } from 'solid-js/store';
import Avatar from '../Avatar/Avatar';
import { longDate } from 'src/utils/date';

import missingImage from 'assets/images/missing_image.svg';
import { appStore, openNoteContextMenu } from 'src/stores/AppStore';
import NoteContextTrigger from '../NoteContextMenu/NoteContextTrigger';
import { humanizeNumber } from 'src/utils/ui';

const FeedItemCard: Component<{
  children?: JSXElement,
  onClick?: () => void,
  event: PrimalNote | PrimalArticle,
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
      <div class={styles.contextMenuTrigger}>
        <NoteContextTrigger
          ref={contextMenu}
          onClick={onContextMenuTrigger}
        />
      </div>
      {props.children}
    </button>
  );
}

export default FeedItemCard;
