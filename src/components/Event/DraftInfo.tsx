import { Component } from 'solid-js';
import { PrimalDraft } from '../../primal';

import styles from './Event.module.scss';
import { longDate } from 'src/utils/date';
import { openConfirmDialog } from 'src/stores/AppStore';
import { doRequestDelete } from 'src/primal_api/events';
import { accountStore } from 'src/stores/AccountStore';


const DraftInfo: Component<{
  draft: PrimalDraft,
  onEdit?: () => void,
  onDelete?: (id: string) => void,
}> = (props) => {

  return (
    <div class={styles.draftInfo}>
      <div class={styles.draftInfoSection}>
        <div
          onClick={props.onEdit}
          class={styles.draftInfoLink}
        >
          Continue Editing
        </div>
      </div>
      <div class={styles.draftInfoSection}>
        <div class={styles.draftSectionLabel}>Last saved on:</div>
        <div class={styles.draftDate}>
          {longDate(props.draft.created_at)}
          <div
            onClick={() => {
              openConfirmDialog({
                title: "Delete?",
                description: "This will issue a “request delete” command to the relays where the note was published. Do you want to continue?",
                onConfirm: async () => {
                 const n = props.draft;
                  if (!n) return;

                  const isDeleted = await doRequestDelete(accountStore.pubkey, n.id, n.kind);

                  if (!isDeleted) return;

                  props.onDelete && props.onDelete(n.id);
                },
                onAbort: () => {},
              })
            }}
            class={styles.draftInfoLink}
          >
            Delete
          </div>
        </div>
      </div>
    </div>
  );
}

export default DraftInfo;
