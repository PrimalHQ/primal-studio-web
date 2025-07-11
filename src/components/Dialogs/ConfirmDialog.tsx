import { Component, Show } from 'solid-js';

import styles from './Dialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Dialog from './Dialog';
import { translate } from 'src/translations/translate';

export type ConfirmDialogInfo = {
  title?: string,
  description?: string,
  confirmLabel?: string,
  abortLabel?: string
  onConfirm?: () => void,
  onAbort?: () => void,
};

const ConfirmDialog: Component<ConfirmDialogInfo & {
  id?: string,
  open?: boolean,
  setOpen?: (v: boolean) => void,
}> = (props) => {

  const setOpen = (isOpen: boolean) => {
    props.setOpen && props.setOpen(isOpen);

    if (props.onAbort && !isOpen) {
      props.onAbort();
      return;
    }

  }

  return (
    <Dialog
      open={props.open}
      setOpen={setOpen}
      title={
        <div class={styles.confirmDialogTitle}>
          {props.title || translate('defaults', 'confirmDialog', 'title')}
        </div>
      }
      triggerClass={'displayNone'}
    >
      <div id={props.id} class={styles.confirmDialog}>

        <div
          class={styles.confirmDialogDescription}
          innerHTML={props.description || ''}
        >
        </div>
        <div class={styles.confirmDialogActions}>
          <Show when={props.onConfirm}>
            <ButtonPrimary
              onClick={() => {
                props.setOpen && props.setOpen(false);
                props.onConfirm && props.onConfirm();
              }}
            >
              {props.confirmLabel || translate('defaults', 'confirmDialog', 'confirm')}
            </ButtonPrimary>
          </Show>

          <Show when={props.onAbort}>
            <ButtonSecondary
              onClick={() => setOpen(false)}
              light={true}
            >
              {props.abortLabel || translate('defaults', 'confirmDialog', 'abort')}
            </ButtonSecondary>
          </Show>
        </div>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
