import { Component, For, createEffect, createSignal, on } from 'solid-js';

import styles from './ThemeChooser.module.scss';
import ThemeOption from './ThemeOption';
import { THEMES } from '../../constants';
import { PrimalTheme } from 'src/primal';
import { chooseTheme, settingsStore } from 'src/stores/SettingsStore';

const ThemeChooser: Component<{ id?: string }> = (props) => {

  const [checkedTheme, setCheckedTheme] = createSignal<PrimalTheme>(settingsStore.theme || 'studio_light');

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
