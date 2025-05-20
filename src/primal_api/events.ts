import { sendMessage } from "src/utils/socket";

export const getReplacableEvent = (pubkey: string, kind: number, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["replaceable_event", { pubkey, kind, }]},
  ]));
};
