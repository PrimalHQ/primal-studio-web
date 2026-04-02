import { Component } from 'solid-js';
import { PrimalUser } from 'src/primal';

import styles from './NotePreview.module.scss';
import { userNameFromUser } from 'src/utils/profile';
import Avatar from 'src/components/Avatar/Avatar';
import { nip05Verification, truncateNumber } from 'src/utils/ui';

const UserPreview: Component<{
  id?: string,
  user: PrimalUser,
  highlighted?: boolean,
  onClick?: () => void,
}> = (props) => {

  return (
    <div
      id={props.id}
      class={`${styles.userPreview} ${props.highlighted ? styles.highlighted : ''}`}
      onClick={props.onClick}
      data-pubkey={props.user.pubkey}
    >

      <Avatar user={props.user} size={36} />
      <div class={styles.userInfo}>
        <div class={styles.userName}>
          {userNameFromUser(props.user)}
        </div>
        <div class={styles.verification}>
          {nip05Verification(props.user)}
        </div>
      </div>
      <div class={styles.userStats}>
        <div class={styles.followerNumber}>
          {truncateNumber(props.user.userStats?.followers_count || 0)}
        </div>
        <div class={styles.followerLabel}>
          folowers
        </div>
      </div>
    </div>
  );
}

export default UserPreview;


export const UserPreviewSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.userPreviewSkeleton}>
    </div>
  );
}
