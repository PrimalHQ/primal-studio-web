import { Component, Match, Switch } from 'solid-js';
import { Kind } from '../../constants';
import { PrimalArticle, PrimalDraft, PrimalNote } from '../../primal';
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
        <DraftInfo
          draft={props.draft}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
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
