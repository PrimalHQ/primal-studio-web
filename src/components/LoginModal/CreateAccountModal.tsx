import { Component } from 'solid-js';

import styles from './LoginModal.module.scss';

import { appStoreLink, playstoreLink } from 'src/constants';

import appstoreImg from 'assets/images/appstore_download.svg';
import playstoreImg from 'assets/images/playstore_download.svg';
import QrCode from 'components/QrCode/QrCode';
import { updateAppStore } from 'src/stores/AppStore';
import { login } from './LoginModal';
import Dialog from '../Dialogs/Dialog';

const CreateAccountModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  return (
    <Dialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
      title={
      <div class={styles.caTitle}>
        {login.getStartedTitle.defaultMessage}
      </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.caModal}>
        <div class={styles.infoWrapper}>
            <div class={styles.qrCode}>
              <div class={styles.actualQr}>
                <QrCode
                  data={'https://primal.net/app-download-qr'}
                  width={200}
                  height={200}
                  ecl="H"
                />
              </div>
            </div>
          <div class={styles.loginSteps}>
            <div class={styles.loginExplain}>
              {login.createNewDescription.defaultMessage}
            </div>
            <div class={styles.loginList}>
              <div class={styles.loginListItem}>
                <div class={styles.number}>1</div>
                <div class={styles.itemLabel}>
                  {login.getStartedSteps.step_one.defaultMessage}
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>2</div>
                <div class={styles.itemLabel}>
                  {login.getStartedSteps.step_two.defaultMessage}
                </div>
              </div>

              <div class={styles.loginListItem}>
                <div class={styles.number}>3</div>
                <div class={styles.itemLabel}>
                  <span>Go to the </span>
                  <button
                    onClick={() => {
                      props.onAbort && props.onAbort();
                      updateAppStore('showGettingStartedModal', true);
                    }}
                  >login page</button>
                  <span> and scan the QR code</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class={styles.bellowInfo}>
          <div class={styles.appLinks}>
            <a
              href={appStoreLink}
              target='_blank'
            >
              <img src={appstoreImg} />
            </a>

            <a
              href={playstoreLink}
              target='_blank'
            >
              <img src={playstoreImg} />
            </a>
          </div>

          <div class={styles.loginNow}>
            Already have an account?&nbsp;
            <button onClick={() => {
              props.onAbort && props.onAbort();
              updateAppStore('showGettingStartedModal', true);
            }}>Login now!</button>
          </div>
        </div>
      </div>

    </Dialog>
  );
}

export default CreateAccountModal;
