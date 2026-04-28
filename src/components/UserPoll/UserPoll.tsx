import { Component } from "solid-js";

import styles from './UserPoll.module.scss';
import { PrimalUserPoll } from "../../primal";

export type UserPollProps = {
  id: string,
  poll: PrimalUserPoll
  hideContext?: boolean,
  pollType?: 'feed' | 'primary' | 'embedded',
  onRemove?: (id: string, isRepost?: boolean) => void,
}

const UserPoll: Component<UserPollProps> = (props) => {

  return (
    <div class={styles.userPoll}>
      {props.poll.question}
    </div>
  )
}

export default UserPoll;
