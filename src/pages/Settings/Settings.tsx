import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Settings.module.scss';

const Settings: Component = () => {

  return (
    <>
      <h1>{translate('settings', 'title')}</h1>
    </>
  );
}

export default Settings;
