import { Kind } from "src/constants";
import { primalAPI, sendMessage } from "src/utils/socket";

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
        if (event.kind !== Kind.RelayList) return;

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

export const getRelays = async (pubkey: string | undefined, subid: string) => {
  if (!pubkey) return;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_user_relays", { pubkey }]},
  ]));
};
