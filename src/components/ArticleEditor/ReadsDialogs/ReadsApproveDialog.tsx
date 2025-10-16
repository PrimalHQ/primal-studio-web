import { Component, createEffect, createSignal, Show } from 'solid-js';

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
import { removeEventFromPageStore } from 'src/stores/PageStore';
import { articlesStore, fetchFeedTotals } from 'src/pages/Articles/Articles.data';


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

  createEffect(() => {
    if (props.open || props.drafts.length === 1) {
      getFirstArticle();
    }
  });

  const [firstArticle, setFirstArticle] = createSignal<PrimalArticle>();

  const getFirstArticle = async () => {
    // @ts-ignore
    const fa = await parseDraftedEvent(props.drafts[0]) as PrimalArticle;

    setFirstArticle(() => ({...fa}));
  }
  const firstArticlePublishDate = () => {
    return props.drafts[0].draftedEvent?.created_at || 0;
  }

  const publishArticle = async () => {
    const pubkey = accountStore.pubkey;

    if (!pubkey || props.drafts.length === 0) return;

    let deletedDrafts: string[] = []

    for (let i=0; i<props.drafts.length; i++) {
      const draft = props.drafts[i];
      let article = unwrap(await parseDraftedEvent(draft)) as PrimalArticle;

      article.created_at = today();
      article.tags = article.tags.map(
        t => t[0] === 'published_at' ? ['published_at', `${today()}`] : t);

      const { success, note } = publishDate(article) > today() ?
        await scheduleArticle(article, article.tags, publishDate(article)) :
        await sendArticle(article, article.tags);

      if (success && note) {
        deletedDrafts.push(draft.id)
      }
    }

    await deleteFromInbox(deletedDrafts);

    for (let i=0; i<deletedDrafts.length;i++) {
      const id = deletedDrafts[i];
      removeEventFromPageStore(id, 'drafts');
    }

    fetchFeedTotals(accountStore.pubkey, {
      since: articlesStore.graphSpan.since,
      until: articlesStore.graphSpan.until,
      kind: 'articles',
    });

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
