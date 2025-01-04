import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Settings: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Settings header</Wormhole>
    <Wormhole to="sidebar">Settings Sidebar</Wormhole>
    <h1>{translate('settings', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Settings Footer</Wormhole>
    </>
  );
}

export default Settings;
