import { Component, onMount } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';
import { accountStore } from '../../stores/AccountStore';

const Explore: Component = () => {
  onMount(() => {
    const h2 = document.querySelector('h2');

    if (!h2) return;

    h2.innerHTML = '<a href="/">Home</a>';
  })

  return (
    <>
    <Wormhole to="header">Explore header</Wormhole>
    <Wormhole to="sidebar">Explore Sidebar</Wormhole>
    <h1>{translate('explore', 'title')}</h1>
    <h2>{accountStore.pubkey}</h2>

    <Wormhole to="footer">Explore Footer</Wormhole>
    </>
  );
}

export default Explore;
