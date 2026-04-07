import { Component, createEffect, For, Show } from 'solid-js';

import styles from './EventQueuePage.module.scss';
import { accountStore, dequeEvents, eventInQueueIndex, processArrayUntilFailure, startEventQueueMonitor, updateAccountStore } from 'src/stores/AccountStore';
import { createStore, unwrap } from 'solid-js/store';
import { NostrRelaySignedEvent } from 'src/primal';
import { signEvent } from 'src/utils/nostrApi';
import { sendSignedEvent } from 'src/primal_api/nostr';
import { translate } from 'src/translations/translate';
import CheckBox from 'src/components/CheckBox/CheckBox';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import GenericEvent from './GenericEvent';
import Wormhole from 'src/helpers/Wormhole/Wormhole';
import PageHeader from 'src/components/PageHeader/PageHeader';
import { storeEventQueue } from 'src/utils/localStore';

const EventQueuePage: Component = () => {
  createEffect(() => {
    const queue = accountStore.eventQueue;
    setQueuedEvents((qes) => {
      return queue.map(event => {
        const index = eventInQueueIndex(event, qes.map(qe => qe.event))

        if (index > -1) {
          const qe = qes[index];
          return { selected: qe ? qe.selected : true, event }
        }

        return { selected: true, event };
      });

    })
  });

  const [queuedEvents, setQueuedEvents] = createStore<{selected: boolean, event: NostrRelaySignedEvent}[]>([])

  const abortSelected = () => {
    const selectedEvents = queuedEvents.reduce<NostrRelaySignedEvent[]>((acc, qe) => qe.selected ? [...acc, { ...qe.event }] : [...acc],[]);

    dequeEvents([...unwrap(selectedEvents)]);
    startEventQueueMonitor();
  };

  const retrySelected = async () => {
    if (!accountStore.pubkey) return;
    const selectedEvents = queuedEvents.reduce<NostrRelaySignedEvent[]>((acc, qe) => qe.selected ? [...acc, { ...qe.event }] : [...acc],[]);
    const queue = unwrap(selectedEvents);

    const newQueue = await processArrayUntilFailure<NostrRelaySignedEvent>(queue, (item) => {
      return new Promise<void>(async (resolve, reject) => {
        let i = { ...item };
        if (!i.sig) {
          try {
            const event = await signEvent(i);

            i = { ...event };
          } catch (reason) {
            reject('relay_send_timeout');
          }
        }

        let timeout = setTimeout(
          () => reject('relay_send_timeout'),
          8_000,
        );

        sendSignedEvent(i, {
          success: () => {
            clearTimeout(timeout);
            resolve();
          },
          fail: () => {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
    });

    updateAccountStore('eventQueue', () => [ ...newQueue ]);
    storeEventQueue(accountStore.pubkey, accountStore.eventQueue);
  }

  const retrySigning = (item: NostrRelaySignedEvent) => {

    return new Promise<void>(async (resolve, reject) => {
      if (item.sig) {
        let timeout = setTimeout(
          () => reject('relay_send_timeout'),
          8_000,
        );

        sendSignedEvent(item, {
          success: () => {
            clearTimeout(timeout);
            resolve();
          },
        });

        return;
      }

      try {
        const event = await signEvent(item);

        item = { ...event };
      } catch (reason) {
        reject('relay_send_timeout');
        return;
      }

      let timeout = setTimeout(
        () => reject('relay_send_timeout'),
        8_000,
      );

      sendSignedEvent(item, {
        success: () => {
          clearTimeout(timeout);
          resolve();
        },
      });
    });
  }

  return (
    <>
      <Wormhole to="header">
        <PageHeader
          title={translate('pending', 'header', { num: accountStore.eventQueue.length })}
          selection={''}
          hideSpans={true}
        />
      </Wormhole>

      <div class={styles.feedHolder}>
        <div class={styles.feedContent}>
          <Show when={accountStore.signerTimeout}>
            <div class={styles.extensionWarning}>
              Nostr extension is not responding.
            </div>
          </Show>
          <div class={styles.eventQueueHeader}>
            <Show
              when={accountStore.eventQueue.length > 0}
              fallback={
                <div class={styles.label}>
                  {translate('pending', 'empty')}
                </div>
              }
            >
              <div class={styles.label}>
                {translate('pending', 'label')}
              </div>

              <div class={styles.retry}>
                <Show
                  when={accountStore.eventQueueRetry > 0}
                  fallback={<>{translate('pending', 'retrying')}</>}
                >
                  {translate('pending', 'retry', { seconds: accountStore.eventQueueRetry })}
                </Show>
              </div>
            </Show>
          </div>
          <div class={styles.eventList}>
            <For each={queuedEvents}>
              {queuedEvent =>
                <div class={styles.queueItem}>
                  <div class={styles.check}>
                    <CheckBox
                      checked={queuedEvent.selected}
                      onChange={() => {
                        setQueuedEvents(ev => ev.event.id === queuedEvent.event.id, 'selected', (v) => !v);
                      }}
                    />
                  </div>
                  <GenericEvent
                    event={queuedEvent.event}
                    onResign={() => retrySigning(queuedEvent.event)?.catch(e => {})}
                  />
                </div>
              }
            </For>
          </div>
          <div class={styles.actionFooter}>
            <ButtonSecondary
              onClick={abortSelected}
              disabled={queuedEvents.filter(qe => qe.selected).length === 0}
            >
              {translate('pending', 'abortSelected')}
            </ButtonSecondary>
            <ButtonPrimary
              onClick={retrySelected}
              disabled={queuedEvents.filter(qe => qe.selected).length === 0}
            >
              {translate('pending', 'retrySelected')}
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </>
  );
}

export default EventQueuePage;

