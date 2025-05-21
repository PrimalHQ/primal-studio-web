import { createStore } from "solid-js/store";
import { APP_ID } from "src/App";
import { NostrRelaySettings } from "src/primal";
import { getDefaultRelays, getRelays, sendRelays } from "src/primal_api/relays";
import { Relay, utils } from "src/utils/nTools";
import { accountStore } from "./AccountStore";
import { batch } from "solid-js";
import { readRelaySettings, storeProxyThroughPrimal, storeRelaySettings } from "src/utils/localStore";
import { logError, logInfo, logWarning } from "src/utils/logger";
import { saveSettings } from "./SettingsStore";
import { areUrlsSame } from "src/utils/blossom";

export const relayConnectingTimeout = 1_000;
export const relayAtemptLimit = 10;

export type RelayStore = {
  all: Relay[],
  connected: Relay[],
  suspended: Relay[],
  settings: NostrRelaySettings,
  reliability: Record<string, {
    timeout: number,
    attempts: number,
    delay: number,
  }>,
  explicitlyClosed: string[],
  proxyThroughPrimal: boolean,
  connectToPrimaryRelays: boolean,
}

export const [relayStore, updateRelayStore] = createStore<RelayStore>({
  all: [],
  connected: [],
  suspended: [],
  settings: {},
  reliability: {},
  explicitlyClosed: [],
  proxyThroughPrimal: false,
  connectToPrimaryRelays: false,
});


export const updateRelays = async () => {
  const relays = await getRelays(accountStore.pubkey)

  setRelaySettings(relays, true);
};

export const closeRelay = (relay: Relay) => {
  relay.close();

  updateRelayStore(
    'connected',
    (relays: Relay[]) => relays.filter(r => r.url !== relay.url),
  );
}


export const addRelay = async (relayUrl: string) => {
  const url = relayUrl.trim();

  if (relayStore.explicitlyClosed.includes(url)) {
    // Remove relay from the list of explicitly closed relays
    updateRelayStore('explicitlyClosed', (list) => list.filter(u => u !== url));
  }

  // Send Relays
  const relaySettings = await getRelays(
    accountStore.pubkey,
    `before_add_relay_${APP_ID}`
  );

  setRelaySettings({ ...relaySettings, [url]: { write: true, read: true }}, true);

  sendRelays(relayStore.all, relayStore.settings);

};

export const removeRelay = async (relay: Relay) => {
  closeRelay(relay);

  const slashedUrl = relay.url.endsWith('/') ? relay.url : `${relay.url}/`;
  const bareUrl = relay.url.endsWith('/') ? relay.url.slice(0, -1) : relay.url;

  const filterRelays = (relays: Relay[]) => relays.filter(r => !areUrlsSame(r.url, relay.url));

  batch(() => {
    updateRelayStore('all', filterRelays);
    updateRelayStore('suspended', filterRelays);
    updateRelayStore('settings', () => ({
      [slashedUrl]: undefined,
      [bareUrl]: undefined,
    }));
  });

  // Send Relays
  const relaySettings = await getRelays(
    accountStore.pubkey,
    `before_add_relay_${APP_ID}`
  );

  delete relaySettings[slashedUrl];
  delete relaySettings[bareUrl];

  updateRelayStore('settings', () => ({ ...relaySettings }));

  sendRelays(relayStore.all, relayStore.settings);
}

export const suspendRelays = () => {
  if (relayStore.all.length === 0) {
    const urls: string[] = Object.keys(relayStore.settings || {}).map(utils.normalizeURL);
    const suspendedRelays = urls.map(url => new Relay(url));
    updateRelayStore('suspended', () => [ ...suspendedRelays ]);
  }
  else {
    updateRelayStore('suspended', () => [ ...relayStore.all ]);

    for (let i=0; i<relayStore.all.length; i++) {
      const relay = relayStore.all[i];
      relay.close();
    }
  }

  const priorityRelays: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

  for (let i=0; i<priorityRelays.length; i++) {
    const pr = priorityRelays[i];

    if (!relayStore.suspended.find(r => r.url === pr)) {
      updateRelayStore('suspended', updateRelayStore.length, () => new Relay(pr));
    }
  }

  updateRelayStore('connected', () => []);
}

export const reconnectSuspendedRelays = async () => {
  const relaysToConnect = relayStore.suspended.map(r => r.url);

  updateRelayStore('suspended', () => []);

  if (relaysToConnect.length === 0) return;

  await connectToRelays(relaysToConnect);
}

export const setProxyThroughPrimal = async (shouldProxy: boolean, temp?: boolean) => {
  updateRelayStore('proxyThroughPrimal', () => shouldProxy);
  storeProxyThroughPrimal(accountStore.pubkey, shouldProxy);

  if (shouldProxy) {
    suspendRelays();
  }
  else {
    reconnectSuspendedRelays();
  }

  if (!temp) {
    saveSettings({ proxyThroughPrimal: shouldProxy });
  }
}

export const setRelaySettings = (stgns?: NostrRelaySettings, removeMissing?: boolean) => {
  let settings = readRelaySettings(accountStore.pubkey);

  if (stgns) {
    settings = { ...stgns };
  }

  // If there are no relay settings, attach default relays
  if (Object.keys(settings).length === 0) {
    settings = attachPriorityRelays(settings);
  }

  batch(() => {
    updateRelayStore('settings', () => ({ ...settings }));
  })

  // Remove relays that are not in relay setttings
  if (removeMissing) {
    for (let url in relayStore.settings) {
      if (settings[url]) continue;

      updateRelayStore('settings', () => ({[url]: undefined}));

      const relay = relayStore.all.find(r => r.url === url);
      if (relay) {
        removeRelay(relay);
      }
    }
  }

  const rs = relayStore.settings;
  const relayUrls = Object.keys(rs);
  const relays = relayUrls.map(url => new Relay(url));

  storeRelaySettings(accountStore.pubkey, ({ ...rs }));

  updateRelayStore('all', () => [...relays]);

  connectToRelays(relayUrls);
  return;
}

