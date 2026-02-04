import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import styles from './LoginModal.module.scss';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { nip19, nip46, SimplePool } from 'src/utils/nTools';
import { storeSec } from '../../utils/localStore';
import { doAfterLogin, loginUsingExtension, loginUsingLocalNsec, loginUsingNpub, setLoginType, setPublicKey, setSec } from 'src/stores/AccountStore';
import { Tabs } from '@kobalte/core/tabs';

import { appSigner, generateAppKeys, generateClientConnectionUrl, getAppSK, storeBunker } from 'src/utils/primalNip46';
import { logWarning } from 'src/utils/logger';
import { encryptWithPin, setCurrentPin } from 'src/utils/primalNostr';
import Dialog from 'components/Dialogs/Dialog';
import QrCode from 'components/QrCode/QrCode';


export const BUNKER_RESPONSE_TIMEOUT = 8_000;

export const login = {
  title: {
    id: 'login.title',
    defaultMessage: 'Login to Primal.Chat',
    description: 'Login ',
  },
  tabs: {
    simple: {
      id: 'login.tabs.simple',
      defaultMessage: 'Remote Signer',
      description: 'Simple login',
    },
    extension: {
      id: 'login.tabs.extension',
      defaultMessage: 'Browser Extension',
      description: 'Browser Extension',
    },
    nsec: {
      id: 'login.tabs.nsec',
      defaultMessage: 'Nsec Login',
      description: 'Nsec login',
    },
    npub: {
      id: 'login.tabs.npub',
      defaultMessage: 'Npub Login',
      description: 'Npub login',
    },
  },
  description: {
    id: 'login.description',
    defaultMessage: 'Enter your Nostr private key (starting with “nsec”):',
    description: 'Label describing the login proccess',
  },
  invalidNsec: {
    id: 'login.invalidNsec',
    defaultMessage: 'Please enter a valid Nostr private key',
    description: 'Label informing the user of an invalid nsec key',
  },
  getStartedTitle: {
    id: 'login.getStartedTitle',
    defaultMessage: 'Create Account – Download the Primal Mobile App',
    description: 'Get Started action title',
  },
  createNewDescription: {
    id: 'login.createNewDescription',
    defaultMessage: 'It will only take a minute:',
    description: 'Label inviting users to join Nostr',
  },
  getStartedSteps: {
    step_one: {
      id: 'login.account.getStartedSteps.step_one',
      defaultMessage: 'Install the Primal mobile app',
      description: 'First step in getting started',
    },
    step_two: {
      id: 'login.account.getStartedSteps.step_two',
      defaultMessage: 'Create your account within the app ',
      description: 'Second step in getting started',
    },
    step_three: {
      id: 'login.account.getStartedSteps.step_three',
      defaultMessage: 'Go to the login page and scan the QR code',
      description: 'First step in getting started',
    },
  },
};

