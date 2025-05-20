import { APP_ID } from "src/App";
import { NostrRelaySignedEvent } from "src/primal";
import { sendMessage, subsTo } from "src/utils/socket";

export const getReplacableEvent = (pubkey: string, kind: number, subId: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["replaceable_event", { pubkey, kind, }]},
  ]));
};

export const importEvents = (events: NostrRelaySignedEvent[], subId: string) => {

  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["import_events", { events }]},
  ]));
};

export const triggerImportEvents = (
  events: NostrRelaySignedEvent[],
  subId?: string
): Promise<boolean> => {
  const sub = subId || `import_events_${APP_ID}`;

  return new Promise((resolve) => {
    const unsub = subsTo(sub, {
      onEose: () => {
        unsub();
        resolve(true);
      }
    });

    importEvents(events, sub);
  })
};
