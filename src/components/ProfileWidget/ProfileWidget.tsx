import { Component, Show } from 'solid-js';
import { A } from '@solidjs/router';

import styles from './ProfileWidget.module.scss';
import { parseUserMetadata, trimVerification, userName } from 'src/utils/profile';
import { accountStore, activeUser } from 'src/stores/AccountStore';
import { profileLink } from 'src/stores/AppStore';
import Avatar from '../Avatar/Avatar';

const ProfileWidget: Component<{ id?: string }> = (props) => {

  return (
    <div id={props.id}>
      <Show when={activeUser()}>
        <A href={profileLink(accountStore.pubkey) || ''} class={styles.userProfile}>
          <div class={styles.avatar}>
            <Avatar
              user={activeUser()}
            />
          </div>
          <div class={styles.userInfo}>
            <div class={styles.userName}>{userName(accountStore.pubkey)}</div>
            <div class={styles.userVerification}>
              {trimVerification(activeUser()?.nip05)[1]}
            </div>
          </div>
        </A>
      </Show>
    </div>
  );
}

export default ProfileWidget;
