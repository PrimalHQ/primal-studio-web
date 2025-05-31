import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import styles from './Settings.module.scss';
import { translate } from 'src/translations/translate';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import { loadInboxPermissionSettings, PRIMAL_STUDIO, settingsStore, updateSettingsStore } from 'src/stores/SettingsStore';
import { getUserMetadata, getUsers } from 'src/primal_api/profile';
import { createStore } from 'solid-js/store';
import { PrimalUser } from 'src/primal';
import Avatar from 'src/components/Avatar/Avatar';
import { userName } from 'src/utils/profile';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import { logError } from 'src/utils/logger';
import { addToSettingsList, removeFromSettingsList } from 'src/primal_api/studio';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import SearchOption from 'src/components/Search/SearchOptions';
import { findUserByNpub2, findUsers2, searchStore } from 'src/stores/SearchStore';
import { debounce, nip05Verification } from 'src/utils/ui';
import DOMPurify from "dompurify";

import { Search } from '@kobalte/core/search';
import SearchUser from 'src/components/Search/SearchUser';

const Permissions: Component = () => {

  const [inboxUsers, setInboxUsers] = createStore<PrimalUser[]>([])
  const [invalidPubkey, setInvalidPubkey] = createSignal(false);

  const getInboxUsers = async () => {
    const pubkeys = settingsStore.inboxUsers;

    const users = await getUsers(pubkeys);

    setInboxUsers(() => [...users]);
  }

  createEffect(() => {
    getInboxUsers();
  })


  const onAddUser = async (pubkey: string, user?: PrimalUser) => {
    try {

      if (settingsStore.inboxUsers.includes(pubkey)) return;

      await addToSettingsList('inbox_permissions', pubkey);

      updateSettingsStore('inboxUsers', settingsStore.inboxUsers.length, () => pubkey);

      setInvalidPubkey(false);
    } catch (e) {
      logError('invalid pubkey input ', e);
      setInvalidPubkey(true);
    }
  }

  const onRemoveUser = async (pubkey: string) => {

    try {
      await removeFromSettingsList('inbox_permissions', pubkey);

      updateSettingsStore('inboxUsers', (pks) => pks.filter(pk => pk !== pubkey));

    } catch (e) {
      logError('invalid pubkey input ', e);
    }

  }

  return (
    <div class={styles.permissionsPage}>

      <div class={styles.settingsSectionFull}>
        <div class={styles.settingsCaptionLight}>
          {translate('settings', 'permissions', 'subCaption')}
        </div>

        <div class={styles.settingsRowPadded}>

          <SearchUser
            placeholder={translate('settings', 'permissions', 'addUserPlaceholder')}
            onSelect={onAddUser}
          />
        </div>

        <div style="height: 20px"></div>

        <div class={styles.inboxUsers}>
          <For each={inboxUsers}>
            {user => (
              <div class={styles.inboxUserCard}>
                <Avatar user={user} size={36} />
                <div class={styles.right}>
                  <div class={styles.userInfo}>
                    <div class={styles.userName}>{userName(user.pubkey)}</div>
                    <div class={styles.nip05}>{user.nip05}</div>
                  </div>
                  <Show when={user.pubkey !== PRIMAL_STUDIO}>
                    <button class={styles.remove} onClick={() => onRemoveUser(user.pubkey)}>
                      remove
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

export default Permissions;

