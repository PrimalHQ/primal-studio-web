import { Component, createEffect, Show } from 'solid-js';

import styles from './EventPill.module.scss';
import { EventReference, fetchEventsFromReference } from 'src/primal_api/references';
import { Kind } from 'src/constants';
import { NostrEventContent, PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from 'src/primal';
import Avatar from 'src/components/Avatar/Avatar';
import { userNameFromUser } from 'src/utils/profile';
import { emptyUser } from 'src/utils/feeds';
import { createStore } from 'solid-js/store';

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
    <div
      class={`${styles.eventPill} ${props.readonly ? styles.readonly : ''} ${props.dark ? styles.dark : ''}`}
      data-reference={props.reference.reference}
      data-pubkey={data.event?.pubkey}
      onClick={() => props.onClick?.()}
    >
      <Avatar
        user={data.user}
        size={20}
      />
      <div class={styles.contentPill}>
        <Show when={props.reference.kind === Kind.Zap}>
          <div class={styles.zapIcon}></div>
        </Show>
        {data.content}
      </div>
      <Show when={!props.hideClose}>
        <button class={styles.closeButton}><div class={styles.closeIcon}></div></button>
      </Show>
    </div>
  )
}

export default EventPill;
