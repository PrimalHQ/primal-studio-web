import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Settings: Component = () => {

  return (
    <>
    <Wormhole to="header">Settings header</Wormhole>
    <Wormhole to="sidebar">Settings Sidebar</Wormhole>
    <h1>{translate('settings', 'title')}</h1>

    <Wormhole to="footer">Settings Footer</Wormhole>
    </>
  );
}

export default Settings;
