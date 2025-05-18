import { Component, For, createEffect, createSignal, on, onMount } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import ThemeOption from './ThemeOption';
import { THEMES } from '../../constants';
import { PrimalTheme } from 'src/primal';
import { chooseTheme, setTheme, settingsStore, updateSettingsStore } from 'src/stores/SettingsStore';
import { accountStore } from 'src/stores/AccountStore';
import { readTheme } from 'src/utils/localStore';

const ThemeChooser: Component<{ id?: string }> = (props) => {

  const [checkedTheme, setCheckedTheme] = createSignal<PrimalTheme>(settingsStore.theme);

  createEffect(on(() => settingsStore.chooserTheme, (theme, prev) => {
    if (!theme || theme === prev) return;

    setCheckedTheme(theme);
  }));

  const onSelect = (theme: PrimalTheme) => {
    setCheckedTheme(theme);
    chooseTheme(theme);
  };

  return (
    <div id={props.id} class={styles.themeChooser}>
      <For each={THEMES as PrimalTheme[]}>
        {(theme) => (
          <ThemeOption
            theme={theme}
            isSelected={checkedTheme() === theme}
            onSelect={() => onSelect(theme)}
          />
        )}
      </For>
    </div>
  );
}

export default ThemeChooser;
