import { Component, JSXElement, Match, Switch } from 'solid-js';

import styles from './StickySidebar.module.scss';
import Wormhole from 'src/helpers/Wormhole/Wormhole';

const StickySidebar: Component<{
  id?: string,
  children: JSXElement,
  noWormhole?: boolean,
}> = (props) => {

  return (
    <Switch fallback={
      <div id={props.id} class={styles.stickyWrapper}>

          {props.children}

      </div>
    }>
      <Match when={!props.noWormhole}>
        <Wormhole
          to="right_sidebar"
        >
          <div id={props.id} class={styles.stickyWrapper}>
              {props.children}
          </div>
        </Wormhole>
      </Match>
    </Switch>
  );
}

export default StickySidebar;
