import { Component, Match, Switch } from 'solid-js';
import { Kind } from '../../constants';
import { PrimalArticle, PrimalDraft, PrimalNote } from '../../primal';

import { parseDraftedEvent } from 'src/utils/drafts';
import DraftOtherParty from './DraftOtherParty';
import ArticleProposalPreview from './ArticleProposalPreview';
import NoteProposalPreview from './NoteProposalPreview';


const ProposalPreview: Component<{
  draft: PrimalDraft,
  checked?: boolean,
  type: 'sent' | 'inbox',
  onEdit?: () => void,
  onDelete?: (id: string) => void,
  onCheck?: (id: string, checked: boolean) => void,
}> = (props) => {

  const event = () => parseDraftedEvent(props.draft)

  return (
    <Switch>
      <Match when={!event()}>
        <div></div>
      </Match>

      <Match when={event()!.kind === Kind.LongForm}>
        <ArticleProposalPreview
          draft={props.draft}
          article={event() as PrimalArticle}
          checked={props.checked}
          onCheck={props.onCheck}
        />
        <DraftOtherParty
          draft={props.draft}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          type={props.type}
        />
      </Match>

      <Match when={event()!.kind === Kind.Text}>
        <NoteProposalPreview
          id={event()!.id}
          draft={props.draft}
          note={event() as PrimalNote}
          checked={props.checked}
          onCheck={props.onCheck}
        />
        <DraftOtherParty
          draft={props.draft}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          type={props.type}
        />
      </Match>
    </Switch>
  );
}

export default ProposalPreview;
