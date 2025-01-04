import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Messages: Component = () => {

  return (
    <>
    <Wormhole to="header">Messages header</Wormhole>
    <Wormhole to="sidebar">Messages Sidebar</Wormhole>
    <h1>{translate('messages', 'title')}</h1>

    <Wormhole to="footer">Messages Footer</Wormhole>
    </>
  );
}

export default Messages;
