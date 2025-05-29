import { Kind } from "../constants";
import { FeedRange, NostrEventContent } from "../primal";
import { ReactiveMap } from '@solid-primitives/map';
import { fetchEvents } from "../primal_api/feeds";
import { accountStore } from "./AccountStore";
import { APP_ID } from "../App";
import { openDB } from 'idb';
import { addBlossomEvent, addMediaEvent } from "./MediaStore";
import { addVerifiedUsers } from "./AppStore";


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

  if (ev.kind === Kind.MediaInfo) {
    addMediaEvent(ev);
  }

  if (ev.kind === Kind.Blossom) {
    addBlossomEvent(ev);
  }

  if (ev.kind === Kind.VerifiedUsersDict) {
    const verifiedUsers: Record<string, string> = JSON.parse(ev.content || '{}');
    addVerifiedUsers(verifiedUsers);
  }

  // updateEventStore(() => ({ [key]:  { ...ev } }));
  eventStore.set(key, ev);
};

export const addEventsToStore = (events: NostrEventContent[]) => {
  // batch(() => {
    let i = 0;
    // let normalised: Record<string, NostrEventContent> = {};

    for (i=0; i<events.length; i++) {
      let ev = { ...events[i] };
      addEventToStore(ev);
      // let key = ev.id;

      // if (ev.kind === Kind.Metadata) {
      //   key = ev.pubkey || ev.id;
      // }

      // if (ev.kind === Kind.Mentions) {
      //   const wrappedEvent = JSON.parse(ev.content || '') as NostrEventContent;

      //   ev = wrappedEvent;
      //   key = ev.id;
      // }

      // normalised[key] = ev;

      // eventStore.set(key, ev)
    }

    // updateEventStore(() => ({ ...normalised }));
  // });
}

export const removeEventFromEventStore = async (id: string) => {
  eventStore.delete(id);

  let db = await openDB('store', 1, {
    upgrade(database, oldVersion, newVersion, transaction, event) {
      if (oldVersion === 0) {
        database.createObjectStore('events', { keyPath: 'id' });
      }
    },
  });

  let transaction = db.transaction('events', 'readwrite');
  let eventsDb = transaction.objectStore('events');

  eventsDb.delete(id);

  await transaction.done;
}

export const getEventFromStore = async (id: string) => {
  // let event = eventStore[id];
  let event = eventStore.get(id);

  if (event) return event;

  //TODO: Read from indexdb
  let db = await openDB('store', 1, {
    upgrade(database, oldVersion, newVersion, transaction, event) {
      if (oldVersion === 0) {
        database.createObjectStore('events', { keyPath: 'id' });
      }
    },
  });

  let transaction = db.transaction('events', 'readonly');
  let eventsDb = transaction.objectStore('events');

  event = await eventsDb.get(id);

  if (event) return event;

  // Fetch from API
  const fetchedEvents = await fetchEvents(
    accountStore.pubkey,
    [id],
    `missing_${APP_ID}`,
  );

  addEventsToStore(fetchedEvents);

  return fetchedEvents.find(e => e.id === id);

};


export const calculateOffset = (ids: string[], range: FeedRange) => {
  let offset = 0;

  const { foundEvents } = getRecentEventsFromStore(ids);

  for (let i=foundEvents.length-1;i>=0;i--) {
    const note = foundEvents[i];

    if (
      range.order_by === 'created_at' &&
      note.created_at !== range.since
    ) break;

    // if (
    //   paging.order_by === 'satszapped' &&
    //   note.satszapped !== paging.since
    // ) break;

    // if (
    //   paging.order_by === 'score' &&
    //   note.score !== paging.since
    // ) break;

    offset++;
  }

  return offset;
};

export const getRecentEventsFromStore = (ids: string[]) => {
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

  return { foundEvents, missingEvents };
}

export const getEventsFromStore = async (ids: string[], subId: string) => {

  let { foundEvents, missingEvents } = getRecentEventsFromStore(ids);

  // let missingEvents: string[] = [];
  // let foundEvents: NostrEventContent[] = [];

  // for(let i=0; i<ids.length; i++) {
  //   const id = ids[i];

  //   // let event = eventStore[id];
  //   let event = eventStore.get(id);

  //   if (!event) {
  //     missingEvents.push(id);
  //     continue;
  //   }

  //   foundEvents.push(event);
  // }

  if (missingEvents.length > 0) {
    //TODO: Read from indexdb
    let db = await openDB('store', 1, {
      upgrade(database, oldVersion, newVersion, transaction, event) {
        if (oldVersion === 0) {
          database.createObjectStore('events', { keyPath: 'id' });
        }
      },
    });

    let transaction = db.transaction('events', 'readonly');
    let eventsDb = transaction.objectStore('events');

    let events: NostrEventContent[] = [];
    let foundIds: string[] = [];

    for (let i=0; i<missingEvents.length; i++) {
      const ev = await eventsDb.get(missingEvents[i]);

      if (ev) {
        foundIds.push(missingEvents[i]);
        events.push(ev);
      }
    }

    await transaction.done;

    missingEvents = missingEvents.filter(id => !foundIds.includes(id));

    db.close();

    foundEvents.push.apply(foundEvents, events);
  }

  // Fetch from API
  if (missingEvents.length > 0) {
    const fetchedEvents = await fetchEvents(
      accountStore.pubkey,
      missingEvents,
      `missing_${subId}_${APP_ID}`,
    )

    addEventsToStore(fetchedEvents);

    const filtered = fetchedEvents.filter(fe => ids.includes(fe.id));

    foundEvents.push.apply(foundEvents, filtered);
  }

  return foundEvents
};
