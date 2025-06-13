import { useIntl } from '@cookbook/solid-intl';
import { Component, createSignal } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';


const ReadsPublishSuccessDialog: Component<{
  id?: string,
  open: boolean,
  onClose: (v: boolean) => void,
}> = (props) => {

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.onClose}
      title="Success!"
    >
      <div class={styles.readsPublishSuccessDialog}>
        <div class={styles.successCard}>
          <div class={styles.successIcon}></div>
          <div class={styles.successDesc}>
            Your article has been successfully published
          </div>
        </div>

        <div class={styles.actions}>

          <ButtonPrimary
            onClick={() => props.onClose(false)}
          >
            Done
          </ButtonPrimary>
       </div>
      </div>
    </Dialog>
  );
}

export default ReadsPublishSuccessDialog;
