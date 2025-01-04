import { Component, onMount } from 'solid-js';
import { useAccountContext } from '../../context/AccountContext';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Home.module.scss';

const Home: Component = () => {
  const account = useAccountContext();

  onMount(() => {
    const h2 = document.querySelector('h2');

    if (!h2) return;

    h2.innerHTML = '<a href="/explore">Explore</a>';
  });

  return (
    <>
      <Wormhole to="header">Home header</Wormhole>
      <Wormhole to="sidebar">Home Sidebar</Wormhole>
      <h1>{translate('home', 'title')}</h1>
      <h2>{account?.pubkey}</h2>

      <Wormhole to="footer">Home Footer</Wormhole>
    </>
  );
}

export default Home;
