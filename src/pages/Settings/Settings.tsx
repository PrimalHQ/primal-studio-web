import { Component, createEffect, JSXElement } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Settings.module.scss';
import Menu from './Menu';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import { useLocation } from '@solidjs/router';

const Settings: Component<{ children?: JSXElement }> = (props) => {

  const loc = useLocation();

  const subTitle = () => {
    const keys = loc.pathname.split('/');

    return translate('settings.menu', keys[keys.length-1]);
  }

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

      </div>
    </div>
  );
}

export default Settings;
