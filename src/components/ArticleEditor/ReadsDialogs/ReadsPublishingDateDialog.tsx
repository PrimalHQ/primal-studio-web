import { Component, createEffect, createSignal } from 'solid-js';

import styles from './ReadsMentionDialog.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';

import Calendar from "@rnwonder/solid-date-picker/calendar";
import { PickerAloneValue, DateObjectUnits } from "@rnwonder/solid-date-picker";
import utils from "@rnwonder/solid-date-picker/utilities";
import { TimeValue } from "@rnwonder/solid-date-picker";
import TimePicker from "@rnwonder/solid-date-picker/timePicker";
import { longDate, shortDate } from 'src/utils/date';
import { createStore } from 'solid-js/store';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import objectSupport from 'dayjs/plugin/objectSupport';
import timezone from 'dayjs/plugin/timezone';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import { Select } from '@kobalte/core/select';
import SelectAMPMBox from 'src/components/SelectBox/SelectAMPMBox';

dayjs.extend(utc);
dayjs.extend(objectSupport)
dayjs.extend(timezone)

const ReadsPublishingDateDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  initialValue?: number,
  onSetPublishDate: (timestamp: number | undefined) => void,
}> = (props) => {

  const [selection, setSelection] = createStore<{
    date: number,
    hour: number,
    minutes: number,
  }>({
    date: 0,
    hour: 0,
    minutes: 0,
  });

  const [selectedDate, setSelectedDate] = createSignal<PickerAloneValue>({})

  const timeOfDay = () => {
    return selection.hour < 12 ? 'AM' : 'PM';
  }

  createEffect(() => {
    const value = props.initialValue || Math.floor((new Date()).getTime() / 1_000);

    const fullDate = dayjs.unix(value);

    const dateString = fullDate.toISOString().split('T')[0];


    const dateObj = dayjs(dateString);

    setSelection(() => ({
      date: dateObj.unix(),
      hour: fullDate.hour(),
      minutes: fullDate.minute(),
    }))

    setSelectedDate(() => ({
      selectedDateObject: {
        day: dateObj.date(),
        month: dateObj.month(),
        year: dateObj.year(),
      }
    }))
  });

  const convertSelectionToTimestamp = () => {
    const timestamp = selection.date +
      selection.hour * 60 * 60 +
      selection.minutes * 60;

    return timestamp;
  }

  const timeDisplay = () => {
    const timestamp = convertSelectionToTimestamp();

    return dayjs.unix(timestamp).format('YYYY-MM-DD, hh:mm A')
  }

  const normalizeHours = (hours: number) => {
    if (hours > 12 || hours < 0) {
      return Math.abs(hours) % 12
    }

    return hours;
  }

  return (
    <Dialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title={"Schedule Publishing Time"}
    >
      <div class={styles.dateDialog}>
        <div class={styles.datetimeInput}>
          <input
            class={styles.textInput}
            value={timeDisplay()}
            disabled={true}
          />
        </div>

        <div class={styles.broadLayout}>
          <Calendar
            value={selectedDate()}
            onChange={(data) => {
              if (data.type === "single") {
                if (!data.selectedDate) return;

                setSelection(() => ({
                  date: dayjs({ ...data.selectedDate }).unix(),
                  //utils().convertDateObjectToDate(data.selectedDate!).getTime(),
                }));

                setSelectedDate({
                  selectedDateObject: data.selectedDate,
                });
              }
            }}
          />
          <div class={styles.timeInputs}>
            <input
              class={`${styles.textInput} ${styles.timeInput}`}
              value={normalizeHours(selection.hour)}
              onChange={(e) => {
                const v = e.target.value;
                let num = parseInt(v);
                if (isNaN(num)) return;
                if (num > 24 || num < 0) {
                  num = Math.abs(num) % 24
                }

                setSelection('hour', () => num);
              }}
            />
            <div class={styles.colonIcon}></div>
            <input
              class={`${styles.textInput} ${styles.timeInput}`}
              value={selection.minutes}
              onChange={(e) => {
                const v = e.target.value;
                const num = parseInt(v);
                if (isNaN(num)) return;
                if (num > 59 || num < 0) {
                  setSelection('minutes', () => Math.abs(num) % 60);
                  return;
                }

                setSelection('minutes', () => num);
              }}
            />

            <SelectAMPMBox
              value={{ label: timeOfDay(), value: timeOfDay() }}
              options={[ { label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }, ]}
              onChange={(opt) => {
                const val = opt?.value;
                const cur = timeOfDay();

                if (val === cur) return;

                if (val === 'AM') {
                  setSelection('hour', (h) => h - 12);
                }

                if (val === 'PM') {
                  setSelection('hour', (h) => h + 12);
                }

              }}
            />
          </div>
        </div>


        <div class={styles.actions}>
          <ButtonSecondary
            light={true}
            onClick={() => {
              props.setOpen && props.setOpen(false)
            }}
          >
            Cancel
          </ButtonSecondary>
          <ButtonSecondary
            light={true}
            onClick={() => {
              props.onSetPublishDate(undefined)
            }}
          >
            Remove Publish Time
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => {
              props.onSetPublishDate(convertSelectionToTimestamp())
            }}
          >
            Set Publish Date
          </ButtonPrimary>

        </div>
      </div>


    </Dialog>
  );
}

export default ReadsPublishingDateDialog;
