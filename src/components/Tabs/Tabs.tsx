import { Tabs } from '@kobalte/core/tabs';
import { Component, For, JSXElement, Show } from 'solid-js';

import styles from './Tabs.module.scss';


const StudioTabs: Component<{
  id?: string,
  tabs: string[],
  activeTab: string,
  defaultTab: string,
  onChange?: (tab: string) => void,
  tabTriggerComponent?: (tab: string) => JSXElement,
  children?: JSXElement,
}> = (props) => {

  return (
    <Tabs
      value={props.activeTab}
      onChange={props.onChange}
      defaultValue={props.defaultTab}
    >
      <Tabs.List class={styles.tabs}>
        <For each={props.tabs}>
          {tab => (
            <Tabs.Trigger
              class={styles.tab}
              value={tab}
            >
              {props.tabTriggerComponent ?
                props.tabTriggerComponent(tab) :
                <div>{tab}</div>}
            </Tabs.Trigger>
          )}
        </For>

        <Tabs.Indicator class={styles.indicator} />
      </Tabs.List>

      {props.children}
    </Tabs>
  );
}

export const Content: Component<{ tab: string, children?: JSXElement}> = (props) => {
  return <Tabs.Content class={styles.tabContent} value={props.tab} >
    {props.children}
  </Tabs.Content>
}

export default StudioTabs;
