import { Component, createEffect, createMemo, Match, on, Switch } from 'solid-js';
import styles from './ReadsMentionDialog.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';
import MediaHeader from 'src/pages/Media/MediaHeader';
import { blossomStore, fetchBlossomMediaList } from 'src/pages/Media/Media.data';
import { accountStore } from 'src/stores/AccountStore';
import { SelectOption } from 'src/components/SelectBox/SelectBox';
import { setMediaUsageUrl } from 'src/stores/AppStore';
import MediaGrid from 'src/pages/Media/MediaGrid';
import MediaList from 'src/pages/Media/MediaList';
import { translate } from 'src/translations/translate';
import { BlobDescriptor } from 'blossom-client-sdk';


const ReadsChooseMediaDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  onSelect: (blob: BlobDescriptor) => void,
}> = (props) => {

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
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title="Insert Media"
    >
      <div class={styles.readsChooseMediaDialog}>

      <MediaHeader
        selectedServerOption={selectedServerOption()}
        selectedSortOption={selectedSortOption()}
        blobs={blobs()}
      />

      <Switch>
        <Match when={blossomStore.listType === 'grid'}>
          <MediaGrid
            items={blobs()}
            onSelect={props.onSelect}
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
    </Dialog>
  );
}

export default ReadsChooseMediaDialog;

