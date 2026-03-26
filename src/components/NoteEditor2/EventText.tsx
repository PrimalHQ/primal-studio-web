import { Component, } from 'solid-js';

import styles from './TipTapNoteEditor.module.scss';
import { EventReference } from 'src/primal_api/references';
import { Kind } from 'src/constants';
import { NostrEventContent, PrimalArticle, PrimalNote, PrimalUser } from 'src/primal';
import { userNameFromUser } from 'src/utils/profile';
import { emptyUser } from 'src/utils/feeds';

const EventText: Component<{
  id?: string,
  reference: EventReference,
  readonly?: boolean,
  onClick?: () => void,
}> = (props) => {

  const data = () => {
    const kind = props.reference.kind;

    if (kind === Kind.Metadata) {
      const user = props.reference.event as PrimalUser;

      return {
        event: user,
        user: user,
        content: userNameFromUser(user),
      };
    }

    if (kind === Kind.Text) {
      const note = props.reference.event as PrimalNote;
      return {
        event: note,
        user: note?.user,
        content: `"${note.content.slice(0, 12)}..."`,
      };
    }

    if (kind === Kind.LongForm) {
      const article = props.reference.event as PrimalArticle;
      return {
        event: article,
        user: article?.user,
        content: `"${article.title.slice(0, 12)}..."`,
      };
    }

    const event = props.reference.event as NostrEventContent;
    return {
      event,
      user: emptyUser(event?.pubkey || ''),
      content: `${(props.reference.reference || '')}`,
    };
  }

  return (
    <div
      class={styles.eventText}
      data-reference={props.reference.reference}
      data-pubkey={data().event?.pubkey}
    >
      {data().content}
    </div>
  )
}

export default EventText;
