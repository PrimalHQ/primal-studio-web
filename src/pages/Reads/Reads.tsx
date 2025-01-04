import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Reads: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Reads header</Wormhole>
    <Wormhole to="sidebar">Reads Sidebar</Wormhole>
    <h1>{translate('reads', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Reads Footer</Wormhole>
    </>
  );
}

export default Reads;
