import { Component, createSignal, For, Match, Show, Switch } from 'solid-js';
import styles from './Settings.module.scss';

import { addRelay, relayStore, removeRelay, resetToDefaultRelays, setProxyThroughPrimal, updateRelayStore } from 'src/stores/RelayStore';
import { translate } from 'src/translations/translate';
import HelpTip from 'src/components/HelpTip/HelpTip';
import { isConnected, socket } from 'src/utils/socket';
import { changeCachingService } from 'src/stores/AppStore';
import { logError } from 'src/utils/logger';
import ButtonLink from 'src/components/Buttons/ButtonLink';
import { Relay } from 'src/utils/nTools';
import ConfirmDialog from 'src/components/Dialogs/ConfirmDialog';
import CheckBox from 'src/components/CheckBox/CheckBox';

const Network: Component = () => {

  let cachingServiceInput: HTMLInputElement | undefined;
  let customRelayInput: HTMLInputElement | undefined;

  const [invalidCachingService, setInvalidCachingService] = createSignal(false);
  const [invalidCustomRelay, setInvalidCustomRelay] = createSignal(false);
  const [confirmRemoveRelay, setConfirmRemoveRelay] = createSignal('');

  const isRelayConnected = (relay: Relay) => {
    return relayStore.connected.find(r => r.url === relay.url) !== undefined;
  }

  const onCachingServiceInput = () => {
    if (!cachingServiceInput || cachingServiceInput.value === '') {
      return;
    }

    try {
      const url = new URL(cachingServiceInput.value);
      if (!url.origin.startsWith('wss://') && !url.origin.startsWith('ws://')) {
        throw(new Error('must be a wss'))
      }

      cachingServiceInput.value = '';
      changeCachingService(url.href);

      setInvalidCachingService(false);
    } catch (e) {
      logError('invalid caching service input', e);
      setInvalidCachingService(true);
    }
  }


  const onCustomRelayInput = () => {
    if (!customRelayInput || customRelayInput.value === '') {
      return;
    }

    try {
      const value = customRelayInput.value;
      const url = new URL(value);
      if (!url.origin.startsWith('wss://') && !url.origin.startsWith('ws://')) {
        throw(new Error('must be a wss'))
      }

      customRelayInput.value = '';
      addRelay(value);
      setInvalidCustomRelay(false);
    } catch (e) {
      logError('invalid relay input ', e);
      setInvalidCustomRelay(true);
    }
  }


  const onRemoveRelay = (url: string) => {
    const relay = relayStore.all.find(r => r.url === url);
    if (relay) {
      removeRelay(relay);
    }
  };


  const isPrimalRelayInUserSettings = () => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];
    const con = relayStore.all.map(r => r.url);

    return rels.every(url => con.includes(url));
  }

  return (
    <div class={styles.networkPage}>
      <div class={styles.settingsSection}>
        <div class={`${styles.bigCaption}`}>
          {translate('settings', 'network', 'cachingService')}
        </div>

        <div class={styles.settingsCaption}>
          <div>
            {translate('settings', 'network', 'connectedCachingService')}
          </div>
          <HelpTip>
            <span>{translate('settings', 'network', 'cahingPoolHelp')}</span>
          </HelpTip>
        </div>

        <div class={`${styles.relayItem} ${styles.noHover}`}>
          <div class={styles.relayEntry}>
            <Show
              when={isConnected()}
              fallback={<div class={styles.disconnected}></div>}
            >
              <div class={styles.connected}></div>
            </Show>
            <div class={styles.webIcon}></div>
            <span>
              {socket()?.url}
            </span>
          </div>
        </div>
      </div>

      <div class={styles.settingsSection}>
        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {translate('settings', 'network', 'alternativeCachingService')}
        </div>

        <div
          class={styles.settingsInput}
        >
          <div class={styles.webIcon}></div>
          <input
            ref={cachingServiceInput}
            type="text"
            placeholder={translate('settings', 'network', 'cachingServiceUrl')}
            onChange={() => onCachingServiceInput()}
          />
          <button onClick={() => onCachingServiceInput()}>
            <div class={styles.connectIcon}></div>
          </button>
        </div>

        <Show when={invalidCachingService()}>
          <div class={styles.invalidInput}>
            {translate('settings', 'network', 'invalidRelayUrl')}
          </div>
        </Show>

        <div style="height: 20px;"></div>

        <ButtonLink
          onClick={() => changeCachingService()}
        >
          {translate('settings', 'network', 'restoreCachingService')}
        </ButtonLink>
      </div>


      <div class={styles.settingsSection}>
        <div class={styles.bigCaption}>
          {translate('settings', 'network', 'relays')}
        </div>

        <div class={styles.settingsCaption}>
          {translate('settings', 'network', 'myRelays')}
        </div>

        <Show
          when={relayStore.all.length > 0}
          fallback={
            <div class={styles.settingsContentPaddingOnly}>
              <div class={styles.noMyRelays}>
                {translate('settings', 'network', 'noMyRelays')}
              </div>
            </div>
          }
        >
          <div class={styles.relayList}>
            <For each={relayStore.all}>
              {relay => (
                <button
                  class={`${styles.relayItem} ${styles.extended}`}
                  onClick={() => setConfirmRemoveRelay(relay.url)}
                >
                  <div class={styles.relayEntry}>
                    <Switch fallback={<div class={styles.disconnected}></div>}>
                      <Match when={relayStore.proxyThroughPrimal}>
                        <div class={styles.suspended}></div>
                      </Match>

                      <Match when={isRelayConnected(relay)}>
                        <div class={styles.connected}></div>
                      </Match>
                    </Switch>

                    <div class={styles.webIcon}></div>
                    <span class={styles.relayUrl} title={relay.url}>
                      {relay.url}
                    </span>
                  </div>

                  <div class={styles.remove}>
                    {translate('settings', 'network', 'removeRelay')}
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>

        <div style="height: 20px;"></div>

        <div>
          <Show when={!isPrimalRelayInUserSettings()}>
            <CheckBox
              id="primal_relay_check"
              checked={relayStore.connectToPrimaryRelays}
              onChange={(v) => updateRelayStore('connectToPrimaryRelays', () => v)}
              label={`Post a copy of all content to the Primal relay (${import.meta.env.PRIMAL_PRIORITY_RELAYS})`}
            />
          </Show>
        </div>

        <div class={styles.resetRelays}>
          <ButtonLink onClick={resetToDefaultRelays}>
            {translate('settings', 'network', 'resetRelays')}
          </ButtonLink>
          <HelpTip>
            <span>{translate('settings', 'network', 'resetRelaysHelp')}</span>
          </HelpTip>
        </div>
      </div>


      <div class={styles.settingsSection}>
        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {translate('settings', 'network', 'customRelay')}
        </div>

        <div
          class={styles.settingsInput}
        >
          <div class={styles.webIcon}></div>
          <input
            ref={customRelayInput}
            type="text"
            placeholder={translate('settings', 'network', 'relayUrl')}
            onChange={() => onCustomRelayInput()}
          />
          <button onClick={() => onCustomRelayInput()}>
            <div class={styles.connectIcon}></div>
          </button>
        </div>

        <Show when={invalidCustomRelay()}>
          <div class={styles.invalidInput}>
            {translate('settings', 'network', 'invalidRelayUrl')}
          </div>
        </Show>
      </div>


      <div class={styles.settingsSection}>
        <div class={styles.settingsCaption}>
          <CheckBox
            id='proxyEvents'
            label=""
            onChange={setProxyThroughPrimal}
            checked={relayStore.proxyThroughPrimal}
          />
          <span>{translate('settings', 'network', 'proxyEvents')}</span>
          <HelpTip zIndex={1_000}>
            <span>
              {translate('settings', 'network', 'proxyDescription')}
            </span>
          </HelpTip>
        </div>

        <div class={styles.settingsDescription}>
          {translate('settings', 'network', 'proxyDescription')}
        </div>
      </div>

      <div style="height: 64px"></div>


      <ConfirmDialog
        open={confirmRemoveRelay().length > 0}
        description={translate(
          'settings', 'network',
          'removeRelayConfirm',
          { url: confirmRemoveRelay() },
        )}
        onConfirm={() => {
          onRemoveRelay(confirmRemoveRelay())
          setConfirmRemoveRelay('');
        }}
        onAbort={() => setConfirmRemoveRelay('')}
      />
    </div>
  )
}

export default Network;
