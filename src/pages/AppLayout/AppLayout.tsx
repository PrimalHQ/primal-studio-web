import { A, RouteSectionProps, useLocation, useNavigate, } from '@solidjs/router';
import { Component, createEffect, Match, onMount, Show, Switch } from 'solid-js';

import primalBrandingLight from 'assets/images/primal_studio_light.svg';
import primalBrandingDark from 'assets/images/primal_studio_dark.svg';

import styles from './AppLayout.module.scss';
import ProfileWidget from 'src/components/ProfileWidget/ProfileWidget';
import { settingsStore } from 'src/stores/SettingsStore';
import NoteContextMenu from 'src/components/NoteContextMenu/NoteContexMenu';
import { appStore, closeNoteContextMenu, openEditNote, updateAppStore } from 'src/stores/AppStore';
import { uploadFile } from 'src/utils/upload';
import { addMedia } from '../Media/Media.data';
import { setGlobalNavigate } from 'src/App';

const AppLayout: Component<RouteSectionProps> = (props) => {

  const location = useLocation();
  const navigate = useNavigate();

  let mediaUploadInput: HTMLInputElement | undefined;

  createEffect(() => {
    // Initialize the global navigator
    setGlobalNavigate(() => navigate);
  })

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
            <Match when={['/media'].includes(location.pathname)}>
              <input
                id="upload-new-media"
                type="file"
                ref={mediaUploadInput}
                onChange={(e) => {
                  if (!mediaUploadInput) return;

                  const file = mediaUploadInput.files ?
                    mediaUploadInput.files[0] :
                    null;

                  if (!file) return;
                  uploadFile(file, {
                    onSuccsess: (blob) => {
                      addMedia(blob);
                    },
                    onCancel: () => {
                      mediaUploadInput.value = '';
                    }
                  });
                }}
                hidden={true}
                accept="image/*,video/*,audio/*"
              />
              <button
                onClick={() => {
                  mediaUploadInput?.click();
                }}
                class={styles.editorButton}
              >
                Upload File
              </button>
            </Match>
          </Switch>

          <footer>
            <ProfileWidget />
          </footer>
        </div>
      </aside>

      <main>
        <header id="header" class={['/media'].includes(location.pathname) ? styles.borderedHeader : ''}></header>

        <section class={styles.central}>
          {props.children}
        </section>

      </main>

    </div>
  );
}

export default AppLayout;
