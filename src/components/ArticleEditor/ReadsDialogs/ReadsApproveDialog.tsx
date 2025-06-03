import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import { TextField } from '@kobalte/core/text-field';
import { PrimalArticle, PrimalDraft, PrimalUser } from 'src/primal';
import { ArticleEdit } from '../ArticleEditor';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import ArticlePreviewPublish from 'src/components/Event/ArticlePreviewPublish';
import { longDate } from 'src/utils/date';
import { userName } from 'src/utils/profile';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';
import { nip05Verification } from 'src/utils/ui';
import Avatar from 'src/components/Avatar/Avatar';
import { parseDraftedEvent } from 'src/utils/drafts';
import { accountStore } from 'src/stores/AccountStore';
import { referencesToTags } from 'src/utils/feeds';
import { scheduleArticle, sendArticle } from 'src/primal_api/nostr';
import { deleteFromInbox } from 'src/primal_api/studio';
import { generateArticleIdentifier } from 'src/utils/kyes';
import { unwrap } from 'solid-js/store';


const ReadsApproveDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  draft: PrimalDraft | undefined,
  onClose?: () => void;
}> = (props) => {

  const article = () => props.draft ?
    parseDraftedEvent(props.draft) as PrimalArticle :
    undefined;

  const publishDate = () => article()?.published_at || 0;
  const today = () => Math.ceil((new Date()).getTime() / 1_000);

  createEffect(() => {
    if (!props.open) {
      props.onClose && props.onClose();
    }
  });

  const doScheduleArticle = async (art: PrimalArticle) => {
    const { success, note } = await scheduleArticle(art, [], publishDate());

    if (success && note) {
      deleteFromInbox([props.draft!.id]);
      props.setOpen && props.setOpen(false);
      return;
    }
  }

  const publishArticle = async () => {
    const pubkey = accountStore.pubkey;
    const art = article();
    if (!pubkey || !art) return;

    let artToSend = unwrap(art);

    artToSend.created_at = today();
    artToSend.tags = artToSend.tags.map(
      t => t[0] === 'published_at' ? ['published_at', `${today()}`] : t);

    if (publishDate() > today()) {
      return await doScheduleArticle(artToSend);
    }


    const { success, note } = await sendArticle(artToSend, []);

    if (success && note) {
      deleteFromInbox([props.draft!.id]);
      props.setOpen && props.setOpen(false);
      return;
    }
  };


  return (
    <Dialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Publish Article"
    >
      <div class={styles.readsPublishDialog}>

        <div class={styles.previewHolder}>
          {/* <ArticlePreviewPublish
            article={props.article!}
            hideContext={true}
            hideFooter={true}
          /> */}
        </div>

        <div class={styles.additionalPublishInfo}>
          <Show when={publishDate() > today()}>
            <div class={styles.publishDateDisplay}>
              <div class={styles.calendarIconBig}></div>
              <div class={styles.dateInfo}>
                <div class={styles.label}>
                  Scheduled to publish:
                </div>
                <div class={styles.date}>
                  {longDate(publishDate() || 0)}
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
            onClick={publishArticle}
          >
            Approve
          </ButtonPrimary>
        </div>
      </div>
    </Dialog>
  );
}

export default ReadsApproveDialog;
