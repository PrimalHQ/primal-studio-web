import { Kind } from 'src/constants';
import { SimplePool } from 'src/utils/nTools';
import { NWCConfig } from 'src/utils/wallet';
import { NostrRelaySignedEvent } from 'src/primal';

type WorkerMessageType = {
  type: string,
  eventData?: { event: NostrRelaySignedEvent, relays: string[] },
  relays?: string[],
  nwcData?: { event: NostrRelaySignedEvent, nwcConfig: NWCConfig },
}

// @ts-ignore
let relayPool: SimplePool | undefined;

// TODO: MAKE THIS A GLOBAL WORKER THAT HANDLES RELAY POOLS
self.addEventListener('message', (e: MessageEvent<WorkerMessageType>) => {
  const { type, eventData, relays, nwcData } = e.data;

  if (type === 'INIT' || !relayPool) {
    // @ts-ignore
    relayPool = new SimplePool({ enablePing: false, enableReconnect: true });
  }

  if (type === 'OPEN_RELAYS' && relays) {
    for (let i=0; i < relays.length; i++) {
      const url = relays[i];
      try {
        relayPool.ensureRelay(url).then(r => self.postMessage({ type: 'RELAY_OPENED', relay: r.url }));
      } catch (e) {
        console.log('FAILED TO OPEN RELAY: ', e);
      }
    }
  }

  if (type === 'CLOSE_RELAYS' && relays) {
    relayPool.close(relays);
    self.postMessage('RELAYS_CLOSED');
  }

  if (type === 'SEND_NWC' && nwcData) {
    const { event, nwcConfig: { relays, pubkey, secret } } = nwcData;

    const subInfo = relayPool.subscribe(
      relays,
      {
        kinds: [Kind.WalletInfo, Kind.WalletResponse],
        authors: [pubkey, event.id],
      },
      {
        onevent: (eInfo) => {
          if (!relayPool) {
            subInfo.close();
            return;
          }

          if (eInfo.kind === Kind.WalletInfo && eInfo.content.split(' ').includes('pay_invoice')) {
            relayPool.publish(relays, event);
            return;
          }

          if (eInfo.kind === Kind.WalletResponse) {
            if (!eInfo.tags.find(t => t[0] === 'e' && t[1] === event.id)) return;

            subInfo.close();
            self.postMessage({
              secret,
              pubkey,
              event: eInfo,
            })
          }
        }
      }
    )

  }

  if (type === 'NWC_INFO' && nwcData) {
    const {  nwcConfig: { relays, pubkey, } } = nwcData;

    const sub = relayPool.subscribe(
      relays,
      {
        kinds: [Kind.WalletInfo],
        authors: [pubkey],
      },
      {
        onevent: (e) => {
          self.postMessage({ event: e });
        },
        oneose: () => {
          sub.close();
        }
      }
    )
  }

  if (type === 'SEND_EVENT' && eventData) {
    const { event, relays } = eventData;
    self.postMessage({ type: 'ENQUE_EVENT', event });

    const unsub = relayPool.subscribe(
      relays,
      {
        kinds: [event.kind],
        authors: [event.pubkey],
      },
      {
        onevent: (e) => {
          unsub.close();
        }
      }
    )

    Promise.any(relayPool.publish(relays, event)).then(() => {
      self.postMessage({ type: 'EVENT_SENT', event });
      self.postMessage({ type: 'DEQUE_EVENT', event });
    }).catch(reason => {
      if (reason instanceof AggregateError) {
        console.log('Failed to publish the event: ', reason);

        const shouldRetry = reason.errors.some(e => e.message.startsWith('rate-limited:') || e.message.startsWith('error:'));

        if (shouldRetry) {
          self.postMessage({ type: 'EVENT_NOT_SENT', success: false, event, reason: reason.errors[0].message || '' });
          return;
        }

        self.postMessage({ type: 'EVENT_SENT', event });
        self.postMessage({ type: 'DEQUE_EVENT', event });
        return;
      }

      self.postMessage({ type: 'EVENT_NOT_SENT', success: false, event, reason });
    })
  }
});
