import { createStore, unwrap } from "solid-js/store";
import { NostrEventContent, NostrWindow, PrimalTheme, PrimalUser } from "../primal";
import { logError, logInfo } from "../utils/logger";
import { readProxyThroughPrimal, readPubkeyFromStorage, readSecFromStorage, readStoredProfile, readSystemDarkMode, readTheme, storeChooserTheme, storeSystemDarkMode, storeTheme } from "../utils/localStore";
import { Kind, pinEncodePrefix } from "../constants";

import { getPublicKey, nip19 } from "../utils/nTools";
import { getPublicKey as getNostrPublicKey } from "../utils/nostrApi";
import { primalAPI } from "src/utils/socket";
import { getUserMetadata } from "src/primal_api/profile";
import { APP_ID } from "src/App";
import { getDefaultSettings, getSettings, isValidTheme, sendSettings } from "src/primal_api/settings";
import { runColorMode } from "src/utils/ui";
import { accountStore } from "./AccountStore";
import { createEffect } from "solid-js";
import { setProxyThroughPrimal } from "./RelayStore";
import { getSettingsList } from "src/primal_api/studio";

export const PRIMAL_PUBKEY = '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';
export const PRIMAL_STUDIO = '529f0119a5e6f8bc2aedaf799055f3eda5cfd02b858854e67e4307aba44a3db1';

export type SettingsStore = {
  theme: PrimalTheme,
  chooserTheme: PrimalTheme,
  useSystemTheme: boolean,
  settingsObject: any,
  defaultSettingsObject: any,
  inboxUsers: string[],
  importUrls: {
    notes: string[],
    articles: string[],
  }
}

export const [settingsStore, updateSettingsStore] = createStore<SettingsStore>({
  useSystemTheme: false,
  theme: 'studio_light',
  chooserTheme: 'studio_light',
  settingsObject: {},
  defaultSettingsObject: {},
  inboxUsers: [PRIMAL_STUDIO],
  importUrls: {
    notes: [],
    articles: [],
  }
});

export const chooseTheme = (theme: PrimalTheme) => {
  updateSettingsStore('chooserTheme', theme);
  updateSettingsStore('useSystemTheme', false);

  storeSystemDarkMode(accountStore.pubkey, false);
  storeChooserTheme(accountStore.pubkey, theme);

  setTheme(theme);
}


export const setTheme = (theme: PrimalTheme, temp?: boolean) => {
  const forced = localStorage.getItem('forceTheme');

  if (forced && isValidTheme(forced)) {
    updateSettingsStore('theme', () => forced);
    return;
  }

  if (!theme) {
    return;
  }

  updateSettingsStore('theme', () => theme);

  if (!temp) {
    storeTheme(accountStore.pubkey, theme);

    saveSettings();
  }
}

export const loadDefaults = () => {
  const subId = `load_defaults_${APP_ID}`;

  primalAPI({
    subId,
    action: () => getDefaultSettings(subId),
    onEvent: (content) => {
      if (!content) return;

      const settings = JSON.parse(content.content || '{}');

      updateSettingsStore('defaultSettingsObject', () => ({ ...settings }));
    },
  });
};

export const loadStoredSettings = () => {
  const pubkey = readPubkeyFromStorage();

  if (!pubkey) return;

  const shouldProxy = readProxyThroughPrimal(pubkey);
  setProxyThroughPrimal(shouldProxy, true);

  const theme = readTheme(pubkey);
  const useSystemDarkMode = readSystemDarkMode(pubkey);


  updateSettingsStore('theme', () => theme);

  resolveDarkMode(useSystemDarkMode, theme);
};

export const loadSettings = (pubkey: string | undefined, then?: () => void) => {

  if (!pubkey) {
    return;
  }

  const settingsSubId = `load_settings_${APP_ID}`;

  primalAPI( {
    subId: settingsSubId,
    action: () => getSettings(pubkey, settingsSubId),
    onEvent: (content) => {
      if (!content) return;

      const settings = JSON.parse(content.content || '{}');

      updateSettingsStore('settingsObject',   () => ({ ...settings }));

      setTheme(settings.studio_theme || 'studio_light', true);

      setProxyThroughPrimal(settings.proxyThroughPrimal || false, true);

      resolveDarkMode(settingsStore.useSystemTheme, settingsStore.theme);
    },
  })

  // getRecomendedBlossomServers();
}

export const loadInboxPermissionSettings = async (then?: () => void) => {

  const list = await getSettingsList('inbox_permissions');

  updateSettingsStore(
    'inboxUsers',
    () => [
      ...list.reduce<string[]>((acc, i) =>
        i.pubkey ? [...acc, i.pubkey] : acc ,[]
      )
    ],
  );
}

export const loadContentImportSettings = async (then?: () => void) => {
  const urls = await getSettingsList('content_imports');

  let results = urls.reduce<Record<'notes' | 'articles', string[]>>(
    (acc, url) => {
      if (!url.kind || !url.rss_feed_url) return acc;

      acc[url.kind].push(url.rss_feed_url);

      return { ...acc };
    },
    { notes: [], articles: [] },
  );


  updateSettingsStore('importUrls', () => ({ ...results }));
}

export const resolveTheme = () => {
  const storedTheme = (localStorage.getItem('theme') || 'studio_light') as PrimalTheme;
  const pubkey = localStorage.getItem('pubkey') || undefined;
  const useSystemDarkMode = readSystemDarkMode(pubkey);

  updateSettingsStore('useSystemTheme', () => useSystemDarkMode || false);

  resolveDarkMode(useSystemDarkMode, storedTheme);

};

export const resolveDarkMode = (useSystemDarkMode: boolean, currentTheme = settingsStore.theme) => {

  updateSettingsStore('chooserTheme', currentTheme);
  updateSettingsStore('useSystemTheme', () => useSystemDarkMode);

  storeSystemDarkMode(accountStore.pubkey, useSystemDarkMode);

  if (!useSystemDarkMode) {
    setTheme(currentTheme, true);
    return;
  }

  runColorMode((isDark) => {
    setTheme(isDark ? 'studio_dark' : 'studio_light', true);
  }, () => {
    currentTheme && setTheme(currentTheme, true);
  });

};

export const saveSettings = (setts?: Record<string, any>) => {

  let settings = unwrap(settingsStore.settingsObject);

  settings.studio_theme = settingsStore.theme;

  if (setts) {
    settings = {
      ...settings,
      ...setts,
    };
  }

  const subId = `save_settings_${APP_ID}`;

  primalAPI( {
    subId,
    action: () => sendSettings(settings, subId),
  });
}
