import { Component, createEffect, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import { Kind, noteRegexG, profileRegexG } from '../../constants';
import { EventDisplayVariant, NostrEventContent, PrimalArticle, PrimalDraft, PrimalNote } from '../../primal';

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
import ArticlePreview from './ArticlePreview';
import NotePreview from './NotePreview';
import { parseDraftedEvent } from 'src/utils/drafts';
import DraftInfo from './DraftInfo';


const DraftPreview: Component<{
  draft: PrimalDraft,
  onEdit?: () => void,
  onDelete?: (id: string) => void,
}> = (props) => {

  const event = () => parseDraftedEvent(props.draft)

  return (
    <Switch>
      <Match when={!event()}>
        <div></div>
      </Match>

      <Match when={event()!.kind === Kind.LongForm}>
        <ArticlePreview
          article={event() as PrimalArticle}
        />
        <DraftInfo draft={props.draft}

        />
      </Match>

      <Match when={event()!.kind === Kind.Text}>
        <NotePreview
          id={event()!.id}
          note={event() as PrimalNote}
        />
        <DraftInfo
          draft={props.draft}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      </Match>
    </Switch>
  );
}

export default DraftPreview;
