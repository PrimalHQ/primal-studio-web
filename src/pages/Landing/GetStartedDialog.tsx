import { Component, Show } from 'solid-js';

import styles from './Landing.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';

import branding from 'src/assets/images/primal_studio_dark.svg';
import { useNavigate } from '@solidjs/router';

import { isIPhone, isAndroid } from '@kobalte/utils';

const GetStartedDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
}> = (props) => {
  const navigate = useNavigate();

  const isIOS = () => {
    return isIPhone() || /(iPad|iPhone|iPod)/.test(navigator.userAgent);
  };

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title={<img src={branding} width={140} height={34} />}
    >
      <Show
        when={!isIOS() && !isAndroid()}
        fallback={
          <div class={styles.getStartedDialog}>
            <div class={styles.message}>
              <p>To use Primal Studio, you need to be on a computer.</p>
            </div>
          </div>
        }
      >
        <div class={styles.getStartedDialog}>
          <div class={styles.message}>
            <p>To sign into Primal Studio you need:</p>
            <ul>
              <li>
                An existing Nostr account, and
              </li>
              <li>
                An active Nostr browser extension like <a href="https://github.com/fiatjaf/nos2x " target="_blank">nos2x</a> or <a href="https://getalby.com/products/browser-extension" target="_blank">Alby</a>.
              </li>
            </ul>
          </div>

          <div class={styles.actions}>
            <div class={styles.newToNostr}>
              New to Nostr? <a href="https://primal.net/join" target="_blank">Join now</a>.
            </div>
            <button onClick={() => navigate('/home')}>I am Ready, Let’s Go!</button>
          </div>
        </div>
      </Show>
    </Dialog>
  );
}

export default GetStartedDialog;
