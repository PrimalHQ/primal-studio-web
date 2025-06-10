import { Component, createEffect, For, Match, onCleanup, Show, Switch } from 'solid-js';

import styles from './Media.module.scss';
import { blossomStore, deleteMedia } from './Media.data';
import { shortDate } from 'src/utils/date';
import dayjs from 'dayjs'
import NoteContextTrigger from 'src/components/NoteContextMenu/NoteContextTrigger';
import { BlobDescriptor } from 'blossom-client-sdk';
import { fileSize } from 'src/utils/ui';
import { createStore } from 'solid-js/store';
import { openMediaContextMenu } from 'src/stores/AppStore';
import { useToastContext } from 'src/context/ToastContext/ToastContext';

import missingImage from 'assets/images/missing_image.svg';


const MediaGrid: Component<{
  items: BlobDescriptor[],
}> = (props) => {
  const toast = useToastContext();

  const [visibleItems, setVisibleItems] = createStore<string[]>([]);

  let containerRef: HTMLDivElement | undefined;

  // Create intersection observer
  const observer = new IntersectionObserver(
    (entries) => {
      let visible = [ ...visibleItems ];

      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-id');
        if (!id) return;

        if (entry.isIntersecting) {
          visible.push(id);
        } else {
          visible = visible.filter(i => i !== id);
        }
      });

      setVisibleItems(() => [...visible]);
    },
  );

  onCleanup(() => {
    observer?.disconnect();
  });

  createEffect(() => {
    if (!containerRef) return;

    const bls = props.items;

    setTimeout(() => {
      for(let i=0; i< bls.length; i++) {
        const id = bls[i].sha256;
        const el = containerRef.querySelector(`[data-id="${id}"]`);
        el && observer.observe(el);
      }

    }, 100)
  });

  const isNewMonth = (blob: BlobDescriptor, index: number) => {
    const lastBlobTime = props.items[index - 1]?.uploaded || 0;

    const lbDate = dayjs.unix(lastBlobTime);
    const date = dayjs.unix(blob.uploaded);

    const isNew =
      (blossomStore.sort === 'latest' || blossomStore.sort === 'oldest') &&
      (date.month() !== lbDate.month() || date.year() !== lbDate.year());

    return isNew;
  }

  const onImgError = async (event: any) => {
    const image = event.target;

    image.onerror = "";
    image.src = missingImage;
    return true;
  };

  const onContextMenuTrigger = (
    blob: BlobDescriptor,
    contextMenu: HTMLDivElement | undefined,
  ) => {
    openMediaContextMenu(
      blob,
      contextMenu?.getBoundingClientRect(),
      () => {},
      async () => {
        const isDeleted = await deleteMedia(blob.sha256);

        if (isDeleted) {
          toast?.sendSuccess('File deleted')
        }
        else {
          toast?.sendWarning('Failed to delete file')
        }
      },
    );
  };

  return (
    <div
      class={styles.mediaListGrid}
      ref={containerRef}
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
                  <Match when={visibleItems.find(sha => sha === blob.sha256) && blob.type?.includes('image/')}>
                    <img
                      src={blob.url}
                      title={shortDate(blob.uploaded)}
                      onerror={onImgError}
                    />
                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{blob.type?.split('/')[1]}</div>
                      <div class={styles.mediaContext}>
                        <NoteContextTrigger
                          ref={contextMenu}
                          onClick={(e: MouseEvent) => {
                            console.log('CLICK: ', blob.sha256)
                            onContextMenuTrigger(blob, contextMenu);
                          }}
                          collapsed={true}
                        />
                      </div>
                    </div>
                  </Match>
                  <Match when={visibleItems.find(sha => sha === blob.sha256) && blob.type?.includes('video/')}>
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
                          onClick={() => {
                            onContextMenuTrigger(blob, contextMenu);
                          }}
                          collapsed={true}
                        />
                      </div>
                    </div>
                  </Match>
                  <Match when={visibleItems.find(sha => sha === blob.sha256)}>
                    <div class={styles.missingFile}>{blob.type || blob.url}</div>

                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{blob.type?.split('/')[1]}</div>
                      <div class={styles.mediaContext}>
                        <NoteContextTrigger
                          ref={contextMenu}
                          onClick={() => {
                            onContextMenuTrigger(blob, contextMenu);
                          }}
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