export const attachPriorityRelays = (relaySettings: NostrRelaySettings) => {
  const defaultRelays = getPreConfiguredRelays();

  return { ...relaySettings, ...defaultRelays };
};

export const getPreConfiguredRelays = () => {
  const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

  return rels.reduce(
    (acc: NostrRelaySettings, r: string) =>
      ({ ...acc, [r]: { read: true, write: true } }),
    {},
  );
};

export const resetToDefaultRelays = async () => {
  const subId = `reset_default_relays_${APP_ID}`;

  closeAllRelays();

  const defaultRelays = await getDefaultRelays(subId);

  const defaultSettings = defaultRelays.reduce(
    (acc, url) => ({
      ...acc,
      [url]: { read: 'true', write: 'true', },
    }),
    {})

  setRelaySettings(defaultSettings);

}

export const closeAllRelays = () => {
  const openedRelays = relayStore.connected;

  for (let i=0; i<openedRelays.length; i++) {
    const relay = openedRelays[i];

    // Add relay to explicitly closed list to avoid reconnecting
    if (!relayStore.explicitlyClosed.includes(relay.url)) {
      updateRelayStore(
        'explicitlyClosed',
        relayStore.explicitlyClosed.length,
        () => relay.url,
      );
    }

    relay.close();
  }
}

let att =0;

export const connectToRelays = async (relayUrls: string[]) => {
  // If proxying don't bather with relays
  const proxy = relayStore.proxyThroughPrimal;
  if (proxy) return;

  let urls = [...relayUrls];

  // if list is empty connect to default list of relays
  if (urls.length === 0) {
    const subId = `default_relays_${APP_ID}`;
    att += 1;

    if (att > 3) return;

    const defaultRelays = await getDefaultRelays(subId);

    connectToRelays(defaultRelays);
    return;
  }

  // Add priority relays if the setting is active
  if (relayStore.connectToPrimaryRelays) {
    const ps: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    urls.push.apply(null, [...ps]);
  }

  for (let i = 0; i<urls.length; i++) {
    const url = urls[i];

    if (relayStore.connected.find(r => r.url === url)) continue;

    const relay = new Relay(url);

    connectToRelay(relay);
  }
};

let attempt: Record<string, number> = {};

export const connectToRelay = async (relay: Relay) => {

  if (attempt[relay.url] !== undefined) {
    attempt[relay.url] += 1;
  } else {
    attempt[relay.url] = 1;
  }

  const onConnect = (connectedRelay: Relay) => {

    // if (sendRelayList) {
    //   sendRelays([connectedRelay], relaySettings, store.proxyThroughPrimal);
    // }

    if (relayStore.connected.find(r => r.url === connectedRelay.url)) {
      return;
    }

    // Reset atempts after stable connection
    const timeout = setTimeout(() => {
      updateRelayStore('reliability', () => ({
        [connectedRelay.url]: undefined,
      }));
    }, 3 * relayConnectingTimeout)

    batch(() => {
      updateRelayStore('reliability', connectedRelay.url, () => ({ timeout }));
      updateRelayStore('connected', (cr) => [...cr, connectedRelay]);
    })
  };

  const onFail = (failedRelay: Relay, reasons: any) => {
    logWarning('Connection failed to relay ', failedRelay.url, ' because: ', reasons);

    const reliability = relayStore.reliability[failedRelay.url];

    // connection is unstable, clear reliability timeout
    reliability?.timeout && clearTimeout(reliability.timeout);

    if (relayStore.explicitlyClosed.includes(failedRelay.url)) {
      updateRelayStore(
        'explicitlyClosed',
        (ec) => ec.filter(u => u !== failedRelay.url),
      );
      return;
    }

    if (reasons === 'close') {
      logWarning('Closed by user ', failedRelay.url);
      return;
    }

    if ((reliability?.attempts || 0) >= relayAtemptLimit) {
      logWarning('Reached atempt limit ', failedRelay.url);
      return;
    }

    updateRelayStore('reliability', failedRelay.url, (rel) => ({
      attempts: (rel?.attempts || 0) + 1,
      delay: relayConnectingTimeout * ((rel?.attempts || 0) + 1),
    }))

    // Reconnect with a progressive delay
    setTimeout(() => {
      logInfo(
        'Reconnect to ',
        failedRelay.url,
        ' , try',
        relayStore.reliability[failedRelay.url]?.attempts || 1,
        '/',
        relayAtemptLimit,
      );
      connectToRelay(failedRelay);
    }, relayStore.reliability[failedRelay.url]?.delay || 0);

    return;
  };

  relay.onclose = () => {
    updateRelayStore('connected', (rs) => rs.filter(r => r.url !== relay.url));

    const explicit = relayStore.explicitlyClosed.includes(relay.url);
    onFail(relay, explicit ? 'close' : 'disconnect');
  }

  try {
    logInfo('Connecting relay: ', relay);
    await relay.connect();
    logInfo('Connected to relay: ', relay);
    onConnect(relay);
    return true;
  } catch (e) {
    logError('Failed to initiate connection to relay ', e)
    onFail(relay, 'failed');
    return false;
  }
};
