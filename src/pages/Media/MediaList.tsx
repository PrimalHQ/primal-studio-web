import { Component, createEffect, For, Match, on, onCleanup, Show, Switch } from 'solid-js';

import styles from './Media.module.scss';
import { blossomStore, deleteMedia, fetchUsageInfo, toggleMediaSelect, urlUsage } from './Media.data';
import { shortDate } from 'src/utils/date';
import dayjs from 'dayjs'
import NoteContextTrigger from 'src/components/NoteContextMenu/NoteContextTrigger';
import { BlobDescriptor } from 'blossom-client-sdk';
import { fileSize, humanizeFileType } from 'src/utils/ui';
import CheckBox from 'src/components/CheckBox/CheckBox';
import { createStore } from 'solid-js/store';
import { openMediaContextMenu, profileLink } from 'src/stores/AppStore';
import { useToastContext } from 'src/context/ToastContext/ToastContext';

import missingImage from 'assets/images/missing_image.svg';
import { cancelUpload, uploadStore } from 'src/utils/upload';
import { Progress } from '@kobalte/core/progress';

import stylesUploader from 'src/components/Uploader/Uploader.module.scss';


import missingVideo from '../../assets/icons/missing_video.svg';


const MediaList: Component<{
  server?: string,
  items: BlobDescriptor[],
  onShowUsage?: (url?: string) => void,
}> = (props) => {
  const toast = useToastContext();

  const [visibleItems, setVisibleItems] = createStore<string[]>([]);

  let containerRef: HTMLTableElement | undefined;

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
    {
      rootMargin: '400px 0px 400px 0px',
    }
  );

  createEffect(on(() => [visibleItems.length, blossomStore.server], (change) => {
    const len = change[0];
    const server = change[1];

    if (!len || !server) return;

    const vi = [ ...visibleItems ];

    const storedUrls = blossomStore.usageInfo.urls;

    const urls = (vi as string[]).reduce<string[]>((acc, id) => {
      const blob = blossomStore.media[(server as string)].find(b => b.sha256 === id);
      if (!blob || storedUrls.includes(blob.url)) return acc;

      return [ ...acc, blob.url ];
    }, []);

    if (urls.length === 0) return;

    fetchUsageInfo(urls);
  }));

  // createEffect(() => {
  //   const bls = items();

  //   if (bls.length === 0 || !props.server) return;

  //   const urls = bls.slice(0, 20).map(b => {
  //     return b.url;
  //     // const ext = b.url.split(b.sha256)[1];
  //     // return `${utils.normalizeURL(props.server!)}${b.sha256}`
  //   })

  //   fetchUsageInfo(urls);
  // });

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

  const usesOfMedia = (url: string) => {
    const usage = urlUsage(url);

    const profiles = usage.profiles.map(p => <a class={styles.usageLink} href={`https://primal.net${profileLink(p.pubkey)}`} target='_blank'>Profile</a>);
    const notes = usage.notes.map(n => <a class={styles.usageLink} href={`https://primal.net/e/${n.nIdShort}`} target='_blank'>Note</a>);
    const articles = usage.articles.map(a => <a class={styles.usageLink} href={`https://primal.net/a/${a.nId}`} target='_blank'>Article</a>);

    let more = <></>;

    const list = [ ...profiles, ...notes, ...articles];

    if (list.length > 4) {
      more = <button onClick={() => props.onShowUsage && props.onShowUsage(url)} class={styles.linkButton}>more...</button>
    }

    return <div class={styles.usageList}>{[...list.slice(0, 4), more]}</div>;
  }

  const videoThumbnail = (url: string) => {
    return blossomStore.thumbnails[url];
  }

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
          <th>Uses</th>
          <th>Type</th>
          <th>Size</th>
          <th>Date/time</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <For each={items()}>
          {(blob, index) => {

            let contextMenu: HTMLDivElement | undefined;

            return (
              <tr
                data-id={blob.sha256}
                class={itemClass(blob.sha256)}
              >
                <Switch fallback={
                  <>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </>
                }>
                  <Match when={blob.type === 'upload'}>
                    <td>
                      <CheckBox
                        onChange={() => {}}
                        checked={false}
                      />
                    </td>
                    <td class={styles.file}>
                      <div>
                        <div class={styles.progress}>
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
                        <div>Uploading...</div>
                      </div>
                    </td>
                    <td class={styles.uses}></td>
                    <td class={styles.type}>{humanizeFileType(blob.type || '')}</td>
                    <td class={styles.size}>{fileSize(blob.size)}</td>
                    <td colspan={2} class={styles.cancelUpload}>
                      <button
                        class={styles.linkButton}
                        onClick={() => {
                          cancelUpload(blob.sha256);
                          toast?.sendInfo('Upload canceled')
                        }}
                      >
                        Cancel upload
                      </button>
                    </td>
                  </Match>
                  <Match when={blob.type?.includes('image/')}>
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
                    <td class={styles.uses}>{usesOfMedia(blob.url)}</td>
                    <td class={styles.type}>{humanizeFileType(blob.type || '')}</td>
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
                  <Match when={blob.type?.includes('video/')}>
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
                        <Show
                          when={videoThumbnail(blob.url)}
                          fallback={
                            <img src={missingVideo} class={styles.videoPlaceholder} />
                          }
                        >
                          <img
                            src={videoThumbnail(blob.url)}
                          />
                        </Show>
                        {/* <video
                          src={blob.url}
                          title={shortDate(blob.uploaded)}
                          width={177}
                          height={149}
                          controls
                        >
                        </video> */}
                        <div>{shortSha(blob.sha256)}</div>
                      </div>
                    </td>
                    <td class={styles.uses}>{usesOfMedia(blob.url)}</td>
                    <td class={styles.type}>{humanizeFileType(blob.type || '')}</td>
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
                  <Match when={true}>
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
                    <td class={styles.uses}>{usesOfMedia(blob.url)}</td>
                    <td class={styles.type}>{humanizeFileType(blob.type || '')}</td>
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
