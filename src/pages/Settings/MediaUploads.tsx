import { Component, Show } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from 'src/components/ThemeChooser/ThemeChooser';
import CheckBox from 'src/components/CheckBox/CheckBox';
import { resolveDarkMode, settingsStore } from 'src/stores/SettingsStore';
import { translate } from 'src/translations/translate';

const MediaUploads: Component = () => {

  return (
    <div class={styles.mediaUploadsPage}>

      {/* <div class={`${styles.bigCaption}`}>
        {translate('settings.uploads', 'mediaServer')}
      </div>

      <div class={`${styles.label} ${styles.blossomMainServer}`}>
        <Show
          when={account?.blossomServers[0] || primalBlossom}
          fallback={<div class={styles.suspended}></div>}
        >
          <div class={styles.connected}></div>
        </Show>
        {account?.blossomServers[0] || primalBlossom}
      </div>

      <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.blossomPage.switchServer)}
      </div>

      <div
        class={styles.relayInput}
      >
        <div class={styles.webIcon}></div>
        <input
          ref={switchSeverInput}
          type="text"
          placeholder={intl.formatMessage(tPlaceholders.blossomServerUrl)}
          onChange={() => onSwitchServerInput()}
        />
        <button onClick={() => onSwitchServerInput()}>
          <div class={styles.connectIcon}></div>
        </button>
      </div>

      <Show when={invalidServerUrl()}>
        <div class={styles.invalidInput}>
          {intl.formatMessage(tErrors.invalidRelayUrl)}
        </div>
      </Show>

      <div style="height: 20px"></div>

      <ButtonLink
        onClick={() => account?.actions.addBlossomServers(primalBlossom)}
      >
        {intl.formatMessage(tActions.restoreBlossomServer)}
      </ButtonLink> */}

    </div>
  )
}

export default MediaUploads;
