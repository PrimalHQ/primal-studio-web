import { Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';

import styles from './Media.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';
import { userName } from 'src/utils/profile';
import { urlUsage } from './Media.data';
import ArticlePreview from 'src/components/Event/ArticlePreview';
import NotePreview from 'src/components/Event/NotePreview';


const MediaUsesDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  url?: string,
}> = (props) => {

  const usage = createMemo(() => urlUsage(props.url));

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title="Media usage in Notes and Articles"
    >
      <div class={styles.mediaUsesDialog}>
        <Show when={usage().profiles.length > 0}>
          <div class={styles.useSection}>
            <div class={styles.usageSectionCaption}>Profiles</div>
            <For each={usage().profiles}>
              {profile => <div>{userName(profile.pubkey)}</div>}
            </For>
          </div>
        </Show>
        <Show when={usage().articles.length > 0}>
          <div class={styles.useSection}>
            <div class={styles.usageSectionCaption}>Articles</div>
            <For each={usage().articles}>
              {article =>
                <div class={styles.usageItem}>
                  <ArticlePreview
                    article={article}
                    onClick={(article) => window.open(`https://primal.net/a/${article.nId}`)}
                  />
                </div>
              }
            </For>
          </div>
        </Show>
        <Show when={usage().notes.length > 0}>
          <div class={styles.useSection}>
            <div class={styles.usageSectionCaption}>Notes</div>
            <For each={usage().notes}>
              {note =>
                <div class={styles.usageItem}>
                  <NotePreview
                    id={note.id}
                    note={note}
                    onClick={(note) => window.open(`https://primal.net/e/${note.nIdShort}`)}
                  />
                </div>
              }
            </For>
          </div>
        </Show>
      </div>
    </Dialog>
  );
}

export default MediaUsesDialog;
