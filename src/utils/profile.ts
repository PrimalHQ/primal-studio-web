import { nip19 } from "nostr-tools";
import { eventStore } from "../stores/EventStore";
import { UserMetadata } from "../primal";

export const hexToNpub = (hex: string | undefined): string =>  {

  try {
    return hex ? nip19.npubEncode(hex) : '';
  } catch (e) {
    console.warn(`Invalid pubkey hex ${hex}: `, e);
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
