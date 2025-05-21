import { Kind, THEMES } from "src/constants";
import { PrimalTheme } from "src/primal";
import { signEvent } from "src/utils/nostrApi";
import { primalAPI, sendMessage } from "src/utils/socket";

export const getSettings = async (pubkey: string | undefined, subid: string) => {
  const event = {
    content: '{ "description": "Sync app settings" }',
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["get_app_settings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to get settings: ', reason);
    return false;
  }

};

export const getDefaultSettings = async (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_default_app_settings", { client: "Primal-Web App" }]},
  ]))
};

export const sendSettings = async (settings: any, subid: string) => {
  const content = { description: 'Sync app settings', ...settings };

  const event = {
    content: JSON.stringify(content),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  console.log('SAVE SETTINGS: ', { ...content })

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["set_app_settings", { settings_event: signedNote }]},
    ]));
    return true;
  } catch (reason) {
    console.error('Failed to send settings: ', reason);
    return false;
  }
};

export const isValidTheme = (theme: string): theme is PrimalTheme => {
  return THEMES.includes(theme);
}

export const getDefaultBlossomServers = async (subId: string) => {
  let list: string[] = [];

  return new Promise<string[]>((resolve) => {
    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: ["get_recommended_blossom_servers"]},
        ]))
      },
      onEvent: (event) => {
        list = JSON.parse(event.content || '[]') as string[];
      },
      onEose: () => resolve(list),
  });
  })

};
