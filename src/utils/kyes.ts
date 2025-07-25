import { logError, logWarning } from "./logger";
import { nip19 } from "./nTools";


export const hexToNpub = (hex: string | undefined): string =>  {

  try {
    return hex ? nip19.npubEncode(hex) : '';
  } catch (e) {
    console.warn(`Invalid pubkey hex ${hex}: `, e);
    return '';
  }

}
export const hexToNsec = (hex: string | undefined): string =>  {
  // @ts-ignore
  return hex ? nip19.nsecEncode(hex) : '';
}

export const npubToHex = (npub: string | undefined): string =>  {
  if (!npub) return '';

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

export const decodeIdentifier = (id: string) => {
  try {
    return nip19.decode(id);
  }
  catch (e) {
    logWarning('Failed to decode identifier: ', e);
    return {
      type: 'error',
      data: id,
    }
  }
}

export const noteIdToHex = (noteId: string) => {
  let id = noteId;

  try {
    const decoded = nip19.decode(noteId);

    switch (decoded.type) {
      case 'note':
        id = decoded.data;
        break;
      case 'nevent':
        id = decoded.data.id;
        break;
    }
  } catch (e) {
    logError('Error decoding: ', noteId, e)
  }

  return id;
}


  export const generateArticleIdentifier = (title: string) => {
    let str = title.toLowerCase();

    return str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  }
