import { Component, createEffect, For, Match, onCleanup, Show, Switch } from 'solid-js';

import styles from './Media.module.scss';
import { blossomStore, deleteMedia, toggleMediaSelect } from './Media.data';
import { shortDate } from 'src/utils/date';
import dayjs from 'dayjs'
import NoteContextTrigger from 'src/components/NoteContextMenu/NoteContextTrigger';
import { BlobDescriptor } from 'blossom-client-sdk';
import { fileSize } from 'src/utils/ui';
import CheckBox from 'src/components/CheckBox/CheckBox';
import { createStore } from 'solid-js/store';
import { openMediaContextMenu } from 'src/stores/AppStore';
import { useToastContext } from 'src/context/ToastContext/ToastContext';

import missingImage from 'assets/images/missing_image.svg';


const MediaList: Component<{
  items: BlobDescriptor[],
}> = (props) => {
  const toast = useToastContext();

  const [visibleItems, setVisibleItems] = createStore<string[]>([]);

  let containerRef: HTMLTableElement | undefined;

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

  const shortSha = (sha: string) => sha.slice(0, 28);

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
    <table
      class={styles.mediaList}
      ref={containerRef}
    >
      <thead>
        <tr>
          <th>
            <CheckBox
              onChange={() => {
              }}
              checked={false}
            />
          </th>
          <th>File</th>
          <th>Type</th>
          <th>Size</th>
          <th>Date/time</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <For each={props.items}>
          {(blob) => {

            let contextMenu: HTMLDivElement | undefined;

            return (
              <tr
                data-id={blob.sha256}
                class={`${styles.item} ${blossomStore.selectedMedia.includes(blob.sha256) ? styles.selected : ''}`}
              >
                <Switch fallback={
                  <>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </>
                }>
                  <Match when={visibleItems.find(sha => sha === blob.sha256) && blob.type?.includes('image/')}>
                    <td>
                      <CheckBox
                        onChange={() => {
                          toggleMediaSelect(blob);
                        }}
                        checked={blossomStore.selectedMedia.includes(blob.sha256)}
                      />
                    </td>
                    <td class={styles.file}>
                      <div>
                        <img
                          src={blob.url}
                          title={shortDate(blob.uploaded)}
                          onerror={onImgError}
                        />
                        <div>{shortSha(blob.sha256)}</div>
                      </div>
                    </td>
                    <td class={styles.type}>{blob.type || ''}</td>
                    <td class={styles.size}>{fileSize(blob.size)}</td>
                    <td class={styles.date}>{dayjs.unix(blob.uploaded).format('MMM DD, YYYY, hh:mm A')}</td>
                    <td class={styles.context}>
                      <NoteContextTrigger
                        ref={contextMenu}
                        onClick={() => {
                          onContextMenuTrigger(blob, contextMenu);
                        }}
                        collapsed={true}
                      />
                    </td>
                  </Match>
                  <Match when={visibleItems.find(sha => sha === blob.sha256) && blob.type?.includes('video/')}>
                   <td>
                      <CheckBox
                        onChange={() => {
                          toggleMediaSelect(blob);
                        }}
                        checked={blossomStore.selectedMedia.includes(blob.sha256)}
                      />
                    </td>
                    <td class={styles.file}>
                      <div>
                        <video
                          src={blob.url}
                          title={shortDate(blob.uploaded)}
                          width={177}
                          height={149}
                          controls
                        >
                        </video>
                        <div>{shortSha(blob.sha256)}</div>
                      </div>
                    </td>
                    <td class={styles.type}>{blob.type || ''}</td>
                    <td class={styles.size}>{fileSize(blob.size)}</td>
                    <td class={styles.date}>{dayjs.unix(blob.uploaded).format('MMM DD, YYYY, hh:mm A')}</td>
                    <td class={styles.context}>
                      <NoteContextTrigger
                        ref={contextMenu}
                        onClick={() => {
                          onContextMenuTrigger(blob, contextMenu);
                        }}
                        collapsed={true}
                      />
                    </td>
                  </Match>
                  <Match when={visibleItems.find(sha => sha === blob.sha256)}>
                    <td>
                      <CheckBox
                        onChange={() => {
                          toggleMediaSelect(blob);
                        }}
                        checked={blossomStore.selectedMedia.includes(blob.sha256)}
                      />
                    </td>
                    <td class={styles.file}>
                      <div>{shortSha(blob.sha256)}</div>
                    </td>
                    <td class={styles.type}>{blob.type || ''}</td>
                    <td class={styles.size}>{fileSize(blob.size)}</td>
                    <td class={styles.date}>{dayjs.unix(blob.uploaded).format('MMM DD, YYYY, hh:mm A')}</td>
                    <td class={styles.context}>
                      <NoteContextTrigger
                        ref={contextMenu}
                        onClick={() => {
                          onContextMenuTrigger(blob, contextMenu);
                        }}
                        collapsed={true}
                      />
                    </td>
                  </Match>
                </Switch>
              </tr>
            )
          }}
        </For>
      </tbody>
    </table>
  );
}

export default MediaList;
