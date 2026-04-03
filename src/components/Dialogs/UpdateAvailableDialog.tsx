import { Component, Show } from 'solid-js';

import styles from './Dialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { useRegisterSW } from 'virtual:pwa-register/solid';
import { logError, logInfo } from 'src/utils/logger';

const UPDATE_CHECK_INTERVAL = 10 * 60 * 1_000; // every 10 minutes

const UpdateAvailableDialog: Component<{
  id?: string,
}> = (props) => {

  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({

  onRegistered(r) {
    logInfo('SW registered:', (new Date()).toLocaleTimeString(), r);
    setInterval(() => {
      logInfo('CHECK SW AGAIN: ', (new Date()).toLocaleTimeString(), r)
      r?.update()
    }, UPDATE_CHECK_INTERVAL);
  },
  onRegisterError(error) {
    logError('SW registration error:', error);
  },
  onNeedRefresh() {
    logInfo('SW onNeedRefresh fired');
  },
  onOfflineReady() {
    logInfo('SW onOfflineReady fired');
  },
  });

  return (
    <Show
      when={needRefresh() && import.meta.env.PROD}
    >
      <div id={props.id} class={styles.updateAvailable}>
        <div
          class={styles.description}
        >
          A new version of Primal Studio is ready
        </div>
        <button
          onClick={() => {
            // Wait until the NEW service worker has taken control
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              // Cache-bust the reload so the browser doesn't serve stale HTML
              const url = new URL(window.location.href);
              url.searchParams.set('_sw', Date.now().toString());
              window.location.replace(url.toString());
            });

            // Tell the waiting SW to activate — don't auto-reload
            updateServiceWorker(false);
          }}
        >
          Update Now
        </button>
      </div>
    </Show>
  );
}

export default UpdateAvailableDialog;
