import { NostrRelaySettings } from "src/primal";

export const extractRelayConfigFromTags = (tags: string[][]) => {
  return tags.reduce((acc, tag) => {
    if (tag[0] !== 'r') return acc;

    let config = { write: true, read: true };

    if (tag[2] === 'write') {
      config.read = false;
    }

    if (tag[2] === 'read') {
      config.write = false;
    }

    return { ...acc, [tag[1]]: config } as NostrRelaySettings;

  }, {});
};


export const selectRelayTags = (tags: string[][], limit = 2, onlyWritable = true) =>
  tags.reduce((acc, t) =>
    t[0] === 'r' &&
    (onlyWritable ? t[3] !== 'read' : true) &&
    (t[1].startsWith('wss://') ||
    t[1].startsWith('ws://')) ? [...acc, t[1]] : acc, []
  ).slice(0, limit);

