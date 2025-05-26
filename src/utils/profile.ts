import { nip19 } from "nostr-tools";
import { eventStore } from "../stores/EventStore";
import { NostrEventContent, PrimalUser, UserMetadata, UserMetadataContent, VanityProfiles } from "../primal";
import { logError } from "./logger";
import { Kind, minKnownProfiles } from "src/constants";

export const hexToNpub = (hex: string | undefined): string =>  {

  try {
    return hex ? nip19.npubEncode(hex) : '';
  } catch (e) {
    console.warn(`Invalid pubkey hex ${hex}: `, e);
    return '';
  }

}

export const npubToHex = (npub: string): string =>  {
  if (!npub.startsWith('npub1') && !npub.startsWith('nprofile1')) {
    return npub;
  }

  try {
    const decoded = nip19.decode(npub);

    if (!decoded) {
      return '';
    }

    const hex = typeof decoded.data === 'string' ?
      decoded.data :
      (decoded.data as nip19.ProfilePointer).pubkey;

    return hex;

  } catch (e) {
    console.error('nip19 decode error');
    return '';
  }
}

export const truncateNpub = (npub: string) => {
  if (npub.length < 24) {
    return npub;
  }
  return `${npub.slice(0, 15)}..${npub.slice(-10)}`;
};

export const userName = (pubkey: string | undefined) => {
  if (!pubkey) {
    return '';
  }

  // const userEvent = eventStore[pubkey];
  const userEvent = eventStore.get(pubkey);
  const npub = hexToNpub(pubkey);

  if (!userEvent) return truncateNpub(npub);

  const user = JSON.parse(userEvent.content || '{}') as UserMetadata;

  const name = user.display_name ||
    user.displayName ||
    user.name ||
    truncateNpub(npub);

  return name || truncateNpub(npub);
};

export const parseUserMetadata = (metadata: NostrEventContent) => {
  if (metadata.kind !== Kind.Metadata) return;

  let userMeta: UserMetadataContent = {};

  try {
    userMeta = JSON.parse(metadata.content || '{}');
  } catch (e) {
    logError('Error in user meta JSON: ', e);
  }

  return {
    id: metadata.id,
    pubkey: metadata.pubkey,
    tags: metadata.tags,
    npub: hexToNpub(metadata.pubkey),
    name: (userMeta.name || ''),
    about: (userMeta.about || ''),
    picture: (userMeta.picture || ''),
    nip05: (userMeta.nip05 || ''),
    banner: (userMeta.banner || ''),
    displayName: (userMeta.display_name || userMeta.displayName || ''),
    location: (userMeta.location || ''),
    lud06: (userMeta.lud06 || ''),
    lud16: (userMeta.lud16 || ''),
    website: (userMeta.website || ''),
    event: { ...metadata },
  } as PrimalUser;
}

export const trimVerification = (address: string | undefined) => {
  if (address === undefined) {
    return '';
  }

  return address.split('@');
}

export const fetchKnownProfiles: (vanityName: string) => Promise<VanityProfiles> = async (vanityName: string) => {
  try {
    const name = vanityName.toLowerCase();
    const origin = 'https://primal.net';

    const content = await fetch(`${origin}/.well-known/nostr.json?name=${name}`);

    return await content.json();
  } catch (e) {
    logError('Failed to fetch known users: ', vanityName, e);

    return { ...minKnownProfiles };
  }
};
