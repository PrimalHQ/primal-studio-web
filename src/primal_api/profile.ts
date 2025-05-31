import { APP_ID } from "src/App";
import { Kind } from "src/constants";
import { NostrEventContent, PrimalUser } from "src/primal";
import { emptyEventFeedPage, pageResolve, updateFeedPage } from "src/utils/feeds";
import { primalAPI, sendMessage } from "src/utils/socket";

export const getUserMetadata = (pubkeys: string[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_infos", { pubkeys }]},
  ]));
}

export const getUsers = (pubkeys: string[]) => {
  return new Promise<PrimalUser[]>((resolve, reject) => {
    const subId = `user_profiles_${APP_ID}`;

    let page = { ...emptyEventFeedPage() };

    primalAPI({
      subId,
      action: () => getUserInfos(pubkeys, subId),
      onEvent: (event) => {
        updateFeedPage(page, event);
      },
      onEose: () => {
        const { users } = pageResolve(page);

        resolve(users);
      },
      onNotice: () => {
        reject('failed_to_fetch_users');
      }
    });
  });
}

export const getUserInfos = (pubkeys: string[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_infos", { pubkeys }]},
  ]));
}
