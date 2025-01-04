import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Notifications: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Notifications header</Wormhole>
    <Wormhole to="sidebar">Notifications Sidebar</Wormhole>
    <h1>{translate('notifications', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Notifications Footer</Wormhole>
    </>
  );
}

export default Notifications;
