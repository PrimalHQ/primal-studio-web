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
        day: dateObj.day() + 1,
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
            value={longDate(convertSelectionToTimestamp())}
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
              value={selection.hour}
              onChange={(e) => {
                const v = e.target.value;
                const num = parseInt(v);
                if (isNaN(num)) return;
                if (num > 24 || num < 0) {
                  setSelection('hour', () => Math.abs(num) % 24);
                  return;
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
