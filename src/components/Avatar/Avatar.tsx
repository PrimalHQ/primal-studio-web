import { Component, createEffect, createSignal, onMount } from 'solid-js';
import { translate } from '../../translations/translate';

import styles from './Avatar.module.scss';
import { eventStore, getEventFromStore } from 'src/stores/EventStore';
import { parseUserMetadata } from 'src/utils/profile';

import defaultAvatar from '../../assets/images/default_avatar.svg';
import { accountStore } from 'src/stores/AccountStore';
import { LegendCustomizationConfig, PrimalUser } from 'src/primal';

const Avatar: Component<{
  user?: PrimalUser,
  size?: number
}> = (props) => {

  const [src, setSrc] = createSignal(defaultAvatar);

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

  createEffect(() => {
    getSrc();
  });

  const highlightClass = () => {
    let klass = '';

    if (props.user){
      const legendConfig = props.user.legendConfig;

      if (legendConfig && legendConfig.avatar_glow) {
        const style = legendConfig.style

        const showHighlight = style !== '' &&
          legendConfig.avatar_glow;

        const showGlow = style !== '' &&
          legendConfig.avatar_glow;


        if (showHighlight) {
          klass += `${styles.legend} ${styles[`legend_${style}`]}`;
        }

        if (showGlow) {
          klass += ` ${styles.legendGlow} ${styles[`legend_glow_${style}`]}`;
        }

      }
    }

    return klass;
  };

  const imageSize = () => {
    const s = size();

    if (s < 36) {
      return s - 2;
    }

    return s - 2;
  };

  const imageOffset = () => {
    const s = size();

    if (s < 36) {
      return 1;
    }

    return 2;
  };

  return (
    <div class={highlightClass()}>
      <div
        class={`${styles.avatarResponsive}`}
        data-pubkey={props.user?.pubkey || ''}
        style={{ width: `${size()}px`, height: `${size()}px`, padding: `${imageOffset()}px` }}
      >
        <img
          src={src()}
          alt="avatar"
          onerror={imgError}
          width={imageSize()}
          height={imageSize()}
        />
      </div>
    </div>
  );
}

export default Avatar;
