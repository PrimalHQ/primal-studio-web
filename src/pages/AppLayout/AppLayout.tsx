import { A, RouteSectionProps, } from '@solidjs/router';
import { Component } from 'solid-js';

import primalBranding from 'assets/images/branding.svg';

import styles from './AppLayout.module.scss';
import ProfileWidget from 'src/components/ProfileWidget/ProfileWidget';

const AppLayout: Component<RouteSectionProps> = (props) => {

  return (
    <div class={styles.layout}>
      <aside class={styles.left}>
        <div class={styles.fixed}>
          <section id="branding" class={styles.branding}>
            <img src={primalBranding} />
          </section>

          <nav>
            <A
              class={styles.navItem}
              href="/"
              activeClass={styles.active}
              end
            >
              <div class={`${styles.homeIcon} ${styles.icon}`}></div>
              <div class={styles.label}>Home</div>
            </A>
            <A
              class={styles.navItem}
              href="/notes"
              activeClass={styles.active}
              end
            >
              <div class={`${styles.notesIcon} ${styles.icon}`}></div>
              <div class={styles.label}>Notes</div>
            </A>
            <A
              class={styles.navItem}
              href="/articles"
              activeClass={styles.active}
              end
            >
              <div class={`${styles.articlesIcon} ${styles.icon}`}></div>
              <div class={styles.label}>Articles</div>
              </A>
            <A
              class={styles.navItem}
              href="/media"
              activeClass={styles.active}
              end
            >
              <div class={`${styles.mediaIcon} ${styles.icon}`}></div>
              <div class={styles.label}>Media Files</div>
            </A>
            <A
              class={styles.navItem}
              href="/account"
              activeClass={styles.active}
              end
            >
              <div class={`${styles.accountIcon} ${styles.icon}`}></div>
              <div class={styles.label}>Account</div>
            </A>
            <A
              class={styles.navItem}
              href="/settings"
              activeClass={styles.active}
              end
            >
              <div class={`${styles.settingsIcon} ${styles.icon}`}></div>
              <div class={styles.label}>Settings</div>
            </A>
          </nav>

          <footer>
            <ProfileWidget />
          </footer>
        </div>
      </aside>

      <main>
        <header id="header"></header>

        <section class={styles.central}>
          {props.children}
        </section>

        <footer id="footer"></footer>
      </main>
    </div>
  );
}

export default AppLayout;
