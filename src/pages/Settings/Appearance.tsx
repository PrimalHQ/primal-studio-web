import { Component, Show } from 'solid-js';
import styles from './Settings.module.scss';

import ThemeChooser from 'src/components/ThemeChooser/ThemeChooser';
import CheckBox from 'src/components/CheckBox/CheckBox';
import { resolveDarkMode, settingsStore } from 'src/stores/SettingsStore';

const Appearance: Component = () => {

  return (
    <div class={styles.appearancePage}>


      <ThemeChooser />


      <div>
        <CheckBox
          checked={settingsStore.useSystemTheme || false}
          onChange={(isDark) => resolveDarkMode(isDark)}
        >
          <div class={styles.appearanceCheckLabel}>
            Automatically set Dark or Light mode based on your system settings
          </div>
        </CheckBox>
      </div>
    </div>
  )
}

export default Appearance;
