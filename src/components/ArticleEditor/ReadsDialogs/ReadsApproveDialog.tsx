import { Component, createEffect, Show } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import { PrimalArticle, PrimalDraft } from 'src/primal';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import { longDate } from 'src/utils/date';
import { parseDraftedEvent } from 'src/utils/drafts';
import { accountStore } from 'src/stores/AccountStore';
import { scheduleArticle, sendArticle } from 'src/primal_api/nostr';
import { deleteFromInbox } from 'src/primal_api/studio';
import { unwrap } from 'solid-js/store';
import ArticleReviewPreview from 'src/components/Event/ArticleReviewPreview';


const ReadsApproveDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  drafts: PrimalDraft[],
  onClose?: () => void;
}> = (props) => {

  const publishDate = (article: PrimalArticle) => article.published_at || 0;
  const today = () => Math.ceil((new Date()).getTime() / 1_000);

  createEffect(() => {
    if (!props.open) {
      props.onClose && props.onClose();
    }
  });

  const firstArticle = () => {
    // @ts-ignore
    return parseDraftedEvent(props.drafts[0]) as PrimalArticle;
  }
  const firstArticlePublishDate = () => {
    return props.drafts[0].draftedEvent?.created_at || 0;
  }

  const publishArticle = async () => {
    const pubkey = accountStore.pubkey;

    if (!pubkey || props.drafts.length === 0) return;

    let deletedDrafts: string[] = []

    for (let i=0; i<props.drafts.length; i++) {
      let article = unwrap(parseDraftedEvent(props.drafts[i])) as PrimalArticle;

      article.created_at = today();
      article.tags = article.tags.map(
        t => t[0] === 'published_at' ? ['published_at', `${today()}`] : t);

      const { success, note } = publishDate(article) > today() ?
        await scheduleArticle(article, [], publishDate(article)) :
        await sendArticle(article, []);

      if (success && note) {
        deletedDrafts.push(article.id)
      }
    }

    deleteFromInbox(deletedDrafts);
    props.setOpen && props.setOpen(false);
    return;
  };

  return (
    <Dialog
      triggerClass="displayNone"
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
            <ArticleReviewPreview
              article={firstArticle()}
            />
          </div>
        </Show>

        <div class={styles.additionalPublishInfo}>
          <Show when={props.drafts.length === 1 && firstArticlePublishDate() > today()}>
            <div class={styles.publishDateDisplay}>
              <div class={styles.calendarIconBig}></div>
              <div class={styles.dateInfo}>
                <div class={styles.label}>
                  Scheduled to publish:
                </div>
                <div class={styles.date}>
                  {longDate(firstArticlePublishDate() || 0)}
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
