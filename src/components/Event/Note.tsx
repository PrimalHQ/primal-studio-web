import { Component, For, Show } from 'solid-js';
import { noteRegexG, profileRegexG } from '../../constants';
import { EventDisplayVariant, NostrEventContent } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import { nip19 } from 'nostr-tools';
import { eventStore } from '../../stores/EventStore';


const Note: Component<{
  event: NostrEventContent,
  reposters: string[],
  embedded?: boolean,
  variant?: EventDisplayVariant,
}> = (props) => {

  const parseNote = () => {
    const note = props.event;

    // Parsed user mentions
    let parsed = (note.content || '').replaceAll(profileRegexG, (text) => {
      let id = text;

      if (text.startsWith('nostr:')) {
        const [_, pk] = text.split(':');
        id = pk;
      }

      try {
        const decoded = nip19.decode(id);

        switch (decoded.type) {
          case 'npub':
            id = decoded.data;
            break;
          case 'nprofile':
            id = decoded.data.pubkey;
            break;
          default:
            break;
        }
      } catch (e) {

      }

      return props.embedded ?
        `<span>@${userName(id)}</span>` :
        `<a href="/p/${id}">@${userName(id)}</a>`;
    });

    // Parse event mentions
    parsed = parsed.replaceAll(noteRegexG, (text) => {
      let id = text;

      if (text.startsWith('nostr:')) {
        const [_, pk] = text.split(':');
        id = pk;
      }

      try {
        const decoded = nip19.decode(id);

        switch (decoded.type) {
          case 'note':
            id = decoded.data;
            break;
          case 'nevent':
            id = decoded.data.id;
            break;
          default:
            break;
        }
      } catch (e) {
      }

      // const n = eventStore[id];
      const n = eventStore.get(id);

      if (!n) return text;

      return (<div><Note event={n} reposters={[]} embedded={true}/></div> as Element)?.innerHTML;
    });

    return parsed;
  }

  return (
    <a
      class={`${styles.event} ${props.embedded ? styles.embedded : ''}`}
      data-event-id={props.event.id}
      href={`/e/${props.event.id}`}
    >
      <Show when={props.reposters.length > 0}>
        <div class={styles.reposters}>
          <For each={props.reposters}>
            {reposter =>
              <div>REPOST: {userName(reposter)}</div>
            }
          </For>
        </div>
      </Show>
      <div class={styles.note}>
        <div class={styles.noteHeader}>
          {userName(props.event.pubkey)}
        </div>
        <div innerHTML={parseNote()}></div>
      </div>
    </a>
  );
}

export default Note;
