import { Component, createEffect, createSignal, on, Show } from 'solid-js';

import styles from './Landing.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';

import brandingDark from 'src/assets/images/primal_studio_dark.svg';
import brandingLight from 'src/assets/images/primal_studio_light.svg';

import { isPhone } from 'src/utils/ui';
import { globalNavigate } from 'src/App';

const GetStartedDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
}> = (props) => {
  const [branding, setBranding] = createSignal(brandingDark);

  createEffect(() => {
    if (!props.open) return;

    const html: HTMLElement | null = document.querySelector('html');
    const theme = html?.getAttribute('data-theme');

    const brand = theme === 'studio_dark' ? brandingDark : brandingLight;

    setBranding(brand);
  })

  createEffect(on(() => props.open, (open, prev) => {

    console.log('open: ', open, prev)
    if (prev=== undefined || open || open === prev) return;
    console.log('open2: ', open, prev)

    const navigate = globalNavigate();

    if (isPhone()) {
      if (window.location.pathname === '/') return;
      navigate?.('/') || window.open('/', '_self');
      return;
    }

    navigate?.('/home');
  }));

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title={<img src={branding()} width={140} height={34} />}
    >
      <Show
        when={!isPhone()}
        fallback={
          <div class={styles.getStartedDialog}>
            <div class={styles.message}>
              <p>To use Primal Studio, you need to be on a computer.</p>
            </div>
            <div class={styles.actions}>
              <div class={styles.newToNostr}>
              </div>
              <button onClick={() => props.setOpen?.(false)}>OK</button>
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
            <button onClick={() => props.setOpen?.(false)}>I am Ready, Let’s Go!</button>
          </div>
        </div>
      </Show>
    </Dialog>
  );
}

export default GetStartedDialog;
