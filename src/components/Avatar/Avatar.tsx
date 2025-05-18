import { Component, createEffect, createSignal, onMount } from 'solid-js';
import { translate } from '../../translations/translate';

import styles from './Avatar.module.scss';
import { getEventFromStore } from 'src/stores/EventStore';
import { parseUserMetadata } from 'src/utils/profile';

import defaultAvatar from '../../assets/images/default_avatar.svg';
import { accountStore } from 'src/stores/AccountStore';

const Avatar: Component<{ pubkey: string }> = (props) => {

  const [src, setSrc] = createSignal(defaultAvatar);

  createEffect(() => {
    getSrc();
  })

  const getSrc = () => {
    const metadata = accountStore.metadata;

    const user = metadata && parseUserMetadata(metadata);

    const url = (user && user.picture) ? user.picture : defaultAvatar;

    setSrc(url);
  }

  const imgError = (event: any) => {
    const image = event.target;

    image.onerror = "";
    image.src = defaultAvatar;

    return true;
  }

  return (
    <div class={styles.vvsAvatar} data-pubkey={props.pubkey}>
      <img src={src()} alt="avatar" onerror={imgError}/>
    </div>
  );
}

export default Avatar;