const LoginModal: Component<{
  id?: string,
  open?: boolean,
  onAbort?: () => void,
}> = (props) => {

  const [step, setStep] = createSignal<'login' | 'pin' | 'none'>('login');
  const [enteredKey, setEnteredKey] = createSignal('');
  const [passwordKey, setPasswordKey] = createSignal('');
  const [enteredNpub, setEnteredNpub] = createSignal('');
  const [showBunkerInput, setShowBunkerInput] = createSignal(false);

  const [clientUrl, setClientUrl] = createSignal('');

  const [activeTab, setActiveTab] = createSignal('extension');
  const [copying, setCopying] = createSignal(false);

  const [isPinInvalid, setPinInvalid] = createSignal(false);

  const [isLoggingInProgress, setIsLoggingInProgress] = createSignal(false);

  let nsecInput: HTMLInputElement | undefined;
  let npubInput: HTMLInputElement | undefined;
  let pinInput: HTMLInputElement | undefined;
  let bunkerInput: HTMLInputElement | undefined;

  const onNsecLogin = async () => {
    const sec = enteredKey();

    if (!isValidNsec()) {
      // toaster?.sendWarning('Invalid nsec. Make sure you entered a valid nsec that starts with "nsec1...')
      return;
    }

    const pin = passwordKey();

    if (pin.length == 0) {
      onStoreSec(sec);
      return;
    }

    if (pin.length < 4) {
      setPinInvalid(true);
      pinInput?.focus();
      return;
    }

    setPinInvalid(false);
    setSec(sec);

    // Encrypt private key
    const enc = await encryptWithPin(pin, sec);

    // Save PIN for the session
    setCurrentPin(pin);

    storeSec(enc);
    loginUsingLocalNsec(sec);
    onAbort();
  };

  const onStoreSec = (sec: string | undefined) => {
    storeSec(sec);
    loginUsingLocalNsec(sec);
    onAbort();
  }

  const onAbort = () => {
    setStep(() => 'login');
    setEnteredKey('');
    props.onAbort && props.onAbort();
  }

  const isValidNsec: () => boolean = () => {
    const key = enteredKey();

    if (key.length === 0) {
      return false;
    }

    if (key.startsWith('nsec')) {
      try {
        const decoded = nip19.decode(key);

        return decoded.type === 'nsec' && decoded.data ? true : false;
      } catch(e) {
        return false;
      }
    }

    return false;
  };

  const isValidNpub: () => boolean = () => {
    const key = enteredNpub();

    if (key.length === 0) {
      return false;
    }

    if (key.startsWith('npub')) {
      try {
        const decoded = nip19.decode(key);

        return decoded.type === 'npub' && decoded.data ? true : false;
      } catch(e) {
        return false;
      }
    }

    return false;
  };

  let pool: SimplePool | undefined;
  let signer: nip46.BunkerSigner | undefined;

  createEffect(() => {
    if (!props.open) {
      signer = undefined;
      setTimeout(() => {
        setActiveTab('extension');
      }, 200);
    }
  });

  createEffect(() => {
    if (!props.open) return;

    if (activeTab() === 'nsec') {
      setTimeout(() => {
        nsecInput?.focus();
      }, 100);
    }

    if (activeTab() === 'npub') {
      setTimeout(() => {
        npubInput?.focus();
      }, 100);
    }

    if (activeTab() === 'simple') {
      setupSigner();
      setTimeout(() => {
        bunkerInput?.focus();
      }, 100);
    }
  });

  const setupSigner = async () => {
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
  }

  const onBunkerLogin = async () => {
    const bunkerUrl = bunkerInput?.value || '';
    const sec = getAppSK();

    try {
      if (!sec) {
        throw new Error('no-app-sec');
      }

      if (!bunkerUrl) {
        throw new Error('no-buker-url');
      };

      const bunkerPointer = await nip46.parseBunkerInput(bunkerUrl);

      if (!bunkerPointer) {
        throw new Error('no-buker-pointer');
      }

      const pool = new SimplePool();

      const signer = nip46.BunkerSigner.fromBunker(sec, bunkerPointer, { pool });

      signer.connect();

      storeBunker(signer);

      if (!appSigner) {
        throw new Error('no-app-signer');
      }

      setIsLoggingInProgress(true);
      const pubkey = await (new Promise<string>((res) => {
        let tO = setTimeout(() => res('unreachable-bunker'), BUNKER_RESPONSE_TIMEOUT);

        appSigner?.getPublicKey().then((pk: string) => {
          clearTimeout(tO);
          res(pk);
        });
      }))

      setIsLoggingInProgress(false);

      if (pubkey === 'unreachable-bunker') {
        throw new Error('unreachable-bunker');
      }

      setLoginType('nip46');
      setPublicKey(pubkey);
      doAfterLogin(pubkey);

      props.onAbort && props.onAbort();
    } catch (e) {
      logWarning('FAILED TO LOGIN: ', e)
      setLoginType('guest');
      // toaster?.sendWarning(`Login failed: ${e}`);
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && isValidNsec()) {
      if (activeTab() === 'simple') {
        onBunkerLogin();
      }
    }
  };

  return (
    <Switch>
      <Match when={step() === 'login'}>
        <Dialog
          open={props.open}
          setOpen={(isOpen: boolean) => !isOpen && props.onAbort && props.onAbort()}
          title={
            <div class={styles.title}>
              {login.title.defaultMessage}
            </div>
          }
          triggerClass={styles.hidden}
          noPadding={true}
        >
          <div id={props.id} class={styles.modal}>
            <Tabs value={activeTab()} onChange={setActiveTab}>
              <Tabs.List class={styles.profileTabs}>
                <Tabs.Trigger class={styles.profileTab} value="extension">
                  {login.tabs.extension.defaultMessage}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="simple">
                  {login.tabs.simple.defaultMessage}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="nsec">
                  {login.tabs.nsec.defaultMessage}
                </Tabs.Trigger>
                <Tabs.Trigger class={styles.profileTab} value="npub">
                  {login.tabs.npub.defaultMessage}
                </Tabs.Trigger>
                <Tabs.Indicator class={styles.profileTabIndicator} />
              </Tabs.List>


              <div class={styles.tabContent}>
                <Tabs.Content value="simple" >
                  <div class={styles.extensionLogin}>
                    <div class={styles.qrCode}>
                      <Show when={clientUrl().length > 0}>
                        <div class={styles.actualQr}>
                          <QrCode
                            data={clientUrl()}
                            width={200}
                            height={200}
                            ecl="H"
                          />
                        </div>
                        <button
                          class={styles.copyNostrConnect}
                          onClick={() => {
                            navigator.clipboard.writeText(clientUrl());
                            setCopying(true);
                            setTimeout(() => setCopying(false), 2_000);
                          }}
                        >
                          <div class={styles.content}>{clientUrl()}</div>
                          <div class={`${styles.copyIcon} ${copying() ? styles.copyDone : ''}`}></div>
                        </button>
                      </Show>
                    </div>
                    <div class={styles.bunkerDesc}>
                      <div class={styles.loginExplain}>
                        Login by scanning the QR code or pasting the connect string into your bunker.
                      </div>
                      <button
                        class={styles.bunkerShow}
                        onClick={() => {
                          setShowBunkerInput(f => !f);
                        }}
                      >
                        Or, enter Bunker URL manually
                      </button>
                      <Show
                        when={showBunkerInput()}
                        fallback={<div class={styles.bunkerInput}></div>}
                      >
                        <div class={styles.bunkerInput}>
                          <input
                            ref={bunkerInput}
                            class={styles.input}
                            type="text"
                            onKeyUp={onKeyUp}
                            onInput={(e) => setEnteredNpub(e.target.value)}
                            placeholder='bunker://...'
                            // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                            // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                            // inputClass={styles.nsecInput}
                          />
                          <ButtonPrimary
                            disabled={isLoggingInProgress()}
                            onClick={() => onBunkerLogin()}
                            loading={isLoggingInProgress()}
                          >
                            Login
                          </ButtonPrimary>
                        </div>
                      </Show>
                    </div>
                  </div>
                </Tabs.Content>
                <Tabs.Content value="extension" >
                  <div class={styles.extensionLogin}>
                    <div class={styles.extensionImage} />
                    <div class={styles.extensionDesc}>
                      <div class={styles.description}>
                        <span>Login using a browser extension like </span>
                        <a href="https://nostrapps.com/nos2x" target='_blank'>nos2x</a> or <a href="https://getalby.com/nostr" target='_blank'>Alby</a>
                      </div>
                      <ButtonPrimary onClick={() => {
                        loginUsingExtension();
                        props.onAbort && props.onAbort();
                      }}>
                        Login Now
                      </ButtonPrimary>
                    </div>
                  </div>
                </Tabs.Content>
                <Tabs.Content value="nsec" >
                  <div class={styles.nsecLogin}>
                    <div class={styles.nsecImage} />
                    <div class={styles.nsecDesc}>
                      <div class={styles.nsecWarning}>
                        <span class={styles.bold}>Warning: </span>
                          This login method is insecure. If you must use a private key to login, we recommend setting a password to encrypt your key.
                      </div>

                      <div class={styles.inputGroup}>
                        <div class={styles.description}>
                          Your Nostr private key (nsec):
                        </div>

                        <input
                          ref={nsecInput}
                          class={styles.input}
                          type="password"
                          onInput={(e) => setEnteredKey(e.target.value)}
                          placeholder='nsec1...'
                          // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                          // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                          // inputClass={styles.nsecInput}
                        />
                      </div>

                      <div class={styles.inputGroup}>
                        <div class={styles.description}>
                           Password to encrypt your key (optional):
                        </div>

                        <div class={styles.inputWrapper}>
                          <input
                            ref={pinInput}
                            class={`${styles.input} ${isPinInvalid() ? styles.invalid : ''}`}
                            type="password"
                            onInput={(e) => {
                              const pin = e.target.value;
                              setPinInvalid(pin.length > 0 && pin.length < 4);
                              setPasswordKey(pin);
                            }}
                            // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                            // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                            // inputClass={styles.nsecInput}
                          />
                          <Show when={isPinInvalid()}>
                            <div class={styles.inputError}>
                              Password too short
                            </div>
                          </Show>
                        </div>
                      </div>

                      <ButtonPrimary onClick={() => {
                        onNsecLogin();
                      }}>
                        Login
                      </ButtonPrimary>
                    </div>
                  </div>
                </Tabs.Content>
                <Tabs.Content value="npub" >
                  <div class={styles.nsecLogin}>
                    <div class={styles.npubImage} />
                    <div class={styles.npubDesc}>
                      <div class={styles.npubWarning}>
                        <span class={styles.bold}>Be aware: </span>
                          Logging in with your public key will allow you to browse Nostr in ready-only mode.
                      </div>
                      <div class={styles.inputGroup}>
                        <div class={styles.description}>
                          Your Nostr public key (npub):
                        </div>
                        <input
                          ref={npubInput}
                          class={styles.input}
                          type="password"
                          onInput={(e) => setEnteredNpub(e.target.value)}
                          placeholder='npub1...'
                          // validationState={enteredKey().length === 0 || isValidNsec() ? 'valid' : 'invalid'}
                          // errorMessage={intl.formatMessage(tLogin.invalidNsec)}
                          // inputClass={styles.nsecInput}
                        />
                      </div>

                      <ButtonPrimary onClick={() => {
                        if (isValidNpub()) {
                          loginUsingNpub(enteredNpub());
                          props.onAbort && props.onAbort();
                        }
                        else {
                          // toaster?.sendWarning('Invalid npub. Make sure you entered a vaild npub that starts with "npub1..."')
                        }
                      }}>
                        Login
                      </ButtonPrimary>
                    </div>
                  </div>
                </Tabs.Content>
              </div>
            </Tabs>
          </div>
        </Dialog>
      </Match>
    </Switch>
  );
}

export default LoginModal;
