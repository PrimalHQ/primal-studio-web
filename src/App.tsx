import { Component, onCleanup, onMount } from 'solid-js';

import styles from './App.module.scss';
import { AccountProvider } from './context/AccountContext';
import { AppProvider } from './context/AppContext';
import { eventStore } from './stores/EventStore';
import { PrimalWindow } from './primal';
import AppRouter from './Router';
import { connect, disconnect } from './utils/socket';

export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_${version}_${Math.floor(Math.random()*10_000_000_000)}`;
export const LANG = 'en';

const App: Component = () => {

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    disconnect();
  });


  const primalWindow = window as PrimalWindow;

  const isDev = localStorage.getItem('devMode') === 'true';

  primalWindow.eventStore = eventStore;

  return (
    <div class={styles.App}>
      <AppProvider>
        <AccountProvider>
          <AppRouter />
        </AccountProvider>
      </AppProvider>
    </div>
  );
};

export default App;
