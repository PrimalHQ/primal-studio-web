import { Component, Match, Show, Switch } from "solid-js";
import { Kind } from "../../constants";
import styles from  "./ProfileNoteZap.module.scss";
import { PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from "src/primal";
import { date } from "src/utils/date";
import { hexToNpub, userName } from "src/utils/profile";
import { isPhone } from "src/utils/ui";
import Avatar from "../Avatar/Avatar";
import { profileLink } from "src/stores/AppStore";

export const renderEmbeddedZap = (config: {
  subject: PrimalArticle | PrimalNote | PrimalUser | undefined,
  zap: PrimalZap,
}) => {
  return (<div><ProfileNoteZap subject={config.subject} zap={config.zap} /></div> as HTMLDivElement).innerHTML;
}

const ProfileNoteZap: Component<{
  id?: string,
  subject: PrimalArticle | PrimalNote | PrimalUser | undefined,
  zap: PrimalZap,
}> = (props) => {

  const userNpub = (user: PrimalUser | string | undefined) => {
    if (typeof user === 'string') return hexToNpub(user);

    return user && user.npub;
  }

  const subject = () => {
    // if (!props.subject) return <div class={styles.subject}>UNKNOWN</div>

    let content = props.zap.zappedContent || '';
    let time = props.zap.created_at || 0;
    let link = '';
    let name = '';

    if (props.zap.reciver) {
      name = typeof props.zap.reciver === 'string' ?
        userName(props.zap.reciver) :
        userName(props.zap.reciver.pubkey);
    }

    // if (props.subject.event?.kind === Kind.Text) {
    //   const sub = props.subject as PrimalNote;

    //   content = sub.content;
    //   time = props.zap.created_at || 0;
    //   link = `/e/${sub.nIdShort}`;
    //   name = userName(sub.user.pubkey);
    // }

    // if (props.subject.event?.kind === Kind.LongForm) {
    //   const sub = props.subject as PrimalArticle;
    //   content = sub.title;
    //   time = props.zap.created_at || 0;
    //   link = `/a/${sub.nId}`;
    //   name = userName(sub.user.pubkey);
    // }

    // if (props.subject.event?.kind === Kind.Metadata) {
    //   const sub = props.subject as PrimalUser;
    //   content = sub.about;
    //   time = props.zap.created_at || 0;
    //   link = profileLink(sub.npub) || '';
    //   name = userName(sub.pubkey);
    // }

    return (
      <a href={link} class={styles.subject}>
        <div class={styles.header}>
          <div class={styles.userName}>
            {name}
          </div>
          <Show when={time > 0}>
            <div class={styles.bullet}>&middot;</div>
            <div class={styles.time}>
              {date(time).label}
            </div>
          </Show>
        </div>
        <div class={styles.body}>
          {content}
        </div>
      </a>
    );
  }

  return (
    <Switch>
      <Match when={isPhone()}>
        <div class={styles.contentZapPhone} data-zap-id={props.zap.id}>
          <div class={styles.zapSender}>
            <Avatar size={26} user={props.zap.sender} />
            <div class={styles.amount}>
              <div class={styles.zapIcon}></div>
              <div class={styles.number}>{props.zap.amount.toLocaleString()}</div>
            </div>
            <div class={styles.message}>
              {props.zap.message}
            </div>
          </div>

          <div class={styles.zapReceiver}>
            <div class={styles.leftSide}>
              <a href={profileLink(userNpub(props.zap.reciver)) || ''} class={styles.receiver}>
                <Avatar size={26} user={props.zap.reciver} />
              </a>
            </div>
            <div class={styles.rightSide}>
              {subject()}
            </div>
          </div>
        </div>
      </Match>

      <Match when={!isPhone()}>
        <div class={styles.contentZap} data-zap-id={props.zap.id}>
          <div class={styles.zapInfo}>
            <a href={profileLink(userNpub(props.zap.sender)) || ''} class={styles.sender}>
              <Avatar size={40} user={props.zap.sender} />
            </a>

            <div class={styles.data}>
              <div class={styles.amount}>
                <div class={styles.zapIcon}></div>
                <div class={styles.number}>{props.zap.amount.toLocaleString()}</div>
              </div>
              <div class={styles.message}>
                {props.zap.message}
              </div>
            </div>

            <a href={profileLink(userNpub(props.zap.reciver)) || ''} class={styles.receiver}>
              <Avatar size={40} user={props.zap.reciver} />
            </a>
          </div>

          {subject()}
        </div>
      </Match>
    </Switch>
  )
}

export default ProfileNoteZap;
