import { createStore, unwrap } from "solid-js/store";
import { NostrEventContent, NostrWindow, PrimalTheme } from "../primal";
import { logError, logInfo } from "../utils/logger";
import { readPubkeyFromStorage, readSecFromStorage, readStoredProfile, readSystemDarkMode, readTheme, storeChooserTheme, storeSystemDarkMode, storeTheme } from "../utils/localStore";
import { Kind, pinEncodePrefix } from "../constants";

import { getPublicKey, nip19 } from "../utils/nTools";
import { getPublicKey as getNostrPublicKey } from "../utils/nostrApi";
import { handleSubscription } from "src/utils/socket";
import { getUserProfiles } from "src/primal_api/profile";
import { APP_ID } from "src/App";
import { getDefaultSettings, getSettings, isValidTheme, sendSettings } from "src/primal_api/settings";
import { runColorMode } from "src/utils/ui";
import { accountStore } from "./AccountStore";
import { createEffect } from "solid-js";

export const PRIMAL_PUBKEY = '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';


export type SettingsStore = {
  theme: PrimalTheme,
  chooserTheme: PrimalTheme,
  useSystemTheme: boolean,
  settingsObject: any,
  defaultSettingsObject: any,
}

export const [settingsStore, updateSettingsStore] = createStore<SettingsStore>({
  useSystemTheme: false,
  theme: 'sunrise',
  chooserTheme: 'sunrise',
  settingsObject: {},
  defaultSettingsObject: {},
});


createEffect(() => {
  const html: HTMLElement | null = document.querySelector('html');
  html?.setAttribute('data-theme', settingsStore.theme);
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

  handleSubscription(
    subId,
    () => getDefaultSettings(subId),
    (content) => {
      if (!content) return;

      const settings = JSON.parse(content.content || '{}');

      updateSettingsStore('defaultSettingsObject', () => ({ ...settings }));
    }
  )
};

export const loadStoredSettings = () => {
  const pubkey = readPubkeyFromStorage();

  if (!pubkey) return;


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
  const settingsHomeSubId = `load_home_settings_${APP_ID}`;
  const settingsReadsSubId = `load_reads_settings_${APP_ID}`;
  const settingsNWCSubId = `load_nwc_settings_${APP_ID}`;


  handleSubscription(
    settingsSubId,
    () => getSettings(pubkey, settingsSubId),
    (content) => {
      if (!content) return;

      const settings = JSON.parse(content.content || '{}');

      updateSettingsStore('settingsObject',   () => ({ ...settings }));

      setTheme(settings.theme);

      resolveDarkMode(settingsStore.useSystemTheme, settingsStore.theme);
    }
  )

  // getRecomendedBlossomServers();
}

export const resolveTheme = () => {
  const storedTheme = (localStorage.getItem('theme') || 'sunrise') as PrimalTheme;
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
    if (['sunrise', 'sunset'].includes(currentTheme)) {
      setTheme(isDark ? 'sunset' : 'sunrise', true);
    } else {
      setTheme(isDark ? 'midnight' : 'ice', true);
    }
  }, () => {
    currentTheme && setTheme(currentTheme, true);
  });

};

export const saveSettings = () => {

  let settings = unwrap(settingsStore.settingsObject);

  settings.theme = settingsStore.theme;

  const subId = `save_settings_${APP_ID}`;

  handleSubscription(
    subId,
    () => sendSettings(settings, subId),
  );
}
