
import { Component, Show } from 'solid-js';

import styles from './PageHeader.module.scss';
import { GraphSpan } from 'src/pages/Home/Home.data';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import DatePicker from '@rnwonder/solid-date-picker';
import utils from "@rnwonder/solid-date-picker/utilities";
import dayjs from 'dayjs';
import { availableSpans } from 'src/constants';


const PageHeader: Component<{
  id?: string,
  title: string,
  selection: string,
  hideSpans?: boolean,
  onSpanSelect?: (span: GraphSpan) => void,
}> = (props) => {

  return (
    <HeaderTitle title={props.title}>
      <Show
        when={!props.hideSpans}
        fallback={<div class={styles.mockGraphSpans}></div>}
      >
        <div class={styles.graphSpans}>
          <button
            class={`${props.selection === '7d' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[0]
            )}
          >
            7D
          </button>
          <button
            class={`${props.selection === '2w' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[1]
            )}
          >
            2W
          </button>
          <button
            class={`${props.selection === '1m' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[2]
            )}
          >
            1M
          </button>
          <button
            class={`${props.selection === '3m' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[3]
            )}
          >
            3M
          </button>
          <button
            class={`${props.selection === 'ytd' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[4]
            )}
          >
            YTD
          </button>
          <button
            class={`${props.selection === '1y' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[5]
            )}
          >
            1Y
          </button>
          <button
            class={`${props.selection === 'all' ? styles.active : ''}`}
            onClick={() => props.onSpanSelect && props.onSpanSelect(
              availableSpans[6]
            )}
          >
            All
          </button>

          <div class={styles.datePicker}>
            <DatePicker
              type="range"
              onChange={(data) => {
                if (data.type !== 'range') return;

                if (data.startDate && data.endDate) {
                  // @ts-ignore
                  const sd = dayjs({ year: data.startDate.year || 0, month: data.startDate.month || 0, day: data.startDate.day });
                  // @ts-ignore
                  const ed = dayjs({ year: data.endDate.year || 0, month: data.endDate.month || 0, day: data.endDate.day });

                  const diffDays = ed.diff(sd, 'days');

                  let resolution: 'day' | 'month' | 'hour' = 'day';

                  if (diffDays < 4) {
                    resolution = 'hour';
                  }

                  if (diffDays > 90) {
                    resolution = 'month';
                  }

                  props.onSpanSelect && props.onSpanSelect({
                    name: 'custom',
                    since: () => sd.unix(),
                    until: () => ed.unix(),
                    resolution,
                  })
                }
              }}
              maxDate={utils().getToday()}
              renderInput={({ showDate }) => (
                <button
                class={`${styles.compact} ${props.selection === 'custom' ? styles.active : ''}`}
                  onClick={showDate}
                >
                  <div class={styles.calendarIcon}></div>
                </button>
              )}
              shouldCloseOnSelect
            />
          </div>
        </div>
      </Show>
    </HeaderTitle>
  )

}

export default PageHeader;
