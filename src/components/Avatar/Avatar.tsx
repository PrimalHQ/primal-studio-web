import { Component, createEffect, createSignal, onMount } from 'solid-js';
import { translate } from '../../translations/translate';

import styles from './Avatar.module.scss';
import { eventStore, getEventFromStore } from 'src/stores/EventStore';
import { parseUserMetadata } from 'src/utils/profile';

import defaultAvatar from '../../assets/images/default_avatar.svg';
import { accountStore } from 'src/stores/AccountStore';
import { PrimalUser } from 'src/primal';

const Avatar: Component<{
  user?: PrimalUser,
  size?: number
}> = (props) => {

  const [src, setSrc] = createSignal(defaultAvatar);

  createEffect(() => {
    getSrc();
  })

  const size = () => props.size || 36;


  const getSrc = async () => {
    if (props.user) {
      const user = props.user;
      const url = (user && user.picture) ? user.picture : defaultAvatar;

      setSrc(url);
      return;
    }
  }

  const imgError = (event: any) => {
    const image = event.target;

    image.onerror = "";
    image.src = defaultAvatar;

    return true;
  }

  return (
    <div
      class={styles.avatarResponsive}
      data-pubkey={props.user?.pubkey || ''}
      style={{ width: `${size()}px`, height: `${size()}px` }}
    >
      <img src={src()} alt="avatar" onerror={imgError}/>
    </div>
  );
}

export default Avatar;
