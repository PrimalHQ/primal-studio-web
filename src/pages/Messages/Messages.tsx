import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Messages: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Messages header</Wormhole>
    <Wormhole to="sidebar">Messages Sidebar</Wormhole>
    <h1>{translate('messages', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Messages Footer</Wormhole>
    </>
  );
}

export default Messages;
