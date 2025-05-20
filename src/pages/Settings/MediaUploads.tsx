import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from 'src/components/ThemeChooser/ThemeChooser';
import CheckBox from 'src/components/CheckBox/CheckBox';
import { resolveDarkMode, settingsStore } from 'src/stores/SettingsStore';
import { translate } from 'src/translations/translate';
import { accountStore, addBlossomServers, appendBlossomServers, primalBlossom, removeBlossomMirrors, removeBlossomServers } from 'src/stores/AccountStore';
import { createStore } from 'solid-js/store';
import { checkBlossomServer } from 'src/utils/blossom';
import { logError } from 'src/utils/logger';
import ButtonLink from 'src/components/Buttons/ButtonLink';
import ConfirmDialog from 'src/components/Dialogs/ConfirmDialog';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';

const MediaUploads: Component = () => {

  let switchSeverInput: HTMLInputElement | undefined;
  let addMirrorInput: HTMLInputElement | undefined;

  const [invalidServerUrl, setInvalidServerUrl] = createSignal(false);
  const [hasMirrors, setHasMirrors] = createSignal(false);
  const [confirmNoMirrors, setConfirmNoMirrors] = createSignal(false);

  const [serverAvailability, setServerAvailability] = createStore<Record<string, boolean>>({});

  createEffect(on(() => accountStore.blossomServers, (bServers) => {
    if (!bServers || hasMirrors()) return;

    const list = bServers.slice(1) || [];
    setHasMirrors(() => list.length > 0);
  }))

  createEffect(on(() => accountStore.blossomServers, (bServers) => {
    // Check server availability
    if (!bServers) return;

    checkServers(bServers);
  }))

  const checkServers = (servers: string[]) => {
    for (let i = 0; i < servers.length;i++) {
      const url = servers[i];
      checkBlossomServer(url).then(available => setServerAvailability(() => ({ [url]: available })));
    }
  }

  const onSwitchServerInput = () => {
    if (!switchSeverInput || switchSeverInput.value === '') {
      return;
    }

    try {
      const url = new URL(switchSeverInput.value);
      if (!url.origin.startsWith('https://')) {
        throw(new Error('must be a https'))
      }

      switchSeverInput.value = '';
      addBlossomServers(url.href);
      setInvalidServerUrl(false);
    } catch (e) {
      logError('invalid caching service input', e);
      setInvalidServerUrl(true);
    }
  }

  const onAddMirrorInput = () => {
      if (!addMirrorInput || addMirrorInput.value === '') {
        return;
      }

      try {
        const url = new URL(addMirrorInput.value);
        if (!url.origin.startsWith('https://')) {
          throw(new Error('must be a https'))
        }

        addMirrorInput.value = '';
        appendBlossomServers(url.href);
        setInvalidServerUrl(false);
      } catch (e) {
        logError('invalid caching service input', e);
        setInvalidServerUrl(true);
      }
    }

  const mirrorServers = () => {
    return accountStore.blossomServers.slice(1) || [];
  }

  const reommendedMirrors = () => {
    const activeMirrors = accountStore.blossomServers || [];

    const recomended =  (accountStore.recomendedBlossomServers || []).filter(s => !activeMirrors.includes(s));

    checkServers(recomended);

    return recomended;
  };

  return (
    <div class={styles.mediaUploadsPage}>

      <div class={styles.settingsSection}>

        <div class={`${styles.bigCaption}`}>
          {translate('settings.uploads', 'mediaServer')}
        </div>

        <div class={`${styles.label} ${styles.blossomMainServer}`}>
          <Show
            when={accountStore.blossomServers[0] || primalBlossom}
            fallback={<div class={styles.suspended}></div>}
          >
            <div class={styles.connected}></div>
          </Show>
          {accountStore.blossomServers[0] || primalBlossom}
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {translate('settings.uploads', 'switchServer')}
        </div>

        <div
          class={styles.relayInput}
        >
          <div class={styles.webIcon}></div>
          <input
            ref={switchSeverInput}
            type="text"
            placeholder={translate('settings.uploads', 'blossomServerUrl')}
            onChange={() => onSwitchServerInput()}
          />
          <button onClick={() => onSwitchServerInput()}>
            <div class={styles.connectIcon}></div>
          </button>
        </div>

        <Show when={invalidServerUrl()}>
          <div class={styles.invalidInput}>
            {translate('settings.network', 'invalidRelayUrl')}
          </div>
        </Show>

        <div style="height: 20px"></div>

        <ButtonLink
          onClick={() => addBlossomServers(primalBlossom)}
        >
          {translate('settings.uploads', 'restoreBlossomServer')}
        </ButtonLink>

        <div style="height: 20px"></div>

        <div class={`${styles.bigCaption}`}>
          {translate('settings.uploads', 'mediaMirrors')}
        </div>

        <CheckBox
          id={'toggleMirror'}
          onChange={() => {
            if (mirrorServers().length > 0) {
              setConfirmNoMirrors(true);
              return;
            }

            setHasMirrors(v => !v);
          }}
          checked={hasMirrors()}
          label="Enable media mirrors"
        />

        <div class={styles.settingsDescription}>
          {translate('settings.uploads', 'mediaMirrorsDescription')}
        </div>

        <Show when={hasMirrors()}>
          <For each={mirrorServers()}>
            {mirror => (
              <div class={styles.mirrorServer}>
                <div class={styles.label}>
                  <Show
                    when={serverAvailability[mirror]}
                    fallback={<div class={styles.suspended}></div>}
                  >
                    <div class={styles.connected}></div>
                  </Show>
                  {mirror}
                </div>
                <div class={styles.actions}>
                  <ButtonSecondary
                    onClick={() => addBlossomServers(mirror)}
                    shrink={true}
                  >
                    set as media server
                  </ButtonSecondary>
                  <ButtonSecondary
                    onClick={() => removeBlossomServers(mirror)}
                    shrink={true}
                  >
                    remove
                  </ButtonSecondary>
                </div>
              </div>
            )}
          </For>

          <div style="height: 20px"></div>

          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
              {translate('settings.uploads', 'addMirror')}
          </div>

          <div
            class={styles.relayInput}
          >
            <div class={styles.webIcon}></div>
            <input
              ref={addMirrorInput}
              type="text"
              placeholder={translate('settings.uploads', 'blossomServerUrl')}
              onChange={() => onAddMirrorInput()}
            />

            <button onClick={() => onAddMirrorInput()}>
              <div class={styles.connectIcon}></div>
            </button>
          </div>

          <div style="height: 20px"></div>

          <div class={`${styles.settingsCaptionDarker} ${styles.secondCaption}`}>
            {translate('settings.uploads', 'suggestedMirrors')}
          </div>

          <For each={reommendedMirrors()}>
            {mirror => (
              <div class={styles.mirrorServer}>
                <div class={styles.label}>
                  <Show
                    when={serverAvailability[mirror]}
                    fallback={<div class={styles.suspended}></div>}
                  >
                    <div class={styles.connected}></div>
                  </Show>
                  {mirror}
                </div>
                <div class={styles.actions}>
                  <ButtonSecondary
                    onClick={() => appendBlossomServers(mirror)}
                    shrink={true}
                  >
                    add this media mirror server
                  </ButtonSecondary>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      <ConfirmDialog
        open={confirmNoMirrors()}
        title="Remove Media Mirrors?"
        description="Are you sure? This will remove your mirror media servers."
        confirmLabel="Yes"
        abortLabel="No"
        onConfirm={() => {
          removeBlossomMirrors(() => {
            setHasMirrors(false);
          });
          setConfirmNoMirrors(false);
        }}
        onAbort={() => setConfirmNoMirrors(false)}
      />
    </div>
  )
}

export default MediaUploads;
