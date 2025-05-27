import { Component, Show } from 'solid-js';
import styles from './ThemeChooser.module.scss';

import check from 'assets/icons/check.svg';
import { PrimalTheme } from 'src/primal';

import logoGold from 'assets/icons/logo_gold.svg';


const ThemeOption: Component<{
  theme: PrimalTheme,
  isSelected: boolean,
  onSelect: (value: PrimalTheme) => void,
  id?: string,
}> = (props) => {

  const selectedClass = () => {
    return props.isSelected ? styles.selected : '';
  };

  const logos = {
    studio_light: logoGold,
    studio_dark: logoGold,
  }

  const isDark = () => ['studio_dark'].includes(props.theme);

  const uncheckedTheme = () => {
    return isDark() ? styles.themeUncheckedDark : styles.themeUncheckedLight;
  }

  return (
      <div id={props.id} class={styles.themeOption}>
        <button
          class={`${styles[props.theme]} ${selectedClass()}`}
          onClick={() => props.onSelect(props.theme)}
        >
          <img src={logos[props.theme]} />
          <Show
            when={props.isSelected}
            fallback={<div class={uncheckedTheme()}></div>}
          >
            <div class={styles.themeChecked}><img src={check} /></div>
          </Show>
        </button>
        <p>{props.theme.replaceAll('_', ' ')}</p>
      </div>
  );
}

export default ThemeOption;
