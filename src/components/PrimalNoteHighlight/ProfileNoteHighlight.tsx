import { Component } from "solid-js";
import styles from  "./ProfileNoteHighlight.module.scss";
import { PrimalHighlight } from "src/primal";

export const renderEmbeddedHighlight = (config: {
  highlight: PrimalHighlight,
}) => {
  return (
    <div>
      <ProfileNoteHighlight highlight={config.highlight} />
    </div> as HTMLDivElement
  ).innerHTML;
}

const ProfileNoteHighlight: Component<{
  id?: string,
  highlight: PrimalHighlight,
}> = (props) => {
  return (
    <div class={styles.highlight}>
      {props.highlight.event?.content || ''}
    </div>
  );
}

export default ProfileNoteHighlight;
