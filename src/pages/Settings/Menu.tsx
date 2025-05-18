import { Component, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { A } from '@solidjs/router';
import { translate } from '../../translations/translate';
import { accountStore } from 'src/stores/AccountStore';

const Menu: Component = () => {

  const version = import.meta.env.PRIMAL_VERSION;

  return (
    <div>
      <div class={styles.menuLinks}>
        <A href="/settings/appearance">
          {translate('settings.menu', 'appearance')}
          <div class={styles.chevron}></div>
        </A>

        <Show when={accountStore.pubkey}>
          <A href="/settings/uploads">
            {translate('settings.menu', 'upload')}
            <div class={styles.chevron}></div>
          </A>
        </Show>

        <A href="/settings/network">
          {translate('settings.menu', 'network')}
          <div class={styles.chevron}></div>
        </A>
      </div>

      <div class={styles.webVersion}>
        <div class={styles.title}>version</div>
        <div class={styles.value}>{version}</div>
      </div>
    </div>
  )
}

export default Menu;
