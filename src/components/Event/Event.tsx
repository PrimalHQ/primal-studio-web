import { Component, createSignal, For, JSX, Match, onMount, Show, Switch } from 'solid-js';
import { Kind } from '../../constants';
import { EventDisplayVariant, NostrEventContent } from '../../primal';

import styles from './Event.module.scss';
import Note from './Note';


const Event: Component<{
  event: NostrEventContent,
  reposters: string[],
  variant?: EventDisplayVariant,
}> = (props) => {

  const renderMissingEvent = () => {
    return <div class={styles.note}>Missing event</div>
  }

  return (
    <Switch fallback={renderMissingEvent()}>
      <Match when={props.event.kind === Kind.Text}>
        <Note
          event={props.event}
          reposters={props.reposters}
          variant={props.variant}
        />
      </Match>
    </Switch>
  );
}

export default Event;
