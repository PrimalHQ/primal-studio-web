import { Component, createEffect, createMemo, createSignal, Match, on, onCleanup, Show, Switch, } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Media.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import { blossomStore, fetchBlossomMediaList } from './Media.data';
import { SelectOption } from 'src/components/SelectBox/SelectBox';
import { accountStore } from 'src/stores/AccountStore';
import MediaGrid from './MediaGrid';
import MediaList from './MediaList';
import { setMediaUsageUrl } from 'src/stores/AppStore';
import MediaHeader from './MediaHeader';

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

      <MediaHeader
        selectedServerOption={selectedServerOption()}
        selectedSortOption={selectedSortOption()}
        blobs={blobs()}
      />

      <Switch>
        <Match when={blossomStore.listType === 'grid'}>
          <MediaGrid
            items={blobs()}
          />
        </Match>

        <Match when={blossomStore.listType === 'list'}>
          <MediaList
            items={blobs()}
            server={blossomStore.server || ''}
            onShowUsage={setMediaUsageUrl}
          />
        </Match>
      </Switch>

    </div>
  );
}

export default Media;
