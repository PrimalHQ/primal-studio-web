import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Bookmarks: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Bookmarks header</Wormhole>
    <Wormhole to="sidebar">Bookmarks Sidebar</Wormhole>
    <h1>{translate('bookmarks', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Bookmarks Footer</Wormhole>
    </>
  );
}

export default Bookmarks;
