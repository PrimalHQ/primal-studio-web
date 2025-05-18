import { Component, Show } from 'solid-js';
import styles from './ThemeChooser.module.scss';

import check from 'assets/icons/check.svg';
import { PrimalTheme } from 'src/primal';

import logoFire from 'assets/icons/logo_fire.svg';
import logoIce from 'assets/icons/logo_ice.svg';


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
    sunrise: logoFire,
    sunset: logoFire,
    midnight: logoIce,
    ice: logoIce,
  }

  const isDark = () => ['sunset', 'midnight'].includes(props.theme);

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
        <p>{props.theme}</p>
      </div>
  );
}

export default ThemeOption;
