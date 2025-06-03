import { Component, Match, Switch } from 'solid-js';
import { Kind } from '../../constants';
import { PrimalArticle, PrimalDraft, PrimalNote } from '../../primal';

import ArticlePreview from './ArticlePreview';
import NotePreview from './NotePreview';
import { parseDraftedEvent } from 'src/utils/drafts';
import DraftOtherParty from './DraftOtherParty';


const InboxPreview: Component<{
  draft: PrimalDraft,
  onEdit?: () => void,
  onDelete?: (id: string) => void,
  onView?: () => void,
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
        <DraftOtherParty
          draft={props.draft}
          event={event()!}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onView={props.onView}
          type="inbox"
        />
      </Match>

      <Match when={event()!.kind === Kind.Text}>
        <NotePreview
          id={event()!.id}
          note={event() as PrimalNote}
        />
        <DraftOtherParty
          draft={props.draft}
          event={event()!}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onView={props.onView}
          type="inbox"
        />
      </Match>
    </Switch>
  );
}

export default InboxPreview;
