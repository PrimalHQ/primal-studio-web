import { Component, For, Show } from 'solid-js';

import styles from './SettingsSidebar.module.scss';
import { translate } from 'src/translations/translate';
import { relayStore } from 'src/stores/RelayStore';
import { cacheServer, isConnected, socket } from 'src/utils/socket';

const SettingsSidebar: Component<{ id?: string }> = (props) => {

  const connectedRelays = () => relayStore.connected || [];

  const disconnectedRelays = () => {
    const con = relayStore.connected.map(r => r.url);
    return relayStore.all.filter(r => !con.includes(r.url));
  };

  return (
    <div id={props.id}>
      <div class={styles.headingConnectedRelays}>
        <div>
          {translate('settings', 'sidebar', 'relays')}
        </div>
      </div>

      <For each={connectedRelays()}>
        {relay => (
          <div class={styles.relayEntry}>
            <Show
              when={!relayStore.proxyThroughPrimal}
              fallback={<div class={styles.suspended}></div>}
            >
              <div class={styles.connected}></div>
            </Show>
            <span class={styles.relayUrl} title={relay.url}>
              {relay.url}
            </span>
          </div>
        )}
      </For>
      <For each={disconnectedRelays()}>
        {relay => (
          <div class={styles.relayEntry}>
            <Show
              when={!relayStore.proxyThroughPrimal}
              fallback={<div class={styles.suspended}></div>}
            >
              <div class={styles.disconnected}></div>
            </Show>
            <span class={styles.relayUrl} title={`${relay.url}`}>
              {`${relay.url}`}
            </span>
          </div>
        )}
      </For>

      <div class={styles.headingCachingService}>
        <div>
          {translate('settings', 'sidebar', 'cachingService')}
        </div>
      </div>

      <div class={styles.relayEntry}>
        <Show
          when={isConnected()}
          fallback={<div class={styles.disconnected}></div>}
        >
          <div class={styles.connected}></div>
        </Show>
        <span>
          {socket()?.url || cacheServer}
        </span>
      </div>
    </div>
  )
}

export default SettingsSidebar;
