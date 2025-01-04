import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Premium: Component = () => {
  const account = useAccountContext();

  return (
    <>
    <Wormhole to="header">Premium header</Wormhole>
    <Wormhole to="sidebar">Premium Sidebar</Wormhole>
    <h1>{translate('premium', 'title')}</h1>
    <h2>{account?.pubkey}</h2>

    <Wormhole to="footer">Premium Footer</Wormhole>
    </>
  );
}

export default Premium;
