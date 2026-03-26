import { Component } from 'solid-js';

import styles from './NoteEditor.module.scss';
import { Dialog as KobalteDialog } from '@kobalte/core/dialog';
import { PrimalDraft, PrimalNote } from 'src/primal';
import NoteEditor2 from '../NoteEditor2/NoteEditor2';


const NewNoteDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  note: PrimalNote | undefined,
  draft?: PrimalDraft,
}> = (props) => {

  return (
    <KobalteDialog open={props.open} onOpenChange={props.setOpen} preventScroll={false}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class={styles.dialogOverlay} />
        <div class={styles.dialog} data-new-note-dialog>
          <KobalteDialog.Content class={styles.dialogContent} >
            <KobalteDialog.Description class={styles.dialogDescription}>
              <NoteEditor2
                onDone={() => props.setOpen && props.setOpen(false)}
                note={props.note}
                draft={props.draft}
                open={props.open}
              />
            </KobalteDialog.Description>
          </KobalteDialog.Content>
        </div>
      </KobalteDialog.Portal>
    </KobalteDialog>
  );
}

export default NewNoteDialog;
