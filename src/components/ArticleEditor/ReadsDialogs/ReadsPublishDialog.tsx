import { Component, createSignal, Match, Show, Switch } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import { TextField } from '@kobalte/core/text-field';
import { PrimalArticle, PrimalUser } from 'src/primal';
import { ArticleEdit } from '../ArticleEditor';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import { longDate } from 'src/utils/date';
import { userName } from 'src/utils/profile';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';
import { nip05Verification } from 'src/utils/ui';
import Avatar from 'src/components/Avatar/Avatar';
import ArticleReviewPreview from 'src/components/Event/ArticleReviewPreview';


const ReadsPublishDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  article: PrimalArticle | undefined,
  articleData: ArticleEdit | undefined,
  onPublish: (promote: boolean) => void,
  publishTime?: number | undefined,
  proposedUser?: PrimalUser | undefined,
}> = (props) => {

  const [promotion, setPromotion] = createSignal('');
  const [showPromotion, setShowPromotion] = createSignal(false);

  return (
    <Dialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Publish Article"
    >
      <div class={styles.readsPublishDialog}>
        <Show when={false}>
          <TextField
            id="link_label"
            class={styles.textInput}
            value={promotion()}
            onChange={setPromotion}
          >
           	<TextField.TextArea autoResize rows={1} />
          </TextField>
        </Show>

        <div class={styles.previewHolder}>
          <ArticleReviewPreview
            article={props.article!}
          />
        </div>

        <div class={styles.additionalPublishInfo}>
          <Show when={props.publishTime}>
            <div class={styles.publishDateDisplay}>
              <div class={styles.calendarIconBig}></div>
              <div class={styles.dateInfo}>
                <div class={styles.label}>
                  Scheduled to publish:
                </div>
                <div class={styles.date}>
                  {longDate(props.publishTime || 0)}
                </div>
              </div>
            </div>
          </Show>

          <Show when={props.proposedUser}>
            <div class={styles.publishDateDisplay}>
              <Avatar user={props.proposedUser!} size={32} />
              <div class={styles.dateInfo}>
                <div class={styles.label}>
                  Proposed to:
                </div>
                <div class={styles.date}>
                  <div>{userName(props.proposedUser!.pubkey)}</div>
                  <VerificationCheck user={props.proposedUser} />
                  <div>{nip05Verification(props.proposedUser)}</div>
                </div>
              </div>
            </div>
          </Show>

        </div>

        {/* <CheckBox2
          onChange={setShowPromotion}
          checked={showPromotion()}
        >
          Add a short note to promote your article in the main feed
        </CheckBox2> */}

        <div class={styles.actions}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
            shrink={true}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => props.onPublish(showPromotion())}
          >
            <Switch fallback={<>Publish</>}>
              <Match when={props.proposedUser}>
                <>Send Proposal</>
              </Match>
              <Match when={props.publishTime}>
                <>Schedule for Publishing</>
              </Match>
            </Switch>
          </ButtonPrimary>
        </div>
      </div>
    </Dialog>
  );
}

export default ReadsPublishDialog;
