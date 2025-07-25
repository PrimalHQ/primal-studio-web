import { Component, createEffect, JSXElement, onCleanup, onMount } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Settings.module.scss';
import Menu from './Menu';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import { useLocation } from '@solidjs/router';
import SettingsSidebar from './SettingsSidebar/SettingsSidebar';
import StickySidebar from 'src/components/StickySidebar/StickySidebar';

const Settings: Component<{ children?: JSXElement }> = (props) => {

  const loc = useLocation();

  const subTitle = () => {
    const keys = loc.pathname.split('/');

    return translate('settings', 'menu', keys[keys.length-1]);
  }

  onMount(() => {
    const el = document.querySelector('header');

    if (el) el.style = 'display: none';
  });

  onCleanup(() => {
    const el = document.querySelector('header');

    if (el) el.style = '';
  })

  return (
    <div class={styles.settingsLayout}>
      <div class={styles.mainContent}>
        <div class={styles.settingsHeader}>
          <div>
            <HeaderTitle
              title={translate('settings', 'header')}
              subTitle={subTitle()}
            />
          </div>
        </div>

        {props.children}
      </div>

      <div class={styles.sidebar}>
        <StickySidebar noWormhole={true}>
          <SettingsSidebar />
        </StickySidebar>
      </div>
    </div>
  );
}

export default Settings;
