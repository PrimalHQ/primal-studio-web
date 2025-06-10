import { Component, createEffect, createSignal, For, Show } from 'solid-js';

import styles from './Dialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Dialog from './Dialog';
import { translate } from 'src/translations/translate';
import { PrimalArticle, PrimalDraft, PrimalNote, StatsWeights, StudioNoteStats } from 'src/primal';
import { getStatWeights } from 'src/primal_api/studio';
import { createStore, unwrap } from 'solid-js/store';

export type ConfirmDialogInfo = {
  title?: string,
  description?: string,
  confirmLabel?: string,
  abortLabel?: string
  onConfirm?: () => void,
  onAbort?: () => void,
};

const rowConfig: { label: string, field: keyof StatsWeights}[] = [
  {
    label: 'Short Replies',
    field: 'replies_short',
  },
  {
    label: 'Medium Replies',
    field: 'replies_medium',
  },
  {
    label: 'Long Replies',
    field: 'replies_long',
  },
  {
    label: 'Quotes',
    field: 'quotes',
  },
  {
    label: 'Reposts',
    field: 'reposts',
  },
  {
    label: 'Zaps',
    field: 'zaps',
  },
  {
    label: 'Bookmarks',
    field: 'bookmarks',
  },
  {
    label: 'Likes/Reactions',
    field: 'reactions',
  },
];

const ContentScoreBreakdownDialog: Component<ConfirmDialogInfo & {
  id?: string,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  event: PrimalNote | PrimalArticle | PrimalDraft | undefined,
}> = (props) => {

  const [weights, setWeights] = createStore<{ weight: number, stat: number, label: string, score: number }[]>([]);
  const [totalScore, setTotalScore] = createSignal(0);

  const setOpen = (isOpen: boolean) => {
    if (!isOpen) {
      setWeights(() => []);
      setTotalScore(0);
    }

    props.setOpen && props.setOpen(isOpen);

  }

  createEffect(() => {
    if (props.open) {
      fetchScores();
    }
  });

  const fetchScores = async () => {
    const ws = await getStatWeights();
    const stats: any = props.event?.studioStats || {};

    rowConfig.forEach(config => {

      let row = {
        weight: ws[config.field] || 1,
        stat: stats[config.field] || 0,
        label: config.label,
        score: 0,
      }

      const score = row.stat * row.weight;

      row.score = score;

      setWeights((rows) => [ ...rows, row])
      setTotalScore((tot) => tot + score);
    })

    setWeights(() => ({ ...ws }));
  }

  return (
    <Dialog
      open={props.open}
      setOpen={setOpen}
      title={
        <div class={styles.confirmDialogTitle}>
          Content Score Breakdown
        </div>
      }
      triggerClass={'hidden'}
    >
      <div id={props.id} class={styles.contentScoreBreakdownDialog}>
        <table>
          <thead>
            <tr>
              <th>User Action</th>
              <th>Count</th>
              <th>Weight</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <For each={weights}>
              {weight => (
                <tr>
                  <td>{weight.label}</td>
                  <td>{weight.stat}</td>
                  <td>{weight.weight}</td>
                  <td>{weight.score}</td>
                </tr>
              )}
            </For>
            <tr>
              <td
                class={styles.total}
                colSpan={3}
              >
                Total Score:
              </td>

              <td
                class={styles.total}
              >
                {totalScore()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

export default ContentScoreBreakdownDialog;
