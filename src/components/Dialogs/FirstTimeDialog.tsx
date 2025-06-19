import { Component, Show } from 'solid-js';

import styles from './Dialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Dialog from './Dialog';
import { translate } from 'src/translations/translate';


const FirstTimeDialog: Component<{
  id?: string,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  freeTrial?: boolean,
}> = (props) => {

  return (
    <Dialog
      open={props.open}
      setOpen={props.setOpen}
      title={
        <div class={styles.confirmDialogTitle}>
          Welcome to Primal Studio
        </div>
      }
      triggerClass={'displayNone'}
    >
      <div id={props.id} class={styles.confirmDialog}>

        <div
          class={styles.confirmDialogDescription}
        >
          <Show
            when={props.freeTrial}
            fallback={
              <div>
                As a Primal Legend user, you already have a license to use Primal Studio. All product features are enabled for you. Enjoy! 🤙💜
              </div>
            }
          >
            <div>
              Your 30-day free trial starts today and will end on June 15, 2025. All product features are enabled for you during the free trial period.
            </div>
          </Show>
        </div>
        <div class={`${styles.confirmDialogActions} ${styles.rightAlign}`}>
            <ButtonPrimary
              onClick={() => {
                props.setOpen && props.setOpen(false);
              }}
            >
              Cool, Let’s Go!
            </ButtonPrimary>
        </div>
      </div>
    </Dialog>
  );
}

export default FirstTimeDialog;
