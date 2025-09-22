import { Component, createEffect, createSignal, Show } from 'solid-js';

import styles from './Media.module.scss';
import { blossomStore } from './Media.data';
import { BlobDescriptor } from 'blossom-client-sdk';
import { shortDate } from 'src/utils/date';

const ThumbVideoPlayer: Component<{
  blob: BlobDescriptor,
}> = (props) => {

  let controlsEl: HTMLDivElement | undefined;
  let videoEl: HTMLVideoElement | undefined;
  let containerEl: HTMLDivElement | undefined;
  let seekBar: HTMLInputElement | undefined;

  const videoThumbnail = (url: string) => {
    return blossomStore.thumbnails[url];
  }

  const [paused, setPaused] = createSignal(true);
  const [muted, setMuted] = createSignal(false);

  createEffect(() => {
    if (paused()) {
      videoEl?.pause();
      return;
    }

    videoEl?.play();
  });

  createEffect(() => {
    if (!videoEl) return;

    if (muted()) {
      videoEl.muted = true;
      return;
    }

    videoEl.muted = false;
  });

  return (
    <div
      ref={containerEl}
      class={styles.thumbVideoPlayer}
      onMouseOver={(e) => {
        if (!controlsEl) return;

        if (document.fullscreenElement) {
          return;
        }
        controlsEl.style = 'visibility: visible;';
        // (e.target as HTMLVideoElement).controls = true;
      }}
      onMouseOut={(e) => {
        if (!controlsEl) return;
        if (document.fullscreenElement) {
          return;
        }
        controlsEl.style = 'visibility: hidden;';
        // (e.target as HTMLVideoElement).controls = false;
      }}
      >
      <video
        ref={videoEl}
        src={props.blob.url}
        title={shortDate(props.blob.uploaded)}
        poster={videoThumbnail(props.blob.url)}
        onTimeUpdate={() => {
          if (!seekBar || !videoEl) return;

          const percent = (videoEl.currentTime / videoEl.duration) * 100;
          seekBar.value = `${percent}`;
        }}
      >
      </video>
      <div
        class={styles.videoControls}
        ref={controlsEl}
      >
        <div class={styles.backdrop}></div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            setPaused(p => !p);
          }}
        >
          <Show
            when={paused()}
            fallback={<div class={styles.pauseIcon}></div>}
          >
            <div class={styles.playIcon}></div>
          </Show>
        </button>

        <input
          class={styles.seekBar}
          ref={seekBar}
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={videoEl?.currentTime || 0}
          onInput={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target;
            if (!videoEl || !target) return;

            const time = (parseFloat(target.value) / 100) * videoEl.duration;
            videoEl.currentTime = time;
          }}
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            setMuted(p => !p);
          }}
        >
          <Show
            when={muted()}
            fallback={<div class={styles.muteIcon}></div>}
          >
            <div class={styles.unmuteIcon}></div>
          </Show>
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              // For cross-browser compatibility, consider vendor prefixes if needed
              if (containerEl?.requestFullscreen) {
                containerEl?.requestFullscreen();
                // @ts-ignore
              } else if (containerEl?.webkitRequestFullscreen) { // Safari
                // @ts-ignore
                containerEl?.webkitRequestFullscreen();
                // @ts-ignore
              } else if (containerEl?.mozRequestFullScreen) { // Firefox
                // @ts-ignore
                containerEl?.mozRequestFullScreen();
                // @ts-ignore
              } else if (containerEl?.msRequestFullscreen) { // IE/Edge
                // @ts-ignore
                containerEl?.msRequestFullscreen();
              }
            }
          }}
        >
            <div class={styles.fullscreenIcon}></div>
        </button>
      </div>
    </div>
  );
}

export default ThumbVideoPlayer;
