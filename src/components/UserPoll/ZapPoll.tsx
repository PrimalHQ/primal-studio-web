import { Component } from "solid-js";

import styles from './UserPoll.module.scss';
import { UserPollProps } from "./UserPoll";


const ZapPoll: Component<UserPollProps> = (props) => {

  return (
    <div class={styles.userPoll}>
      Zap Poll: {props.poll.question}
    </div>
  )
}

export default ZapPoll;
