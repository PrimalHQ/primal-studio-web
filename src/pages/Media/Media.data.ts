import { query, RoutePreloadFuncArgs } from "@solidjs/router";
import { BlobDescriptor, BlossomClient } from "blossom-client-sdk";
import { createStore } from "solid-js/store";
import { accountStore, fetchBlossomServers } from "src/stores/AccountStore";
import { readMediaPageConfig } from "src/utils/localStore";
import { signEvent } from "src/utils/nostrApi";
import { utils } from 'src/utils/nTools';

export const mediaSortOptions = ['latest', 'oldest', 'size', 'type'] as const;

export type BlossomStore = {
  server: string | undefined,
  media: Record<string, BlobDescriptor[]>,
  listType: 'grid' | 'list',
  sort: typeof mediaSortOptions[number],
  isFetchingList: boolean,
  selectedMedia: string[],
  uploadingFiles: File[],
};

export const emptyBlossomStore = (): BlossomStore => ({
  server: undefined,
  media: {},
  listType: 'grid',
  isFetchingList: false,
  sort: 'latest',
  selectedMedia: [],
  uploadingFiles: [],
});

export type BlossomListOptions = {
  since?: number,
  until?: number,
  server?: string,
  sort?: typeof mediaSortOptions[number]
}

export const mergeBlossomBlobArrays = (arr1: BlobDescriptor[], arr2: BlobDescriptor[]): BlobDescriptor[] => {
  const map = new Map<string, BlobDescriptor>();

  [...arr1, ...arr2].forEach(item => map.set(item.sha256, item));

  return Array.from(map.values());
}

// export const lastThreeMonths = {
//   until: Math.floor((new Date()).getTime() / 1_000),
//   since: Math.floor((new Date()).getTime() / 1_000) - 3 * 30 * 24 * 60 * 60,

// }

export const [blossomStore, setBlossomStore] = createStore<BlossomStore>(emptyBlossomStore());

export const addMedia = (blob: BlobDescriptor) => {
  setBlossomStore('media', blossomStore.server || '_', (blobs) => [ { ...blob }, ...blobs ]);
};

export const toggleMediaSelect = (blob: BlobDescriptor) => {
  if (blossomStore.selectedMedia.find(m => blob.sha256 === m)) {
    setBlossomStore('selectedMedia', (ms) => ms.filter(m => m !== blob.sha256));
    return;
  }

  setBlossomStore('selectedMedia', blossomStore.selectedMedia.length, () => blob.sha256);
};

export const fetchBlossomMediaList = async (pubkey: string, options?: BlossomListOptions) => {
  setBlossomStore('isFetchingList', true);

  let blossomServers = accountStore.blossomServers;

  if (options?.server && options.server.length > 0) {
    blossomServers = [ options.server ]
  }

  if (blossomServers.length === 0) {
    blossomServers = await fetchBlossomServers(pubkey);
  }

  if (blossomServers.length === 0) return;

  setBlossomStore('server', () => blossomServers[0]);

  let media: Record<string, BlobDescriptor[]> = {};

  const auth = await BlossomClient.createListAuth(signEvent, { message: 'fetch media list'});

  // for (let i=0; i<blossomServers.length; i++) {
    const server = blossomServers[0];

    const host = utils.normalizeURL(server);

    const blobs = await BlossomClient.listBlobs(
      host,
      pubkey,
      {
        auth,
        since: options?.since,
        until: options?.until,
      },
    );

    const uniqueBlobs = mergeBlossomBlobArrays(media[server] || [], blobs)

    media[server] = [ ...(media[server] || []), ...uniqueBlobs ];
  // }

  setBlossomStore('media', () => ({ ...media }));

  setBlossomStore('isFetchingList', false);

  return media;

}

export const deleteMultipleMedia = async (shas: string[]) => {
  let success: Record<string, boolean> = {};

  for (let i=0; i<shas.length; i++) {
    success[shas[i]] = await deleteMedia(shas[i]);
  }

  return success;
}

export const deleteMedia = async (sha256: string) => {
  const server = blossomStore.server;
  if (!server) return false;

  const index = blossomStore.media[server].findIndex(b => b.sha256 === sha256);
  const oldBlob = blossomStore.media[server][index];

  setBlossomStore('media', server, (blobs) => blobs.filter(b => b.sha256 !== sha256));

  const auth = await BlossomClient.createDeleteAuth(
    signEvent,
    sha256,
    { message: `delete media file: ${sha256}`},
  );

  const host = utils.normalizeURL(server);

  const success = await BlossomClient.deleteBlob(
    host,
    sha256,
    {
      auth,
    },
  );

  if (success) {
    setBlossomStore('media', server, index, () => ({ ...oldBlob }));
  }

  return success;
}

export const preloadMedia = (args: RoutePreloadFuncArgs) => {
  let pk = args.params?.pubkey;

  if (!pk) {
    pk = accountStore.pubkey;
  }

  if (!pk) return;

  const config = readMediaPageConfig(accountStore.pubkey);

  setBlossomStore(() => ({ ...config }));

  query(fetchBlossomMediaList, 'fetchBlossomMedia')(pk, { server: blossomStore.server });
}
