import { Kind } from "../constants";
import { NostrEventContent } from "../primal";
import { ReactiveMap } from '@solid-primitives/map';
import { fetchEvents } from "../primal_api/feeds";
import { accountStore } from "./AccountStore";
import { APP_ID } from "../App";


export const eventStore = new ReactiveMap<string, NostrEventContent>();


// export const [eventStore, updateEventStore] = createStore<Record<string, NostrEventContent>>({});

export const addEventToStore = (event: NostrEventContent) => {
  let ev = { ...event };
  let key = ev.id;

  if (ev.kind === Kind.Metadata) {
    key = ev.pubkey || ev.id;
  }

  if (ev.kind === Kind.Mentions) {
    const wrappedEvent = JSON.parse(ev.content || '') as NostrEventContent;

    ev = wrappedEvent;
    key = ev.id;
  }

  // updateEventStore(() => ({ [key]:  { ...ev } }));
  eventStore.set(key, ev);
};

export const addEventsToStore = (events: NostrEventContent[]) => {
  // batch(() => {
    let i = 0;
    let normalised: Record<string, NostrEventContent> = {};

    for (i=0; i<events.length; i++) {
      let ev = { ...events[i] };
      let key = ev.id;

      if (ev.kind === Kind.Metadata) {
        key = ev.pubkey || ev.id;
      }

      if (ev.kind === Kind.Mentions) {
        const wrappedEvent = JSON.parse(ev.content || '') as NostrEventContent;

        ev = wrappedEvent;
        key = ev.id;
      }

      normalised[key] = ev;

      eventStore.set(key, ev)
    }

    // updateEventStore(() => ({ ...normalised }));
  // });
}

export const getEventFromStore = async (id: string) => {
  // let event = eventStore[id];
  let event = eventStore.get(id);

  if (event) return event;

  //TODO: Read from indexdb

  // Fetch from API
  const fetchedEvents = await fetchEvents(
    accountStore.pubkey,
    [id],
    `missing_${APP_ID}`,
  );

  addEventsToStore(fetchedEvents);

  return fetchedEvents.find(e => e.id === id);

};

export const getEventsFromStore = async (ids: string[], i:number) => {
  let missingEvents: string[] = [];
  let foundEvents: NostrEventContent[] = [];

  for(let i=0; i<ids.length; i++) {
    const id = ids[i];

    // let event = eventStore[id];
    let event = eventStore.get(id);

    if (!event) {
      missingEvents.push(id);
      continue;
    }

    foundEvents.push(event);
  }

  //TODO: Read from indexdb

  // Fetch from API
  if (missingEvents.length > 0) {
    const fetchedEvents = await fetchEvents(
      accountStore.pubkey,
      missingEvents,
      `missing_${i}_${APP_ID}`,
    )

    addEventsToStore(fetchedEvents);

    const filtered = fetchedEvents.filter(fe => ids.includes(fe.id));

    foundEvents.push.apply(foundEvents, filtered);
  }

  return foundEvents
};
