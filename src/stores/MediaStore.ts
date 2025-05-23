import { createStore } from "solid-js/store";
import { Kind } from "src/constants";
import { MediaEvent, MediaSize, MediaVariant, NostrEventContent } from "src/primal";

export type MediaStore = {
  media: Record<string, MediaVariant[]>,
  thumbnails: Record<string, string>,
  blossom: Record<string, NostrEventContent>,
}

export const [mediaStore, updateMediaStore] = createStore<MediaStore>({
  media: {},
  thumbnails: {},
  blossom: {},
});

export const addMediaEvent = (ev: NostrEventContent) => {
  if (ev.kind !== Kind.MediaInfo) return;

  const mediaEvent: MediaEvent = JSON.parse(ev.content || '{}');

  let media: Record<string, MediaVariant[]> = {};

  for (let i = 0;i<mediaEvent.resources.length;i++) {
    const resource = mediaEvent.resources[i];
    media[resource.url] = resource.variants;
  }

  try {
    updateMediaStore('media', () => ({ ...media }));
    if (mediaEvent.thumbnails) {
      updateMediaStore('thumbnails', (thumbs) => ({ ...thumbs, ...mediaEvent.thumbnails }));
    }
  } catch(e) {
    console.warn('Error updating media: ', e);
  }
}

export const getMedia = (url: string, size?: MediaSize , animated?: boolean) => {
  const variants: MediaVariant[] = mediaStore.media[url] || [];

  const isOfSize = (s: MediaSize) => size ? size === s : true;
  const isAnimated = (a: 0 | 1) => animated !== undefined ? animated === !!a : true;

  return variants.find(v => isOfSize(v.s) && isAnimated(v.a));
};

export const getMediaUrl = (url: string | undefined, size?: MediaSize, animated?: boolean) => {
  if (!url) {
    return;
  }

  const media = getMedia(url, size, animated);

  return media?.media_url;
}

export const getThumbnail = (url: string | undefined) => {
  if (!url) return;

  return mediaStore.thumbnails[url];
}

export const addBlossomEvent = (ev: NostrEventContent) => {
  if (ev.kind !== Kind.Blossom) return;

  updateMediaStore('blossom', ev.pubkey || 'unknown', () => ({ ...ev }));
}

export const getUsersBlossomUrls = (pubkey: string | undefined) => {
  if (!pubkey) return [];

  const blossom = mediaStore.blossom[pubkey];

  if (!blossom || !blossom.tags) return [];

  return blossom.tags.reduce<string[]>((acc, t) => {
    return t[0] === 'server' ? [ ...acc, t[1]] : acc;
  }, []);
}
