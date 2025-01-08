import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { Kind } from "../constants";
import { EventStore, NostrEventContent } from "../primal";


export const [eventStore, updateEventStore] = createStore<EventStore>({});

export const addEventToStore = (event: NostrEventContent) => {
  let ev = { ...event };
  let key = ev.id;

  if (ev.kind === Kind.Metadata) {
    key = ev.pubkey || ev.id;
  }

  if (ev.kind === Kind.Mentions) {
    const wrappedEvent = JSON.parse(ev.content || '') as NostrEventContent;

    ev = { ...wrappedEvent };
    key = ev.id;
  }

  if (eventStore[key] === undefined) {
    updateEventStore(() => ({[key]: { ...ev} }));
    return
  }

  updateEventStore(key, () => ({ ...ev }));
};

export const addEventsToStore = (events: NostrEventContent[]) => {
  batch(() => {
    let i = 0;

    for (i=0; i<events.length; i++) {
      let ev = { ...events[i] };
      let key = ev.id;

      if (ev.kind === Kind.Metadata) {
        key = ev.pubkey || ev.id;
      }

      if (ev.kind === Kind.Mentions) {
        const wrappedEvent = JSON.parse(ev.content || '') as NostrEventContent;

        ev = { ...wrappedEvent };
        key = ev.id;
      }

      if (eventStore[key] === undefined) {
        updateEventStore(() => ({ [key]: { ...ev } }));
        continue;
      }

      updateEventStore(key, () => ({ ...ev }));
    }
  });
}

export type ReadableEvent = {
  id: string,
  kind: number,


};

export const genNote = (id: string) => {
  const noteEvent = eventStore[id];

  if (!noteEvent || noteEvent.kind !== Kind.Text) return;


};
