import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Downloads: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Downloads header</Wormhole>
    <Wormhole to="sidebar">Downloads Sidebar</Wormhole>
    <h1>{translate('downloads', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Downloads Footer</Wormhole>
    </>
  );
}

export default Downloads;
