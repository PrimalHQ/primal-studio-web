import { Kind } from "src/constants";
import { primalAPI, sendMessage } from "src/utils/socket";
import { sendEvent } from "./nostr";
import { APP_ID } from "src/App";
import { extractRelayConfigFromTags } from "src/utils/relays";
import { NostrRelaySettings } from "src/primal";
import { Relay } from "src/utils/nTools";

export const getDefaultRelays = async (subId: string) => {
  let relayList: string[] = [];

  return new Promise<string[]>((resolve, reject) => {
    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: ["get_default_relays"]},
        ]))
      },
      onEvent: (event) => {
        const resp: string[] = JSON.parse(event.content || '[]');

        relayList = [...resp]
      },
      onEose: () => {
        resolve(relayList);
      },
      onNotice: () => {
        reject('failed_to_fetch_relays');
      }
    }
    )
  })
};

export const getRelays = async (pubkey: string | undefined, subid?: string) => {
  if (!pubkey) return {};

  const subId = subid || `get_relays_${APP_ID}`;
  let relays: NostrRelaySettings = {};

  return new Promise<NostrRelaySettings>((resolve) => {
    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: ["get_user_relays", { pubkey }]},
        ]));
      },
      onEvent: (content) => {
        if (!content || content.kind !== Kind.UserRelays) return;

        relays = extractRelayConfigFromTags(content.tags || []);
      },
      onEose: () => {
        resolve(relays);
      }
    });
  })
};


export const sendRelays = async (relays: Relay[], relaySettings: NostrRelaySettings) => {
  const tags = Object.entries(relaySettings).reduce<string[][]>((acc, [url, config]) => {
    if (config.read && config.write) {
      return [ ...acc, ['r', url]];
    }

    if (!config.read && !config.write) {
      return acc;
    }

    const permission: string = config.read ? 'read' : 'write';

    return [ ...acc, ['r', url, permission]];
  }, []);

  const event = {
    content: '',
    kind: Kind.RelayList,
    tags: [...tags],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, { relays });
};

export const sendBlossomEvent = async (list: string[]) => {
  const event = {
    content: '',
    kind: Kind.Blossom,
    tags: list.map(url => ['server', url]),
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event);
}

