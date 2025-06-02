import { Component, createSignal, Show } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import { TextField } from '@kobalte/core/text-field';
import { PrimalArticle } from 'src/primal';
import { ArticleEdit } from '../ArticleEditor';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import ArticlePreviewPublish from 'src/components/Event/ArticlePreviewPublish';


const ReadsPublishDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  article: PrimalArticle | undefined,
  articleData: ArticleEdit | undefined,
  onPublish: (promote: boolean) => void,
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
          {/* <ArticlePreviewPublish
            article={props.article!}
            hideContext={true}
            hideFooter={true}
          /> */}
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
            Publish
          </ButtonPrimary>
        </div>
      </div>
    </Dialog>
  );
}

export default ReadsPublishDialog;
