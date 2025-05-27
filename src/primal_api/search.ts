import DOMPurify from "dompurify";
import { sendMessage } from "src/utils/socket";

export type SearchPayload = { query: string, limit: number, pubkey?: string, since?: number, until?: number, user_pubkey?: string };

export const searchUsers = (pubkey: string | undefined, subid: string, query: string, limit = 10) => {

  let payload: SearchPayload = {
    query: DOMPurify.sanitize(query),
    limit,
  };

  if (pubkey) {
    payload.pubkey = pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_search", payload]},
  ]));
}
