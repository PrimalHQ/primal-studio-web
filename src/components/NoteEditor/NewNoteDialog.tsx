import { Component, JSXElement } from 'solid-js';

import styles from './NoteEditor.module.scss';
import { Dialog as KobalteDialog } from '@kobalte/core/dialog';
import NoteEditor from './NoteEditor';
import { PrimalDraft, PrimalNote } from 'src/primal';



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
        <div class={styles.dialog}>
          <KobalteDialog.Content class={styles.dialogContent} >
            <KobalteDialog.Description class={styles.dialogDescription}>
              <NoteEditor
                onDone={() => props.setOpen && props.setOpen(false)}
                note={props.note}
                draft={props.draft}
              />
            </KobalteDialog.Description>
          </KobalteDialog.Content>
        </div>
      </KobalteDialog.Portal>
    </KobalteDialog>
  );
}

export default NewNoteDialog;
