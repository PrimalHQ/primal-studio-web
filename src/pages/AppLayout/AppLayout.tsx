import { A, RouteSectionProps, } from '@solidjs/router';
import { Component } from 'solid-js';

import styles from './AppLayout.module.scss';

const AppLayout: Component<RouteSectionProps> = (props) => {

  return (
    <div class={styles.layout}>
      <aside class={styles.left}>
        <div class={styles.fixed}>
          <section id="branding" class={styles.branding}>Logo</section>

          <nav>
            <A href="/">Home</A>
            <A href="/reads">Reads</A>
            <A href="/explore">Explore</A>
            <A href="/messages">Messages</A>
            <A href="/bookmarks">Bookmarks</A>
            <A href="/notifications">Notifications</A>
            <A href="/downloads">Downloads</A>
            <A href="/premium">Premium</A>
            <A href="/settings">Settings</A>
          </nav>
        </div>
      </aside>

      <main>
        <header id="header"></header>

        <section class={styles.central}>
          {props.children}
        </section>

        <footer id="footer"></footer>
      </main>

      <aside class={styles.right}>
        <div class={styles.fixed}>
          <section id="search" class={styles.search}>Search</section>

          <section id="sidebar" class={styles.sidebar}></section>
        </div>
      </aside>
    </div>
  );
}

export default AppLayout;
