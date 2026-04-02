import { Component, createEffect, Match, Show, Switch } from 'solid-js';

import styles from './TipTapNoteEditor.module.scss';
import { EventReference, fetchEventsFromReference } from 'src/primal_api/references';
import { Kind } from 'src/constants';
import { NostrEventContent, PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from 'src/primal';
import Avatar from 'src/components/Avatar/Avatar';
import { userNameFromUser } from 'src/utils/profile';
import { emptyUser } from 'src/utils/feeds';
import { createStore } from 'solid-js/store';
import Note from '../Event/Note';
import NotePreview from './NotePreview';
import ArticlePreview from './ArticlePreview';

export type EventPillData = {
  event?: PrimalUser | PrimalNote | PrimalArticle | NostrEventContent,
  user?: PrimalUser,
  content: string,
}

const EventPill: Component<{
  id?: string,
  reference: EventReference,
  readonly?: boolean,
  hideClose?: boolean,
  dark?: boolean,
  onClick?: () => void,
}> = (props) => {

  const [data, setData] = createStore<EventPillData>({ content: '' });

  const fetchData = async (reference: EventReference) => {
    const kind = reference.kind;

    if (kind === Kind.Metadata) {
      const user = reference.event as PrimalUser;
      setData({
        event: user,
        user: user,
        content: userNameFromUser(user),
      });
      return;
    }

    if (kind === Kind.Text) {
      const note = reference.event as PrimalNote;
      setData({
        event: note,
        user: note?.user,
        content: `${note?.content || ''}`,
      });
      return;
    }

    if (kind === Kind.LongForm) {
      const article = reference.event as PrimalArticle;
      setData({
        event: article,
        user: article?.user,
        content: `${article?.title || ''}`,
      });
      return;
    }

    if (kind === Kind.Zap) {
      const zap = reference.event as PrimalZap;
      setData({
        event: zap,
        user: zap?.senderUser,
        content: (zap?.amount || 0).toLocaleString(),
      });
      return;
    }

    if (!kind && reference.reference) {
      const eventReference = await fetchEventsFromReference(reference.reference);

      if (eventReference.error) return;

      fetchData(eventReference);
      return;
    }

    const event = reference.event as NostrEventContent;
    setData({
      event,
      user: emptyUser(event?.pubkey || ''),
      content: `${(reference.reference || '')}`,
    });
  }

  createEffect(() => {
    fetchData(props.reference);
  });

  return (
      <Switch>
        <Match when={props.reference.kind === Kind.Text}>
          <NotePreview
            note={props.reference.event as PrimalNote}
            dark={true}
          />
        </Match>
        <Match when={props.reference.kind === Kind.LongForm}>
          <ArticlePreview
            article={props.reference.event as PrimalArticle}
            dark={true}
          />
        </Match>
        <Match when={props.reference.kind === Kind.Metadata}>
          <span class={styles.linkish}>@{userNameFromUser(props.reference.event as PrimalUser)}</span>
        </Match>
        <Match when={true}>
          {props.reference.pk}
        </Match>
      </Switch>
  )
}

export default EventPill;
