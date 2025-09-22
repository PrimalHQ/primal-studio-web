import { APP_ID } from "src/App";
import { primalAPI, sendMessage } from "src/utils/socket";

export type MediaMetadata = {
  thumbnails: Record<string, string>,
  resources: { url: string, variants: any[] }[],
}

export const fetchMediaMetadata = (
  urls: string[],
) => {
  return new Promise<MediaMetadata>((resolve, reject) => {

    const subId = `import_media_metadata_${APP_ID}`;

    let metadata: MediaMetadata = {
      thumbnails: {},
      resources: [],
    }

    primalAPI({
      subId,
      action: () => {
        sendMessage(JSON.stringify([
          "REQ",
          subId,
          {cache: ["get_media_metadata", { urls }]},
        ]));
      },
      onEvent: (event) => {
        const cont = JSON.parse(event.content || '{}')
        metadata = { ...cont };
      },
      onEose: () => {
        resolve(metadata);
      },
      onNotice: () => {
        reject('failed_to_fetch_media_metadata');
      }
    });
  });
};
