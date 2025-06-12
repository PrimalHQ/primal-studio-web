import { query, RoutePreloadFuncArgs } from "@solidjs/router";
import { BlobDescriptor, BlossomClient } from "blossom-client-sdk";
import { createStore } from "solid-js/store";
import { PrimalUser, PrimalNote, PrimalArticle, PrimalDraft } from "src/primal";
import { getMediaUses } from "src/primal_api/studio";
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
  usageInfo: {
    users: PrimalUser[],
    notes: PrimalNote[],
    reads: PrimalArticle[],
    drafts: PrimalDraft[],
    usage: Record<string, string[]>,
    urls: string[],
  }
};

export const emptyBlossomStore = (): BlossomStore => ({
  server: undefined,
  media: {},
  listType: 'grid',
  isFetchingList: false,
  sort: 'latest',
  selectedMedia: [],
  uploadingFiles: [],
  usageInfo: {
    users: [],
    notes: [],
    reads: [],
    drafts: [],
    usage: {},
    urls: [],
  }
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

export const fetchUsageInfo = async (urls: string[]) => {
  const { users, notes, reads, drafts, usage } = await getMediaUses(urls);

  setBlossomStore('usageInfo', (usageInfo) => {
    let usrs = [ ...users ];
    if (usageInfo.users.length > 0) {
      const ids = usageInfo.users.map(u => u.pubkey);
      usrs = usrs.filter(u => !ids.includes(u.pubkey));
    }

    let nts = [ ...notes ];
    if (usageInfo.notes.length > 0) {
      const ids = usageInfo.notes.map(n => n.id);
      nts = nts.filter(n => !ids.includes(n.id));
    }

    let arts = [ ...reads ];
    if (usageInfo.reads.length > 0) {
      const ids = usageInfo.reads.map(n => n.id);
      arts = arts.filter(n => !ids.includes(n.id));
    }

    let drfts = [ ...drafts ];
    if (usageInfo.drafts.length > 0) {
      const ids = usageInfo.drafts.map(n => n.id);
      drfts = drfts.filter(n => !ids.includes(n.id));
    }

    let us = [ ...urls ];
    if (usageInfo.urls.length > 0) {
      us = us.filter(u => !usageInfo.urls.includes(u));
    }

    return {
      users: [ ...usageInfo.users, ...usrs ],
      notes: [ ...usageInfo.notes, ...nts],
      reads: [ ...usageInfo.reads, ...arts],
      drafts: [ ...usageInfo.drafts, ...drfts],
      urls: [ ...usageInfo.urls, ...us ],
      usage: { ...usageInfo.usage, ...usage },
    };
  })
};

export const urlUsage = (url?: string) => {
  if (!url) return {
    profiles: [],
    notes: [],
    articles: [],
    drafts: [],
  }

  const uses = blossomStore.usageInfo.usage[url] || [];

  if (uses.length === 0) return {
    profiles: [],
    notes: [],
    articles: [],
    drafts: [],
  };

  return {
    profiles: blossomStore.usageInfo.users.filter(u => uses.includes(u.pubkey)),
    notes: blossomStore.usageInfo.notes.filter(u => uses.includes(u.id)),
    articles: blossomStore.usageInfo.reads.filter(u => uses.includes(u.id)),
    drafts: blossomStore.usageInfo.drafts.filter(u => uses.includes(u.id)),
  }
};

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
