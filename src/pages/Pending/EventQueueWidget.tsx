import { Component, createEffect, createSignal, on, Show } from 'solid-js';
import styles from './EventQueueWidget.module.scss';
import { accountStore } from 'src/stores/AccountStore';

export const EVENT_PUBLISH_DELAY = 12_000;

const EventQueueWidget: Component<{ id?: string, isSmall?: boolean }> = (props) => {

  const [queueLength, setQueueLength] = createSignal(0);

  let queueTimeout = 0;

  createEffect(on(() => accountStore.eventQueue, (queue) => {
    clearTimeout(queueTimeout);

    if (queue.length === 0) {
      setQueueLength(0);
      return;
    }

    // Giv some time for the event to be published
    queueTimeout = setTimeout(() => {
      setQueueLength(queue.length);
    }, EVENT_PUBLISH_DELAY);
  }));

  return (
    <div
      id={props.id}
       class={styles.publishQueueInfo}
    >
      <Show when={queueLength() > 0}>
        <a href="/pending">
          <div class={styles.clockIcon}></div>
          <div class={styles.label}>
            Publish pending ({queueLength()})
          </div>
        </a>
      </Show>
    </div>
  );
}

export default EventQueueWidget;
