import { Select } from '@kobalte/core/select';
import { Component, Show } from 'solid-js';

import styles from './SelectBox.module.scss';

export type SelectOption = {
  value: string,
  label: string,
  disabled?: boolean,
}

const SelectBox: Component<{
  value: SelectOption,
  options: SelectOption[],
  prefix?: string,
  onChange: (selection: SelectOption | null) => void,
  short?: boolean,
}> = (props) => {

  return (
    <Select
      class={styles.selectBox}
      value={props.value}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      options={props.options}
      onChange={props.onChange}
      gutter={-14}

      itemComponent={props => (
        <Select.Item class={styles.selectItem} item={props.item}>
          <Select.ItemLabel>
            <Select.ItemIndicator>
              <div class={styles.checkIcon}></div>
            </Select.ItemIndicator>
            <div>{props.item.rawValue.label}</div>
          </Select.ItemLabel>
        </Select.Item>
      )}
    >
      <Select.Label />
      <Select.Trigger class={`${styles.trigger} ${props.short ? styles.shortTrigger : ''}`}>
        <Select.Value<SelectOption>>
          {s => (
            <>
            <Show when={props.prefix}>
              <div class={styles.prefix}>{props.prefix}</div>
            </Show>

            {s.selectedOption().label}
            </>
          )}
        </Select.Value>
        <Show when={!props.short}>
          <div class={styles.chevronIcon}></div>
        </Show>
      </Select.Trigger>
      <Select.Description />
      <Select.ErrorMessage />
      <Select.Portal>
        <Select.Content>
          <Select.Listbox class={styles.selectContent} />
        </Select.Content>
      </Select.Portal>
    </Select>
  );
}

export default SelectBox;
