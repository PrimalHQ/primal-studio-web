import { Component, createEffect, createMemo, Match, on, onCleanup, Switch, } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Media.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import { blossomStore, fetchBlossomMediaList, setBlossomStore, mediaSortOptions } from './Media.data';
import { createStore } from 'solid-js/store';
import SelectBox, { SelectOption } from 'src/components/SelectBox/SelectBox';
import { accountStore } from 'src/stores/AccountStore';
import { fileSize } from 'src/utils/ui';
import MediaGrid from './MediaGrid';
import MediaList from './MediaList';
import { storeMediaPageConfig } from 'src/utils/localStore';

const Media: Component = () => {

  const blobs = createMemo(() => {
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
        image: 50,
        video: 40,
        audio: 30,
        text: 20,
        other: 1,
      };

      const aType = (a.type?.split('/') || 'other')[0]
      const bType = (b.type?.split('/') || 'other')[0]

      let aTypeValue = values[aType] || values['other'];
      let bTypeValue = values[bType] || values['other'];

      return bTypeValue - aTypeValue;
    });

    // console.log('SORTED: ', blossomStore.sort, sorted.map(s => s.type))

    return sorted;
  })

  createEffect(on(() => blossomStore.server, () => {
    if (blossomStore.isFetchingList) return;
    fetchBlossomMediaList(accountStore.pubkey, { server: blossomStore.server })
  }));


  const selectedServerOption = (): SelectOption => {
    return { value: blossomStore.server || '',  label: blossomStore.server || '' };
  }

  const selectedSortOption = (): SelectOption => {
    return { value: blossomStore.sort || '',  label: translate('media', 'sort', blossomStore.sort) || '' };
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
              setBlossomStore('server', option?.value);
              storeMediaPageConfig(accountStore.pubkey, { server: option?.value });
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
            options={mediaSortOptions.map(s => ({ label: translate('media', 'sort', s), value: s }))}
            onChange={(option) => {
              if (!option) return;
              // @ts-ignore
              setBlossomStore('sort', option.value);
              // @ts-ignore
              storeMediaPageConfig(accountStore.pubkey, { sort: option.value });
            }}
          />
          <div class={styles.listType}>
            <button
              class={`${styles.listTypeButton} ${blossomStore.listType === 'grid' ? styles.selected : ''}`}
              onClick={() => {
                setBlossomStore('listType', () => 'grid');
              storeMediaPageConfig(accountStore.pubkey, { listType: 'grid' });
              }}
            >
              <div class={styles.gridIcon}></div>
            </button>
            <button
              class={`${styles.listTypeButton} ${blossomStore.listType === 'list' ? styles.selected : ''}`}
              onClick={() => {
                setBlossomStore('listType', () => 'list');
              storeMediaPageConfig(accountStore.pubkey, { listType: 'list' });
              }}
            >
              <div class={styles.listIcon}></div>
            </button>
          </div>
        </div>

      </div>

      <Switch>
        <Match when={blossomStore.listType === 'grid'}>
          <MediaGrid
            items={blobs()}
          />
        </Match>

        <Match when={blossomStore.listType === 'list'}>
          <MediaList
            items={blobs()}
          />
        </Match>
      </Switch>
    </div>
  );
}

export default Media;
