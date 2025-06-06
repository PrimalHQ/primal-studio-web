import { Component, createEffect, Show } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import { PrimalNote, PrimalDraft } from 'src/primal';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import { longDate } from 'src/utils/date';
import { parseDraftedEvent } from 'src/utils/drafts';
import { accountStore } from 'src/stores/AccountStore';
import { scheduleArticle, scheduleNote, sendArticle, sendNote } from 'src/primal_api/nostr';
import { deleteFromInbox } from 'src/primal_api/studio';
import { unwrap } from 'solid-js/store';
import ArticleReviewPreview from 'src/components/Event/ArticleReviewPreview';


const NotesApproveDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  drafts: PrimalDraft[],
  onClose?: () => void;
}> = (props) => {

  const publishDate = (note: PrimalNote) => note.created_at || 0;
  const today = () => Math.ceil((new Date()).getTime() / 1_000);

  createEffect(() => {
    if (!props.open) {
      props.onClose && props.onClose();
    }
  });

  const firstNote = () => {
    // @ts-ignore
    return parseDraftedEvent(props.drafts[0]) as PrimalNote;
  }
  const firstNotePublishDate = () => {
    return props.drafts[0].draftedEvent?.created_at || 0;
  }

  const publishNote = async () => {
    const pubkey = accountStore.pubkey;

    if (!pubkey || props.drafts.length === 0) return;

    let deletedDrafts: string[] = []

    for (let i=0; i<props.drafts.length; i++) {
      let noteToSend = unwrap(parseDraftedEvent(props.drafts[i])) as PrimalNote;

      const { success, note } = publishDate(noteToSend) > today() ?
        await scheduleNote(noteToSend.content, noteToSend.tags, publishDate(noteToSend)) :
        await sendNote(noteToSend.content, noteToSend.tags);

      if (success && note) {
        deletedDrafts.push(noteToSend.id)
      }
    }

    deleteFromInbox(deletedDrafts);
    props.setOpen && props.setOpen(false);
    return;
  };

  return (
    <Dialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Publish Article"
    >
      <div class={styles.readsPublishDialog}>

        <Show
          when={props.drafts.length < 2}
          fallback={<div>
            Publish the {props.drafts.length} selected articles.
          </div>}
        >
          <div class={styles.previewHolder}>
            {firstNote().content}
          </div>
        </Show>

        <div class={styles.additionalPublishInfo}>
          <Show when={props.drafts.length === 1 && firstNotePublishDate() > today()}>
            <div class={styles.publishDateDisplay}>
              <div class={styles.calendarIconBig}></div>
              <div class={styles.dateInfo}>
                <div class={styles.label}>
                  Scheduled to publish:
                </div>
                <div class={styles.date}>
                  {longDate(firstNotePublishDate() || 0)}
                </div>
              </div>
            </div>
          </Show>
        </div>

        <div class={styles.actions}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
            shrink={true}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={publishNote}
          >
            Approve
          </ButtonPrimary>
        </div>
      </div>
    </Dialog>
  );
}

export default NotesApproveDialog;
