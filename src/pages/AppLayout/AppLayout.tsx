import { A, RouteSectionProps, useLocation, } from '@solidjs/router';
import { Component, Match, Show, Switch } from 'solid-js';

import primalBrandingLight from 'assets/images/primal_studio_light.svg';
import primalBrandingDark from 'assets/images/primal_studio_dark.svg';

import styles from './AppLayout.module.scss';
import ProfileWidget from 'src/components/ProfileWidget/ProfileWidget';
import { settingsStore } from 'src/stores/SettingsStore';
import NoteContextMenu from 'src/components/NoteContextMenu/NoteContexMenu';
import { appStore, closeNoteContextMenu, openEditNote, updateAppStore } from 'src/stores/AppStore';

const AppLayout: Component<RouteSectionProps> = (props) => {

  const location = useLocation();

  return (
    <div class={styles.layout}>
      <aside class={styles.left}>
        <div class={styles.fixed}>
          <section id="branding" class={styles.branding}>
            <Show
              when={['studio_light'].includes(settingsStore.theme)}
              fallback={<img src={primalBrandingDark} />}
            >
              <img src={primalBrandingLight} />
            </Show>
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

          <Switch>
            <Match when={['/articles', '/edit/article'].includes(location.pathname)}>
              <a
                href="/edit/article"
                class={styles.editorButton}
              >
                New Article
              </a>
            </Match>
            <Match when={['/notes'].includes(location.pathname)}>
              <button
                onClick={() => openEditNote()}
                class={styles.editorButton}
              >
                New Note
              </button>
            </Match>
          </Switch>

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

      </main>

    </div>
  );
}

export default AppLayout;
