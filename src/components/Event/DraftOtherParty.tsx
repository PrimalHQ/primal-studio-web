import { Component, Match, Show, Switch } from 'solid-js';
import { PrimalArticle, PrimalDraft, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { longDate } from 'src/utils/date';
import { openConfirmDialog } from 'src/stores/AppStore';
import { doRequestDelete } from 'src/primal_api/events';
import { accountStore } from 'src/stores/AccountStore';
import ButtonLink from '../Buttons/ButtonLink';
import Avatar from '../Avatar/Avatar';
import { userName } from 'src/utils/profile';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { nip05Verification } from 'src/utils/ui';


const DraftOtherParty: Component<{
  draft: PrimalDraft,
  event: PrimalNote | PrimalArticle,
  onEdit?: () => void,
  onView?: () => void,
  onApprove?: () => void,
  onDelete?: (id: string) => void,
  type: 'sent' | 'inbox',
}> = (props) => {

  const otherParty = () => {
    const sender = props.draft.sender;
    const receiver = props.draft.receiver;

    return accountStore.pubkey === sender.pubkey ?
      receiver :
      sender;
  }

  const publishOn = () => {
    let pub = parseInt((props.event.tags.find(t => t[0] === 'published_at') || ['published_at', '0'])[1]);

    if (pub) return pub;

    return props.event.created_at;

  }

  const today = () => Math.ceil((new Date()).getTime() / 1_000);

  return (
    <div class={styles.draftOtherParty}>
      <div class={styles.partyInfo}>
        <Avatar
          user={otherParty()}
          size={32}
        />
        <div class={styles.proposalInfo}>
          <div class={styles.partyDetails}>
            <Show
              when={props.type === 'sent'}
              fallback={<div class={styles.label}>Proposed by:</div>}
            >
              <div class={styles.label}>Proposed to:</div>
            </Show>
            <div class={styles.userName}>{userName(otherParty()?.pubkey)}</div>
            <VerificationCheck user={otherParty()} />
            <div class={styles.nip05}>{nip05Verification(otherParty())}</div>
          </div>
          <div class={styles.publishInfo}>
            <div class={styles.label}>To publish:</div>
            <div class={styles.date}>{publishOn() > today() ? longDate(publishOn()) : 'immediately'}</div>
          </div>
        </div>
      </div>
      <Switch>
        <Match when={props.type === 'sent'}>
          <button
            class={styles.draftAction}
            onClick={props.onView}
          >
            View
          </button>
        </Match>
        <Match when={props.type === 'inbox'}>
          <div class={styles.actions}>
            <button
              class={styles.draftAction}
              onClick={props.onEdit}
            >
              Edit
            </button>
            <div class={styles.separator}></div>
            <button
              class={styles.draftAction}
              onClick={props.onApprove}
            >
              Approve
            </button>
          </div>
        </Match>
      </Switch>
    </div>
  );
}

export default DraftOtherParty;
