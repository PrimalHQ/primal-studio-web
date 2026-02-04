import { Component } from 'solid-js';

import styles from './LoginModal.module.scss';

import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import Dialog from '../Dialogs/Dialog';

const PrivateAccountModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  return (
    <Dialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
      title={
      <div class={styles.incTitle}>
        Incognito Chat Session
      </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.incModal}>
        <div class={styles.incDesc}>Coming soon.</div>

        <div class={styles.actions}>
          <ButtonPrimary onClick={() => props.onAbort?.()}>Close</ButtonPrimary>
        </div>
      </div>

    </Dialog>
  );
}

export default PrivateAccountModal;
