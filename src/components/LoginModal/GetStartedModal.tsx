import { Component, createEffect, createSignal, Show } from 'solid-js';

import styles from './LoginModal.module.scss';
import { nip46, SimplePool } from 'src/utils/nTools';
import { doAfterLogin, setLoginType, setPublicKey } from 'src/stores/AccountStore';

import QrCode from 'components/QrCode/QrCode';
import { generateAppKeys, generateClientConnectionUrl, getAppSK, storeBunker } from 'src/utils/primalNip46';
import { logWarning } from 'src/utils/logger';
import { login } from './LoginModal';
import { appStore, updateAppStore } from 'src/stores/AppStore';
import Dialog from '../Dialogs/Dialog';


const GetStartedModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const [clientUrl, setClientUrl] = createSignal('');

  let bunkerInput: HTMLInputElement | undefined;

  let pool: SimplePool | undefined;
  let signer: nip46.BunkerSigner | undefined;

  createEffect(() => {
    if (!props.open) {
      signer = undefined;
    }
  });

  createEffect(() => {
    if (!props.open) return;

    setupSigner();
    setTimeout(() => {
      bunkerInput?.focus();
    }, 100);
  });

  const setupSigner = async () => {
    try {
      generateAppKeys();
      const cUrl = generateClientConnectionUrl();

      if (cUrl.length === 0) return;

      setClientUrl(cUrl);

      const sec = getAppSK();

      if (!sec) return;

      if (!signer) {
        pool = new SimplePool();
        signer = await nip46.BunkerSigner.fromURI(sec, cUrl, { pool });
      }

      storeBunker(signer);
      const pk = await signer.getPublicKey();

      setLoginType('nip46');
      setPublicKey(pk);
      doAfterLogin(pk);

      props.onAbort && props.onAbort();
    } catch (reason) {
      logWarning('Failed to setup signer: ', reason)
    }
  }

  return (
    <Dialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
      title={
        <div class={styles.gstitle}>
          {login.title.defaultMessage}
        </div>
      }
      triggerClass={styles.hidden}
      noPadding={true}
    >
      <div id={props.id} class={styles.gsModal}>
        <div class={styles.getStartedDialog}>
          <div class={`${styles.img} ${appStore.theme === 'light' ? styles.ssLight : styles.ssDark}`}></div>
          <div class={styles.simpleDesc}>
            <div class={styles.loginExplain}>
              The simplest way to login:
            </div>
            <div class={styles.loginList}>
              <div class={styles.loginListItem}>
                <div class={styles.number}>1</div>
                <div class={styles.itemLabel}>
                  Open your Primal mobile app
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>2</div>
                <div class={styles.itemLabel}>
                  Select “Remote Login” from the side menu
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>3</div>
                <div class={styles.itemLabel}>
                  Scan the code below:
                </div>
              </div>
            </div>

            <div class={styles.qrCode}
              onClick={() => {
                navigator.clipboard.writeText(clientUrl());
              }}
            >
              <Show when={clientUrl().length > 0}>
                <div class={styles.actualQr}>
                  <QrCode
                    data={clientUrl()}
                    width={200}
                    height={200}
                    ecl="H"
                  />
                </div>
              </Show>
            </div>

            <div class={styles.footer}>
              <div class={styles.newToPrimal}>
                <div>New to Primal?</div>
                <button onClick={() => {
                props.onAbort && props.onAbort();
                updateAppStore('showCreateAccountModal', true);
              }}>Create account</button>
              </div>

              <button onClick={() => {
                props.onAbort && props.onAbort();
                updateAppStore('showLoginModal', true);
              }}>Advanced login options</button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default GetStartedModal;
