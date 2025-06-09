import { Component, createEffect, on, onCleanup, } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Media.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import { blossomStore, fetchBlossomMediaList, setBlossomStore, sortOptions } from './Media.data';
import { createStore } from 'solid-js/store';
import SelectBox, { SelectOption } from 'src/components/SelectBox/SelectBox';
import { accountStore } from 'src/stores/AccountStore';
import { fileSize } from 'src/utils/ui';
import MediaGrid from './MediaGrid';

const Media: Component = () => {

  const [visibleItems, setVisibleItems] = createStore<string[]>([]);

  let containerRef: HTMLDivElement | undefined;

  // Create intersection observer
  const observer = new IntersectionObserver(
    (entries) => {
      let visible = [ ...visibleItems ];

      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-id');
        if (!id) return;

        if (entry.isIntersecting) {
          visible.push(id);
        } else {
          visible = visible.filter(i => i !== id);
        }
      });

      setVisibleItems(() => [...visible]);
    },
  );

  const blobs = () => {
    const unsorted = blossomStore.media[blossomStore.server || ''] || [];

    const sorted = unsorted.toSorted((a, b) => {
      const sort = blossomStore.sort;

      if (sort === 'latest') {
        return b.uploaded - a.uploaded;
      }

      if (sort === 'oldest') {
        return a.uploaded - b.uploaded;
      }

      if (sort === 'size') {
        return b.size - a.size;
      }

      // sort by type
      const values: Record<string, number> = {
        image: 3,
        video: 2,
        other: 1,
      };

      const aType = (b.type?.split('/') || 'other')[0]
      const bType = (b.type?.split('/') || 'other')[0]

      let aTypeValue = values[aType];
      let bTypeValue = values[bType];

      return bTypeValue - aTypeValue;
    });

    return sorted;
  }


  onCleanup(() => {
    observer?.disconnect();
  });

  createEffect(() => {
    if (!containerRef) return;

    const bls = blobs();

    setTimeout(() => {
      for(let i=0; i< bls.length; i++) {
        const id = bls[i].sha256;
        const el = containerRef.querySelector(`[data-id="${id}"]`);
        el && observer.observe(el);
      }

    }, 100)
  });

  createEffect(on(() => blossomStore.server, () => {
    if (blossomStore.isFetchingList) return;
    fetchBlossomMediaList(accountStore.pubkey, { server: blossomStore.server })
  }));


  const selectedServerOption = (): SelectOption => {
    return { value: blossomStore.server || '',  label: blossomStore.server || '' };
  }

  const selectedSortOption = (): SelectOption => {
    return { value: blossomStore.sort || '',  label: blossomStore.sort || '' };
  }

  return (
    <div class={styles.mediaLayout}>
      <Wormhole to="header">
        <HeaderTitle title={translate('media', 'header')} />
      </Wormhole>

      <div class={styles.mediaHeader}>
        <div class={styles.serverSelection}>
          <SelectBox
            prefix="Server:"
            value={selectedServerOption()}
            options={accountStore.blossomServers.map(s => ({ label: s, value: s }))}
            onChange={(option) => {
              setBlossomStore('server', (option?.value));
            }}
          />
          <div class={styles.serverInfo}>
            <div class={styles.serverStat}>
              <div class={styles.number}>{blobs().length}</div>
              <div class={styles.label}>files</div>
            </div>
            <div class={styles.serverStat}>
              <div class={styles.number}>{fileSize(blobs().reduce<number>((acc,b) => b.size + acc, 0))}</div>
              <div class={styles.label}>used</div>
            </div>
          </div>
        </div>

        <div class={styles.listOptions}>
          <SelectBox
            prefix="Sort by:"
            value={selectedSortOption()}
            options={sortOptions.map(s => ({ label: s, value: s }))}
            onChange={(option) => {
              if (!option) return;
              // @ts-ignore
              setBlossomStore('sort', option.value);
            }}
          />
          <div class={styles.listType}>
            <button
              class={`${styles.listTypeButton} ${blossomStore.listType === 'grid' ? styles.selected : ''}`}
              onClick={() => setBlossomStore('listType', () => 'grid')}
            >
              <div class={styles.gridIcon}></div>
            </button>
            <button
              class={`${styles.listTypeButton} ${blossomStore.listType === 'list' ? styles.selected : ''}`}
              onClick={() => setBlossomStore('listType', () => 'list')}
            >
              <div class={styles.listIcon}></div>
            </button>
          </div>
        </div>

      </div>

      <MediaGrid
        ref={containerRef}
        items={blobs()}
        visibleItems={visibleItems}
      />
    </div>
  );
}

export default Media;
