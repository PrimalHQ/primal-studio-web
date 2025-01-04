import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Notifications: Component = () => {

  return (
    <>
    <Wormhole to="header">Notifications header</Wormhole>
    <Wormhole to="sidebar">Notifications Sidebar</Wormhole>
    <h1>{translate('notifications', 'title')}</h1>

    <Wormhole to="footer">Notifications Footer</Wormhole>
    </>
  );
}

export default Notifications;
