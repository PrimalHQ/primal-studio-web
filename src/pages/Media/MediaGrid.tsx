import { Component, createEffect, For, Match, onCleanup, Show, Switch } from 'solid-js';

import styles from './Media.module.scss';
import { blossomStore, deleteMedia, toggleMediaSelect } from './Media.data';
import { shortDate } from 'src/utils/date';
import dayjs from 'dayjs'
import NoteContextTrigger from 'src/components/NoteContextMenu/NoteContextTrigger';
import { BlobDescriptor } from 'blossom-client-sdk';
import { fileSize, humanizeFileType } from 'src/utils/ui';
import { createStore } from 'solid-js/store';
import { openMediaContextMenu } from 'src/stores/AppStore';
import { useToastContext } from 'src/context/ToastContext/ToastContext';

import missingImage from 'assets/images/missing_image.svg';
import { cancelUpload, uploadStore } from 'src/utils/upload';
import { Progress } from '@kobalte/core/progress';

import stylesUploader from 'src/components/Uploader/Uploader.module.scss';

const MediaGrid: Component<{
  items: BlobDescriptor[],
}> = (props) => {
  const toast = useToastContext();

  const [visibleItems, setVisibleItems] = createStore<string[]>([]);

  let containerRef: HTMLDivElement | undefined;

  const items = () => {
    const uploads: BlobDescriptor[] = uploadStore.uploadOrder.map(u => {
      const upload = uploadStore.uploads[u];
      return {
        uploaded: dayjs().unix(),
        type: 'upload',
        sha256: upload?.id || '',
        size: upload.file?.size || 0,
        url: upload.file?.name || 'file',
      };
    });

    return [ ...uploads, ...props.items ];
  }

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

    const bls = items();

    setTimeout(() => {
      for(let i=0; i< bls.length; i++) {
        const id = bls[i].sha256;
        const el = containerRef.querySelector(`[data-id="${id}"]`);
        el && observer.observe(el);
      }

    }, 100)
  });

  const isNewMonth = (blob: BlobDescriptor, index: number) => {
    const lastBlobTime = items()[index - 1]?.uploaded || 0;

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
      () => {
        deleteMedia(blob.sha256).then(isDeleted => {
          toast?.sendSuccess(isDeleted ? 'File deleted' : 'Failed to delete file');
        });
      },
    );
  };

  const itemClass = (sha: string) => {
    let k = styles.item;

    if (blossomStore.selectedMedia.includes(sha)) {
      k += ` ${styles.selected}`;
    }

    if (!visibleItems.find(s => s === sha)) {
      k += ` ${styles.hidden}`;
    }

    return k;
  }

  return (
    <div
      class={styles.mediaListGrid}
      ref={containerRef}
    >
      <For each={items()}>
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
                class={itemClass(blob.sha256)}
                onClick={() => {
                  toggleMediaSelect(blob);
                }}
              >
                <Switch>
                  <Match when={blob.type === 'upload'}>
                    <div
                      class={styles.cancelUpload}
                      onClick={() => {
                        cancelUpload(blob.sha256);
                        toast?.sendInfo('Upload canceled')
                      }}
                    >
                      <div class={styles.closeIcon}></div>
                    </div>
                    <div class={`${styles.itemFooter} ${styles.progress}`}>
                      <Progress
                        value={uploadStore.uploads[blob.sha256]?.progress || 0}
                        class={stylesUploader.uploadProgress}
                      >
                        <div class={stylesUploader.progressTrackContainer}>
                          <Progress.Track class={stylesUploader.progressTrack}>
                            <Progress.Fill
                              class={`${stylesUploader.progressFill}`}
                            />
                          </Progress.Track>
                        </div>
                      </Progress>
                    </div>
                  </Match>
                  <Match when={blob.type?.includes('image/')}>
                    <img
                      src={blob.url}
                      title={shortDate(blob.uploaded)}
                      onerror={onImgError}
                    />
                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{humanizeFileType(blob.type)}</div>
                      <div class={styles.mediaContext}>
                        <NoteContextTrigger
                          ref={contextMenu}
                          onClick={(e: MouseEvent) => {
                            onContextMenuTrigger(blob, contextMenu);
                          }}
                          collapsed={true}
                        />
                      </div>
                    </div>
                  </Match>
                  <Match when={blob.type?.includes('video/')}>
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
                      <div class={styles.mediaType}>{humanizeFileType(blob.type)}</div>
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
                  <Match when={true}>
                    <div class={styles.missingFile}>{blob.type || blob.url}</div>

                    <div class={styles.itemFooter}>
                      <div class={styles.mediaSize}>{fileSize(blob.size)}</div>
                      <div class={styles.mediaType}>{humanizeFileType(blob.type)}</div>
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
