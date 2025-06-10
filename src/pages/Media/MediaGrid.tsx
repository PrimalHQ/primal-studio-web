import { Component, For, Match, Show, Switch } from 'solid-js';

import styles from './Media.module.scss';
import { blossomStore } from './Media.data';
import { shortDate } from 'src/utils/date';
import dayjs from 'dayjs'
import NoteContextTrigger from 'src/components/NoteContextMenu/NoteContextTrigger';
import { BlobDescriptor } from 'blossom-client-sdk';
import { fileSize } from 'src/utils/ui';

const MediaGrid: Component<{
  ref?: HTMLDivElement | undefined,
  items: BlobDescriptor[],
  visibleItems: string[],
}> = (props) => {

  const isNewMonth = (blob: BlobDescriptor, index: number) => {
    const lastBlobTime = props.items[index - 1]?.uploaded || 0;

    const lbDate = dayjs.unix(lastBlobTime);
    const date = dayjs.unix(blob.uploaded);

    const isNew =
      (blossomStore.sort === 'latest' || blossomStore.sort === 'oldest') &&
      (date.month() !== lbDate.month() || date.year() !== lbDate.year());

    return isNew;
  }

  return (
    <div
      class={styles.mediaListGrid}
      ref={props.ref}
    >
      <For each={props.items}>
        {(blob, index) => {

          let contextMenu: HTMLDivElement | undefined;

          return (
            <>
              <Show when={isNewMonth(blob, index())}>
                <div class={styles.monthCaption}>
                  {dayjs.unix(blob.uploaded).format('MMMM YYYY')}
                </div>
              </Show>
              <div
                data-id={blob.sha256}
                class={styles.item}
              >
                <Switch>
                  <Match when={props.visibleItems.find(sha => sha === blob.sha256) && blob.type?.includes('image/')}>
                    <img
                      src={blob.url}
                      title={shortDate(blob.uploaded)}
                    />
                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{blob.type?.split('/')[1]}</div>
                      <div class={styles.mediaContext}>
                        <NoteContextTrigger
                          ref={contextMenu}
                          onClick={() => {}}
                          collapsed={true}
                        />
                      </div>
                    </div>
                  </Match>
                  <Match when={props.visibleItems.find(sha => sha === blob.sha256) && blob.type?.includes('video/')}>
                    <video
                      src={blob.url}
                      title={shortDate(blob.uploaded)}
                      width={177}
                      height={149}
                      controls
                    >
                    </video>
                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{blob.type?.split('/')[1]}</div>
                      <div class={styles.mediaContext}>
                        <NoteContextTrigger
                          ref={contextMenu}
                          onClick={() => {}}
                          collapsed={true}
                        />
                      </div>
                    </div>
                  </Match>
                  <Match when={props.visibleItems.find(sha => sha === blob.sha256)}>
                    <div class={styles.missingFile}>{blob.type || blob.url}</div>

                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{blob.type?.split('/')[1]}</div>
                      <div class={styles.mediaContext}>
                        <NoteContextTrigger
                          ref={contextMenu}
                          onClick={() => {}}
                          collapsed={true}
                        />
                      </div>
                    </div>
                  </Match>
                </Switch>
              </div>
            </>
          )
        }}
      </For>
    </div>
  );
}

export default MediaGrid;
