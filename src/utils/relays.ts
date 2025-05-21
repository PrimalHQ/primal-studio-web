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
