import { Select } from '@kobalte/core/select';
import { Component, Show } from 'solid-js';

import styles from './SelectBox.module.scss';

export type SelectOption = {
  value: string,
  label: string,
  disabled?: boolean,
}

const SelectAMPMBox: Component<{
  value: SelectOption,
  options: SelectOption[],
  onChange: (selection: SelectOption | null) => void,
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
      <Select.Trigger class={`${styles.triggerAMPM}`}>
        <Select.Value<SelectOption>>
          {s => (
            <>
            {s.selectedOption()?.label || ''}
            </>
          )}
        </Select.Value>
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

export default SelectAMPMBox;
