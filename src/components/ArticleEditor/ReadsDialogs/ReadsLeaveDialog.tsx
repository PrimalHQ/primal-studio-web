import { Component, createSignal } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';

const ReadsLeaveDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onSave: () => void,
  onReturn: () => void,
  onLeave: () => void,
  title: string,
  description: string,
}> = (props) => {

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title={props.title}
    >
      <div class={styles.leaveDialog}>
        <div class={styles.description}>
          {props.description}
        </div>

        <div class={styles.actions}>
          <ButtonSecondary
            onClick={() => props.onReturn && props.onReturn()}
            light={true}
            shrink={false}
          >
            Continue Editing
          </ButtonSecondary>

          <ButtonSecondary
            onClick={() => props.onLeave && props.onLeave()}
            light={true}
            shrink={false}
          >
            Discard changes
          </ButtonSecondary>

          <ButtonPrimary
            onClick={() => props.onSave && props.onSave()}
          >
            Save Draft
          </ButtonPrimary>
        </div>
      </div>
    </Dialog>
  );
}

export default ReadsLeaveDialog;
